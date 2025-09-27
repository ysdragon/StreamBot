import { Client } from "discord.js-selfbot-v13";
import config from "./config.js";
import fs from 'fs';
import path from 'path';
import logger from './utils/logger.js';
import { downloadExecutable, checkForUpdatesAndUpdate } from './utils/yt-dlp.js';

// Import event handlers
import { handleReady } from './events/client/ready.js';
import { handleMessageCreate } from './events/messageCreate.js';
import { handleVoiceStateUpdate } from './events/voiceStateUpdate.js';

// Import services
import { StreamingService } from './services/streaming.js';
import { MediaService } from './services/media.js';
import { CommandManager } from './commands/manager.js';
import { QueueService } from './services/queue.js';

// Download yt-dlp and check for updates
(async () => {
	try {
		await downloadExecutable();
		await checkForUpdatesAndUpdate();
	} catch (error) {
		logger.error("Error during initial yt-dlp setup/update:", error);
	}
})();

// Create a new instance of Client
const client = new Client();

// Stream status object
const queueService = new QueueService();
const streamStatus = {
	joined: false,
	joinsucc: false,
	playing: false,
	manualStop: false,
	channelInfo: {
		guildId: config.guildId,
		channelId: config.videoChannelId,
		cmdChannelId: config.cmdChannelId
	},
	queue: queueService.getQueueStatus()
}

// Create services
const streamingService = new StreamingService(client, streamStatus);
const mediaService = new MediaService();
const commandManager = new CommandManager();

// Create the videosFolder dir if it doesn't exist
if (!fs.existsSync(config.videosDir)) {
	fs.mkdirSync(config.videosDir);
}

// Create previewCache parent dir if it doesn't exist
if (!fs.existsSync(path.dirname(config.previewCacheDir))) {
	fs.mkdirSync(path.dirname(config.previewCacheDir), { recursive: true });
}

// Create the previewCache dir if it doesn't exist
if (!fs.existsSync(config.previewCacheDir)) {
	fs.mkdirSync(config.previewCacheDir);
}

// Get all video files
const videoFiles = fs.readdirSync(config.videosDir);

// Create an array of video objects
let videos = videoFiles.map(file => {
	const fileName = path.parse(file).name;
	return { name: fileName, path: path.join(config.videosDir, file) };
});

// Print available videos
if (videos.length > 0) {
	logger.info(`Available videos:\n${videos.map(m => m.name).join('\n')}`);
}

// Event handlers
client.on("ready", async () => {
	await handleReady(client);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
	await handleVoiceStateUpdate(oldState, newState, streamStatus, client);
});

client.on('messageCreate', async (message) => {
	await handleMessageCreate(message, videos, streamStatus, streamingService, commandManager);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
	if (!(error instanceof Error && error.message.includes('SIGTERM'))) {
		logger.error('Uncaught Exception:', error);
		return
	}
});

// Run server if enabled in config
if (config.server_enabled) {
	// Run server.ts
	import('./server/index.js');
}

// Login to Discord
client.login(config.token);