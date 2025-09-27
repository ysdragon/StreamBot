import { VoiceState } from "discord.js-selfbot-v13";
import { Client } from "discord.js-selfbot-v13";
import { DiscordUtils } from "../utils/shared.js";
import { StreamStatus } from "../types/index.js";

export async function handleVoiceStateUpdate(
	oldState: VoiceState,
	newState: VoiceState,
	streamStatus: StreamStatus,
	client: Client
): Promise<void> {
	// When exit channel
	if (oldState.member?.user.id == client.user?.id) {
		if (oldState.channelId && !newState.channelId) {
			streamStatus.joined = false;
			streamStatus.joinsucc = false;
			streamStatus.playing = false;
			streamStatus.channelInfo = {
				guildId: "",
				channelId: "",
				cmdChannelId: ""
			}
			client.user?.setActivity(DiscordUtils.status_idle());
		}
	}

	// When join channel success
	if (newState.member?.user.id == client.user?.id) {
		if (newState.channelId && !oldState.channelId) {
			streamStatus.joined = true;
			if (newState.guild.id == streamStatus.channelInfo.guildId && newState.channelId == streamStatus.channelInfo.channelId) {
				streamStatus.joinsucc = true;
			}
		}
	}
}