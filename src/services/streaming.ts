import { Client, Message } from "discord.js-selfbot-v13";
import { Streamer, Utils, prepareStream, playStream } from "@dank074/discord-video-stream";
import fs from 'fs';
import config from "../config.js";
import { MediaService } from './media.js';
import { QueueService } from './queue.js';
import { getVideoParams } from "../utils/ffmpeg.js";
import logger from '../utils/logger.js';
import { DiscordUtils, ErrorUtils } from '../utils/shared.js';
import { QueueItem, StreamStatus } from '../types/index.js';

export class StreamingService {
 	private streamer: Streamer;
 	private mediaService: MediaService;
 	private queueService: QueueService;
 	private controller: AbortController | null = null;
 	private streamStatus: StreamStatus;
 	private failedVideos: Set<string> = new Set();
 	private isSkipping: boolean = false;

 	constructor(client: Client, streamStatus: StreamStatus) {
 		this.streamer = new Streamer(client);
 		this.mediaService = new MediaService();
 		this.queueService = new QueueService();
 		this.streamStatus = streamStatus;
 	}

	public getStreamer(): Streamer {
		return this.streamer;
	}

	public getQueueService(): QueueService {
		return this.queueService;
	}

	private markVideoAsFailed(videoSource: string): void {
		this.failedVideos.add(videoSource);
		logger.info(`Marked video as failed: ${videoSource}`);
	}

	public async addToQueue(
		message: Message,
		videoSource: string,
		title?: string
	): Promise<boolean> {
		try {
			const username = message.author.username;
			const mediaSource = await this.mediaService.resolveMediaSource(videoSource);

			if (mediaSource) {
				const queueItem = await this.queueService.addToQueue(mediaSource, username);
				await DiscordUtils.sendSuccess(message, `Added to queue: \`${queueItem.title}\``);
				return true;
			} else {
				// Fallback for unresolved sources
				const queueItem = await this.queueService.add(
					videoSource,
					title || videoSource,
					username,
					'url',
					false,
					videoSource
				);
				await DiscordUtils.sendSuccess(message, `Added to queue: \`${queueItem.title}\``);
				return true;
			}
		} catch (error) {
			await ErrorUtils.handleError(error, `adding to queue: ${videoSource}`, message);
			return false;
		}
	}


	public async playFromQueue(message: Message): Promise<void> {
		if (this.streamStatus.playing) {
			await DiscordUtils.sendError(message, 'Already playing a video. Use skip command to skip current video.');
			return;
		}

		const nextItem = this.queueService.getNext();
		if (!nextItem) {
			await DiscordUtils.sendError(message, 'Queue is empty.');
			return;
		}

		this.queueService.setPlaying(true);
		await this.playVideoFromQueueItem(message, nextItem);
	}

	public async skipCurrent(message: Message): Promise<void> {
		if (!this.streamStatus.playing) {
			await DiscordUtils.sendError(message, 'No video is currently playing.');
			return;
		}

		// Check if this is the last item in the queue
		const queueLength = this.queueService.getLength();
		const isLastItem = queueLength <= 1;

		// Prevent concurrent skip operations only if there are more items in queue
		if (this.isSkipping && !isLastItem) {
			await DiscordUtils.sendError(message, 'Skip already in progress.');
			return;
		}

		this.isSkipping = true;

		try {
			// Stop the current stream immediately
			this.streamStatus.manualStop = true;
			this.controller?.abort();
			this.streamer.stopStream();

			const currentItem = this.queueService.getCurrent(); // Get item being skipped
			const nextItem = this.queueService.skip(); // Advance the queue

			if (!nextItem) {
				// No more items in queue - stop playback and leave voice channel
				await DiscordUtils.sendInfo(message, 'Queue', 'No more videos in queue.');
				this.queueService.setPlaying(false);
				await this.cleanupStreamStatus();
				return;
			}

			const currentTitle = currentItem ? currentItem.title : 'current video';
			await DiscordUtils.sendInfo(message, 'Skipping', `Skipping \`${currentTitle}\`. Playing next: \`${nextItem.title}\``);

			// Reset manual stop flag since we're starting a new video
			this.streamStatus.manualStop = false;

			// Skip cleanup since we're playing the next item immediately
			await this.playVideoFromQueueItem(message, nextItem);
		} finally {
			this.isSkipping = false;
		}
	}

	private async playVideoFromQueueItem(message: Message, queueItem: QueueItem): Promise<void> {
		// Ensure queue is marked as playing
		this.queueService.setPlaying(true);

		// Collect video parameters if respect_video_params is enabled
		let videoParams = undefined;
		if (config.respect_video_params) {
			videoParams = await this.getVideoParameters(queueItem.url);
		}

		// Log playing video
		logger.info(`Playing from queue: ${queueItem.title} (${queueItem.url})`);

		// Use streaming service to play the video with video parameters
		await this.playVideo(message, queueItem.url, queueItem.title, videoParams);
	}

