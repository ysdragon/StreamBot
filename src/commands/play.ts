import { BaseCommand } from "./base.js";
import { CommandContext } from "../types/index.js";
import { MediaService } from "../services/media.js";
import { ErrorUtils, GeneralUtils } from '../utils/shared.js';

export default class PlayCommand extends BaseCommand {
	name = "play";
	description = "Play local video, URL, or search YouTube videos";
	usage = "play <video_name|url|search_query>";

	private mediaService: MediaService;

	constructor() {
		super();
		this.mediaService = new MediaService();
	}

	async execute(context: CommandContext): Promise<void> {
		const input = context.args.join(' ');

		if (!input) {
			await this.sendError(context.message, 'Please provide a video name, URL, or search query.');
			return;
		}

		// Check if input is a URL (YouTube, Twitch, or direct link)
		if (GeneralUtils.isValidUrl(input)) {
			await this.handleUrl(context, input);
		} else {
			// Try to find local video first
			const video = context.videos.find(m => m.name === input);

			if (video) {
				await this.handleLocalVideo(context, video);
			} else {
				// Treat as search query
				await this.handleSearchQuery(context, input);
			}
		}
	}


	private async handleLocalVideo(context: CommandContext, video: any): Promise<void> {
		// Add to queue instead of playing immediately
		const success = await context.streamingService.addToQueue(context.message, video.path, video.name);

		if (success) {
			// If not currently playing, start playing from queue
			if (!context.streamStatus.playing) {
				await context.streamingService.playFromQueue(context.message);
			}
		}
	}

	private async handleUrl(context: CommandContext, url: string): Promise<void> {
		try {
			// For lazy processing, just add to queue - resolution happens when playing
			const success = await context.streamingService.addToQueue(context.message, url);

			if (success) {
				// If not currently playing, start playing from queue
				if (!context.streamStatus.playing) {
					await context.streamingService.playFromQueue(context.message);
				}
			}
		} catch (error) {
			await ErrorUtils.handleError(error, `processing URL: ${url}`, context.message);
		}
	}

	private async handleSearchQuery(context: CommandContext, query: string): Promise<void> {
		try {
			// For lazy processing, add the search query to queue
			// The actual search and resolution will happen when it's time to play
			const success = await context.streamingService.addToQueue(context.message, query, `Search: ${query}`);

			if (success) {
				// If not currently playing, start playing from queue
				if (!context.streamStatus.playing) {
					await context.streamingService.playFromQueue(context.message);
				}
			}
		} catch (error) {
			await ErrorUtils.handleError(error, 'adding search query to queue', context.message);
		}
	}
}