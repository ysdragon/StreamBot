import { Command, CommandContext } from "../types/index.js";
import { DiscordUtils } from "../utils/shared.js";

export abstract class BaseCommand implements Command {
	abstract name: string;
	abstract description: string;
	abstract usage: string;
	aliases?: string[];

	constructor(commandManager?: any) {
	}

	abstract execute(context: CommandContext): Promise<void>;

	protected async sendError(message: any, error: string): Promise<void> {
		await DiscordUtils.sendError(message, error);
	}

	protected async sendSuccess(message: any, description: string): Promise<void> {
		await DiscordUtils.sendSuccess(message, description);
	}

	protected async sendInfo(message: any, title: string, description: string): Promise<void> {
		await DiscordUtils.sendInfo(message, title, description);
	}

	protected async sendList(message: any, items: string[], type?: string): Promise<void> {
		await DiscordUtils.sendList(message, items, type);
	}

	protected async sendPlaying(message: any, title: string): Promise<void> {
		await DiscordUtils.sendPlaying(message, title);
	}

	protected async sendFinishMessage(message: any): Promise<void> {
		await DiscordUtils.sendFinishMessage(message);
	}
}