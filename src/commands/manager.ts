import { Command, CommandContext } from "../types/index.js";
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import config from '../config.js';
import { ErrorUtils } from '../utils/shared.js';

export class CommandManager {
	private commands: Map<string, Command> = new Map();
	private aliases: Map<string, string> = new Map();

	constructor() {
		this.loadCommands();
	}

	private async loadCommands(): Promise<void> {
		// Prefer src for Bun (TypeScript native), dist for Node.js (compiled JS)
		const isBun = typeof Bun !== 'undefined';
		const commandsPath = path.join(process.cwd(), isBun ? 'src' : 'dist', 'commands');

		if (!commandsPath) {
			logger.error('Could not find commands directory in either dist/ or src/');
			return;
		}
		
		try {
			const commandFiles = fs.readdirSync(commandsPath)
				.filter(file => (file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts') && !file.startsWith('base.') && !file.startsWith('manager.'));

			for (const file of commandFiles) {
				try {
					// Use appropriate extension based on directory
					const isDist = commandsPath.includes('dist');
					const fileName = isDist ? file.replace('.ts', '.js') : file;
					const filePath = path.join(commandsPath, fileName);
					const commandModule = await import(filePath);

					// Look for default export or named export
					let CommandClass = commandModule.default || commandModule[Object.keys(commandModule)[0]];

					if (CommandClass && this.isCommand(CommandClass)) {
						const command = new CommandClass(this) as Command;

						// Register command
						this.commands.set(command.name.toLowerCase(), command);

						// Register aliases
						if (command.aliases) {
							for (const alias of command.aliases) {
								this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
							}
						}
					} else {
						logger.warn(`File ${file} does not export a valid command`);
						logger.debug(`Exported keys: ${Object.keys(commandModule).join(', ')}`);
						if (CommandClass) {
							logger.debug(`CommandClass properties: ${Object.keys(CommandClass.prototype || {}).join(', ')}`);
						}
					}
				} catch (error) {
					await ErrorUtils.handleError(error, `loading command from ${file}`);
				}
			}

			logger.info(`Loaded ${this.commands.size} commands`);
		} catch (error) {
			await ErrorUtils.handleError(error, 'loading commands');
		}
	}

	private isCommand(obj: any): obj is new (commandManager?: CommandManager) => Command {
		if (!obj) return false;

		const proto = obj.prototype;
		if (!proto) return false;

		const hasExecute = 'execute' in proto;
		return hasExecute;
	}

	public getCommand(name: string): Command | null {
		const commandName = name.toLowerCase();
		return this.commands.get(commandName) || this.commands.get(this.aliases.get(commandName) || '') || null;
	}

	public getAllCommands(): Command[] {
		return Array.from(this.commands.values());
	}

	public async executeCommand(commandName: string, context: CommandContext): Promise<boolean> {
		const command = this.getCommand(commandName);

		if (!command) {
			return false;
		}

		try {
			await command.execute(context);
			return true;
		} catch (error) {
			await ErrorUtils.handleError(error, `executing command ${commandName}`, context.message);
			return false;
		}
	}

	public getCommandList(): string {
		const commands = this.getAllCommands();
		const prefix = config.prefix || '!';
		return commands.map(cmd =>
			`**${cmd.name}**: ${cmd.description}\nUsage: \`${prefix}${cmd.usage}\``
		).join('\n');
	}
}