	private async getVideoParameters(videoUrl: string): Promise<{ width: number, height: number, fps?: number, bitrate?: string } | undefined> {
		try {
			const resolution = await getVideoParams(videoUrl);
			logger.info(`Video parameters: ${resolution.width}x${resolution.height}, FPS: ${resolution.fps || 'unknown'}`);
			return {
				width: resolution.width,
				height: resolution.height,
				fps: resolution.fps
			};
		} catch (error) {
			await ErrorUtils.handleError(error, 'determining video parameters');
			return undefined;
		}
	}

	private async ensureVoiceConnection(guildId: string, channelId: string, title?: string): Promise<void> {
		// Only join voice if not already connected
		if (!this.streamStatus.joined || !this.streamer.voiceConnection) {
			await this.streamer.joinVoice(guildId, channelId);
			this.streamStatus.joined = true;
		}
		this.streamStatus.playing = true;
		this.streamStatus.channelInfo = { guildId, channelId, cmdChannelId: config.cmdChannelId! };

		if (title) {
			this.streamer.client.user?.setActivity(DiscordUtils.status_watch(title));
		}

		// Wait for voice connection to be fully ready
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Verify voice connection exists
		if (!this.streamer.voiceConnection) {
			throw new Error('Voice connection is not established');
		}
	}

	private setupStreamConfiguration(videoParams?: { width: number, height: number, fps?: number, bitrate?: string }): any {
		return {
			width: videoParams?.width || config.width,
			height: videoParams?.height || config.height,
			frameRate: videoParams?.fps || config.fps,
			bitrateVideo: config.bitrateKbps,
			bitrateVideoMax: config.maxBitrateKbps,
			videoCodec: Utils.normalizeVideoCodec(config.videoCodec),
			hardwareAcceleratedDecoding: config.hardwareAcceleratedDecoding,
			minimizeLatency: false,
			h26xPreset: config.h26xPreset
		};
	}

	private async executeStream(inputForFfmpeg: any, streamOpts: any, message: Message, title: string, videoSource: string): Promise<void> {
		const { command, output: ffmpegOutput } = prepareStream(inputForFfmpeg, streamOpts, this.controller!.signal);

		command.on("error", (err, stdout, stderr) => {
			// Don't log error if it's due to manual stop
			if (!this.streamStatus.manualStop && this.controller && !this.controller.signal.aborted) {
				logger.error("An error happened with ffmpeg:", err.message);
				if (stdout) {
					logger.error("ffmpeg stdout:", stdout);
				}
				if (stderr) {
					logger.error("ffmpeg stderr:", stderr);
				}
				this.controller.abort();
			}
		});

		await playStream(ffmpegOutput, this.streamer, undefined, this.controller!.signal)
			.catch((err) => {
				if (this.controller && !this.controller.signal.aborted) {
					logger.error('playStream error:', err);
					// Send error message to user
					DiscordUtils.sendError(message, `Stream error: ${err.message || 'Unknown error'}`).catch(e =>
						logger.error('Failed to send error message:', e)
					);
				}
				if (this.controller && !this.controller.signal.aborted) this.controller.abort();
			});

		// Only log as finished if we didn't have an error and weren't manually stopped
		if (this.controller && !this.controller.signal.aborted && !this.streamStatus.manualStop) {
			logger.info(`Finished playing: ${title || videoSource}`);
		} else if (this.streamStatus.manualStop) {
			logger.info(`Stopped playing: ${title || videoSource}`);
		} else {
			logger.info(`Failed playing: ${title || videoSource}`);
		}
	}

	private async handleQueueAdvancement(message: Message): Promise<void> {
		await DiscordUtils.sendFinishMessage(message);

		// The video finished playing, so remove it from the queue
		const finishedItem = this.queueService.getCurrent();
		if (finishedItem) {
			this.queueService.removeFromQueue(finishedItem.id);
		}

		// Get the next item in the queue.
		const nextItem = this.queueService.getNext();

		if (nextItem) {
			logger.info(`Auto-playing next item from queue: ${nextItem.title}`);
			setTimeout(() => {
				this.playVideoFromQueueItem(message, nextItem).catch(err =>
					ErrorUtils.handleError(err, 'auto-playing next item')
				);
			}, 1000);
		} else {
			// No more items in the queue, so stop playback and clean up
			this.queueService.setPlaying(false);
			logger.info('No more items in queue, playback stopped');
			await this.cleanupStreamStatus();
		}
	}

