import { BaseCommand } from "./base.js";
import { CommandContext } from "../types/index.js";
import { MediaService } from "../services/media.js";
import { ErrorUtils, GeneralUtils } from '../utils/shared.js';
import { tokenize, parseHeaderFlags, hasHeaderFlags } from '../utils/headers.js';
import fs from 'fs';
import path from 'path';
import config from "../config.js";

export default class PlayCommand extends BaseCommand {
	name = "play";
	description = "Play local video, URL, or search YouTube videos";
	usage = "play <video_name|url|search_query> [--referer URL] [--origin URL] [--user-agent UA] [--header \"Name: Value\"]";

	private mediaService: MediaService;

	constructor() {
		super();
		this.mediaService = new MediaService();
	}

	async execute(context: CommandContext): Promise<void> {
		let input = context.args.join(' ');
		let headers: Record<string, string> = {};

		// Custom HTTP headers (--referer, --origin, --header ...) for URL sources
		if (hasHeaderFlags(context.args)) {
			try {
				// Re-tokenize the raw message so quoted values (e.g. User-Agent) stay intact
				const tokens = tokenize(context.message.content.slice(config.prefix!.length)).slice(1);
				({ input, headers } = parseHeaderFlags(tokens));
			} catch (error) {
				await this.sendError(context.message, error instanceof Error ? error.message : String(error));
				return;
			}

			if (!/^https?:\/\//i.test(input)) {
				await this.sendError(context.message, 'Custom headers can only be used with http(s) URLs.');
				return;
			}

			// YouTube and Twitch sources are resolved by their own extractors, which don't use custom headers
			if (/youtube\.com\/|youtu\.be\/|twitch\.tv\//i.test(input)) {
				await this.sendError(context.message, 'Custom headers are not supported for YouTube or Twitch URLs.');
				return;
			}
		}

		if (!input) {
			await this.sendError(context.message, 'Please provide a video name, URL, or search query.');
			return;
		}

		// Check if input is a URL (YouTube, Twitch, or direct link)
		if (GeneralUtils.isValidUrl(input)) {
			await this.handleUrl(context, input, headers);
		} else {
			// Refresh video list from disk before matching
			const videoFiles = fs.readdirSync(config.videosDir);
			const refreshedVideos = videoFiles.map(file => ({
				name: path.parse(file).name,
				path: path.join(config.videosDir, file)
			}));
			context.videos.length = 0;
			context.videos.push(...refreshedVideos);

			// Case-insensitive match
			const video = context.videos.find(m => m.name.toLowerCase() === input.toLowerCase());

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

	private async handleUrl(context: CommandContext, url: string, headers: Record<string, string> = {}): Promise<void> {
		try {
			// For lazy processing, just add to queue - resolution happens when playing
			const success = await context.streamingService.addToQueue(
				context.message,
				url,
				undefined,
				Object.keys(headers).length > 0 ? headers : undefined
			);

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