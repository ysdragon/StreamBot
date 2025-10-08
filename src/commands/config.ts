import { BaseCommand } from "./base.js";
import { CommandContext } from "../types/index.js";
import config, { parseBoolean, parseVideoCodec, parsePreset } from "../config.js";
import logger from "../utils/logger.js";

export default class ConfigCommand extends BaseCommand {
	name = "config";
	description = "View or adjust bot configuration parameters (Admin only)";
	usage = "config [parameter] [value]";
	aliases = ["cfg", "set"];

	async execute(context: CommandContext): Promise<void> {
		// Check if user is an admin
		if (!this.isAdmin(context.message.author.id)) {
			await this.sendError(context.message, "You don't have permission to use this command. Admin access required.");
			logger.warn(`Unauthorized config command attempt by user ${context.message.author.id}`);
			return;
		}

		const args = context.args;

		// If no arguments, show current config
		if (args.length === 0) {
			await this.showConfig(context);
			return;
		}

		// If one argument, show specific parameter
		if (args.length === 1) {
			await this.showParameter(context, args[0]);
			return;
		}

		// If two or more arguments, set parameter
		const parameter = args[0].toLowerCase();
		const value = args.slice(1).join(' ');
		await this.setParameter(context, parameter, value);
	}

	private async showConfig(context: CommandContext): Promise<void> {
		const configInfo = [
			"**Stream Options:**",
			`• respect_video_params: ${config.respect_video_params}`,
			`• width: ${config.width}`,
			`• height: ${config.height}`,
			`• fps: ${config.fps}`,
			`• bitrateKbps: ${config.bitrateKbps}`,
			`• maxBitrateKbps: ${config.maxBitrateKbps}`,
			`• hardwareAcceleratedDecoding: ${config.hardwareAcceleratedDecoding}`,
			`• h26xPreset: ${config.h26xPreset}`,
			`• videoCodec: ${config.videoCodec}`,
			"",
			"**General Options:**",
			`• videosDir: ${config.videosDir}`,
			`• previewCacheDir: ${config.previewCacheDir}`,
			"",
			"Use `config <parameter>` to view a specific parameter",
			"Use `config <parameter> <value>` to change a parameter"
		].join('\n');

		await this.sendInfo(context.message, 'Bot Configuration', configInfo);
	}

	private async showParameter(context: CommandContext, parameter: string): Promise<void> {
		// Find the actual config key case-insensitively
		const key = Object.keys(config).find(k => k.toLowerCase() === parameter.toLowerCase());

		if (!key) {
			await this.sendError(context.message, `Unknown parameter: ${parameter}`);
			return;
		}

		const value = (config as any)[key];
		await this.sendInfo(context.message, `Config: ${key}`, `Current value: \`${value}\``);
	}

	private async setParameter(context: CommandContext, parameter: string, value: string): Promise<void> {
		// Find the actual config key case-insensitively
		const key = Object.keys(config).find(k => k.toLowerCase() === parameter.toLowerCase());

		if (!key) {
			await this.sendError(context.message, `Unknown parameter: ${parameter}`);
			return;
		}

		try {
			switch (key) {
				// Boolean parameters
				case 'respect_video_params':
				case 'hardwareAcceleratedDecoding':
					const boolValue = parseBoolean(value);
					(config as any)[key] = boolValue;
					await this.sendSuccess(context.message, `Set ${key} to \`${boolValue}\``);
					logger.info(`Config updated: ${key} = ${boolValue}`);
					break;

				// Number parameters
				case 'width':
				case 'height':
				case 'fps':
				case 'bitrateKbps':
				case 'maxBitrateKbps':
					const numValue = parseInt(value);
					if (isNaN(numValue) || numValue <= 0) {
						await this.sendError(context.message, `Invalid number value: ${value}`);
						return;
					}
					(config as any)[key] = numValue;
					await this.sendSuccess(context.message, `Set ${key} to \`${numValue}\``);
					logger.info(`Config updated: ${key} = ${numValue}`);
					break;

				// Video codec
				case 'videoCodec':
					const codec = parseVideoCodec(value);
					if (!codec) {
						await this.sendError(context.message, `Invalid video codec. Valid options: VP8, H264, H265`);
						return;
					}
					config.videoCodec = codec;
					await this.sendSuccess(context.message, `Set videoCodec to \`${codec}\``);
					logger.info(`Config updated: videoCodec = ${codec}`);
					break;

				// H26x preset
				case 'h26xPreset':
					const preset = parsePreset(value);
					if (!preset) {
						await this.sendError(context.message, `Invalid preset. Valid options: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow`);
						return;
					}
					config.h26xPreset = preset;
					await this.sendSuccess(context.message, `Set h26xPreset to \`${preset}\``);
					logger.info(`Config updated: h26xPreset = ${preset}`);
					break;

				// String parameters
				case 'videosDir':
				case 'previewCacheDir':
					(config as any)[key] = value;
					await this.sendSuccess(context.message, `Set ${key} to \`${value}\``);
					logger.info(`Config updated: ${key} = ${value}`);
					break;

				default:
					await this.sendError(context.message, `Cannot modify parameter: ${key}`);
					return;
			}
		} catch (error) {
			logger.error(`Error setting config parameter ${parameter}:`, error);
			await this.sendError(context.message, `Failed to set ${parameter}: ${error}`);
		}
	}

	private isAdmin(userId: string): boolean {
		// If no admins configured, allow all users (backwards compatibility)
		if (!config.adminIds || config.adminIds.length === 0) {
			return true;
		}
		return config.adminIds.includes(userId);
	}
}
