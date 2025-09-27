import { BaseCommand } from "./base.js";
import { CommandContext } from "../types/index.js";

export default class StatusCommand extends BaseCommand {
	name = "status";
	description = "Show current streaming status";
	usage = "status";

	async execute(context: CommandContext): Promise<void> {
		await this.sendInfo(context.message, 'Status',
			`Joined: ${context.streamStatus.joined}\nPlaying: ${context.streamStatus.playing}`);
	}
}