	private async handleDownload(message: Message, videoSource: string, title?: string): Promise<string | null> {
		const downloadMessage = await message.reply(`📥 Downloading \`${title || 'YouTube video'}\`...`).catch(e => {
			logger.warn("Failed to send 'Downloading...' message:", e);
			return null;
		});

		try {
			logger.info(`Downloading ${title || videoSource}...`);
			const tempFilePath = await this.mediaService.downloadYouTubeVideo(videoSource);

			if (tempFilePath) {
				logger.info(`Finished downloading ${title || videoSource}`);
				if (downloadMessage) {
					await downloadMessage.delete().catch(e => logger.warn("Failed to delete 'Downloading...' message:", e));
				}
				return tempFilePath;
			}
			throw new Error('Download failed, no temp file path returned.');
		} catch (error) {
			logger.error(`Failed to download YouTube video: ${videoSource}`, error);
			const errorMessage = `❌ Failed to download \`${title || 'YouTube video'}\`.`;
			if (downloadMessage) {
				await downloadMessage.edit(errorMessage).catch(e => logger.warn("Failed to edit 'Downloading...' message:", e));
			} else {
				await DiscordUtils.sendError(message, `Failed to download video: ${error instanceof Error ? error.message : String(error)}`);
			}
			return null;
		}
	}

	private async prepareVideoSource(message: Message, videoSource: string, title?: string): Promise<{ inputForFfmpeg: any, tempFilePath: string | null }> {
		const mediaSource = await this.mediaService.resolveMediaSource(videoSource);

		if (mediaSource && mediaSource.type === 'youtube' && !mediaSource.isLive) {
			const tempFilePath = await this.handleDownload(message, videoSource, title);
			if (tempFilePath) {
				return { inputForFfmpeg: tempFilePath, tempFilePath };
			}
			// Download failed, throw to stop playback
			throw new Error('Failed to prepare video source due to download failure.');
		}

		return { inputForFfmpeg: mediaSource ? mediaSource.url : videoSource, tempFilePath: null };
	}

	private async executeStreamWorkflow(input: any, options: any, message: Message, title: string, source: string): Promise<void> {
		this.controller = new AbortController();
		await this.executeStream(input, options, message, title, source);
	}

	private async finalizeStream(message: Message, tempFile: string | null): Promise<void> {
		if (!this.streamStatus.manualStop && this.controller && !this.controller.signal.aborted) {
			await this.handleQueueAdvancement(message);
		} else {
			this.queueService.setPlaying(false);
			this.queueService.resetCurrentIndex();
			await this.cleanupStreamStatus();
		}

		if (tempFile) {
			try {
				fs.unlinkSync(tempFile);
			} catch (cleanupError) {
				logger.error(`Failed to delete temp file ${tempFile}:`, cleanupError);
			}
		}
	}

	public async playVideo(message: Message, videoSource: string, title?: string, videoParams?: { width: number, height: number, fps?: number, bitrate?: string }): Promise<void> {
		const [guildId, channelId] = [config.guildId, config.videoChannelId];
		this.streamStatus.manualStop = false;

		if (title) {
			const currentQueueItem = this.queueService.getCurrent();
			if (currentQueueItem?.title === title) {
				this.queueService.setPlaying(true);
			}
		}

		let tempFile: string | null = null;
		try {
			const { inputForFfmpeg, tempFilePath } = await this.prepareVideoSource(message, videoSource, title);
			tempFile = tempFilePath;

			await this.ensureVoiceConnection(guildId, channelId, title);
			await DiscordUtils.sendPlaying(message, title || videoSource);

			const streamOpts = this.setupStreamConfiguration(videoParams);
			await this.executeStreamWorkflow(inputForFfmpeg, streamOpts, message, title || videoSource, videoSource);
		} catch (error) {
			await ErrorUtils.handleError(error, `playing video: ${title || videoSource}`);
			if (this.controller && !this.controller.signal.aborted) this.controller.abort();
			this.markVideoAsFailed(videoSource);
		} finally {
			await this.finalizeStream(message, tempFile);
		}
	}

	public async cleanupStreamStatus(): Promise<void> {
		try {
			this.controller?.abort();
			this.streamer.stopStream();

			// Only leave voice if we're not playing another video
			// Check if there are items in queue that might be played
			const hasQueueItems = !this.queueService.isEmpty();
			if (!hasQueueItems) {
				this.streamer.leaveVoice();
				this.streamStatus.joined = false;
				this.streamStatus.joinsucc = false;
			}

			this.streamer.client.user?.setActivity(DiscordUtils.status_idle());

			// Reset all status flags
			this.streamStatus.playing = false;
			this.streamStatus.manualStop = false;
			this.streamStatus.channelInfo = {
				guildId: "",
				channelId: "",
				cmdChannelId: "",
			};
		} catch (error) {
			await ErrorUtils.handleError(error, "cleanup stream status");
		}
	}

	public async stopAndClearQueue(): Promise<void> {
		// Clear the queue
		this.queueService.clearQueue();
		logger.info("Queue cleared by stop command");

		// Then cleanup the stream
		await this.cleanupStreamStatus();
	}

}