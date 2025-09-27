import { Client, ActivityOptions } from "discord.js-selfbot-v13";
import logger from "../../utils/logger.js";
import { DiscordUtils } from "../../utils/shared.js";

export async function handleReady(client: Client): Promise<void> {
	if (client.user) {
		logger.info(`${client.user.tag} is ready`);
		client.user.setActivity(DiscordUtils.status_idle() as ActivityOptions);
	}
}