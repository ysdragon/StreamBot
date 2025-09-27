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
			try {
				const resolution = await getVideoParams(queueItem.url);
				videoParams = {
					width: resolution.width,
					height: resolution.height,
					fps: resolution.fps
				};
				logger.info(`Video parameters: ${resolution.width}x${resolution.height}, FPS: ${resolution.fps || 'unknown'}`);
			} catch (error) {
				await ErrorUtils.handleError(error, 'determining video parameters');
			}
		}

		// Log playing video
		logger.info(`Playing from queue: ${queueItem.title} (${queueItem.url})`);

		// Use streaming service to play the video with video parameters
		await this.playVideo(message, queueItem.url, queueItem.title, videoParams);
	}

	public async playVideo(message: Message, videoSource: string, title?: string, videoParams?: { width: number, height: number, fps?: number, bitrate?: string }): Promise<void> {
		const [guildId, channelId, cmdChannelId] = [config.guildId, config.videoChannelId, config.cmdChannelId!];

		this.streamStatus.manualStop = false;

		// If playing from queue, ensure queue status is synchronized
		if (title) {
			const currentQueueItem = this.queueService.getCurrent();
			if (currentQueueItem && currentQueueItem.title === title) {
				this.queueService.setPlaying(true);
			}
		}

		let inputForFfmpeg: any = videoSource;
		let tempFilePath: string | null = null;
		let downloadInProgressMessage: Message | null = null;
		const isLiveYouTubeStream = false;

		try {
			const mediaSource = await this.mediaService.resolveMediaSource(videoSource);

			if (mediaSource && mediaSource.type === 'youtube' && !mediaSource.isLive) {
				downloadInProgressMessage = await message.reply(`📥 Downloading \`${title || 'YouTube video'}\`...`).catch(e => {
					logger.warn("Failed to send 'Downloading...' message:", e);
					return null;
				});
				logger.info(`Downloading ${title || videoSource}...`);

				try {
					tempFilePath = await this.mediaService.downloadYouTubeVideo(videoSource);
					if (tempFilePath) {
						inputForFfmpeg = tempFilePath;
						logger.info(`Playing ${title || videoSource}...`);
						if (downloadInProgressMessage) {
							await downloadInProgressMessage.delete().catch(e => logger.warn("Failed to delete 'Downloading...' message:", e));
						}
					} else {
						throw new Error('Download failed');
					}
				} catch (downloadError) {
					logger.error("Failed to download YouTube video:", downloadError);
					if (downloadInProgressMessage) {
						await downloadInProgressMessage.edit(`❌ Failed to download \`${title || 'YouTube video'}\`.`).catch(e => logger.warn("Failed to edit 'Downloading...' message:", e));
					} else {
						await DiscordUtils.sendError(message, `Failed to download video: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`);
					}
					await this.cleanupStreamStatus();
					return;
				}
			} else if (mediaSource) {
				inputForFfmpeg = mediaSource.url;
			}

			// Only join voice if not already connected
			if (!this.streamStatus.joined || !this.streamer.voiceConnection) {
				await this.streamer.joinVoice(guildId, channelId);
				this.streamStatus.joined = true;
			}
			this.streamStatus.playing = true;
			this.streamStatus.channelInfo = { guildId, channelId, cmdChannelId };

			if (title) {
				this.streamer.client.user?.setActivity(DiscordUtils.status_watch(title));
			}
			await DiscordUtils.sendPlaying(message, title || videoSource);

			// Wait for voice connection to be fully ready
			await new Promise(resolve => setTimeout(resolve, 2000));

			// Verify voice connection exists
			if (!this.streamer.voiceConnection) {
				throw new Error('Voice connection is not established');
			}

			this.controller?.abort();
			this.controller = new AbortController();

			if (!this.controller) {
				throw new Error('Controller is not initialized');
			}

			// Configure stream options with video parameters if available
			const streamOpts = {
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

			const { command, output: ffmpegOutput } = prepareStream(inputForFfmpeg, streamOpts, this.controller.signal);

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

			await playStream(ffmpegOutput, this.streamer, undefined, this.controller.signal)
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

		} catch (error) {
			await ErrorUtils.handleError(error, `playing video: ${title || videoSource}`);
			if (this.controller && !this.controller.signal.aborted) this.controller.abort();
			this.markVideoAsFailed(videoSource);
		} finally {
			if (!this.streamStatus.manualStop && this.controller && !this.controller.signal.aborted) {
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
			} else {
				// Manual stop or aborted - just reset playing state
				this.queueService.setPlaying(false);
				this.queueService.resetCurrentIndex();
				await this.cleanupStreamStatus();
			}

			if (tempFilePath && !isLiveYouTubeStream) {
				try {
					fs.unlinkSync(tempFilePath);
				} catch (cleanupError) {
					logger.error(`Failed to delete temp file ${tempFilePath}:`, cleanupError);
				}
			}
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