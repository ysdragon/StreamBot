import { BaseCommand } from "./base.js";
import { CommandContext } from "../types/index.js";
import { CommandManager } from "./manager.js";

export default class HelpCommand extends BaseCommand {
	name = "help";
	description = "Show available commands";
	usage = "help";

	constructor(private commandManager: CommandManager) {
		super(commandManager);
	}

	async execute(context: CommandContext): Promise<void> {
		const commandList = this.commandManager.getCommandList();

		const helpText = [
			'📽 **Available Commands**',
			'',
			commandList,
		].join('\n');

		await context.message.react('📋');
		await context.message.reply(helpText);
	}
}