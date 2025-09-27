import { getStream, getVod } from 'twitch-m3u8';
import { TwitchStream, MediaSource } from '../types/index.js';
import config from "../config.js";
import logger from '../utils/logger.js';
import { Youtube } from '../utils/youtube.js';
import { downloadToTempFile } from '../utils/yt-dlp.js';
import { GeneralUtils } from '../utils/shared.js';
import path from 'path';

export class MediaService {
	private youtube: Youtube;

	constructor() {
		this.youtube = new Youtube();
	}

	public async resolveMediaSource(url: string): Promise<MediaSource | null> {
		try {
			// Check for YouTube
			if (url.includes('youtube.com/') || url.includes('youtu.be/')) {
				const videoDetails = await this.youtube.getVideoInfo(url);
				if (videoDetails) {
					return {
						url,
						title: videoDetails.title,
						type: 'youtube',
						isLive: videoDetails.videoDetails?.isLiveContent || false
					};
				}
			}
			// Check for Twitch
			else if (url.includes('twitch.tv')) {
				const streamUrl = await this.getTwitchStreamUrl(url);
				if (streamUrl) {
					const twitchId = url.split('/').pop() as string;
					return {
						url: streamUrl,
						title: `twitch.tv/${twitchId}`,
						type: 'twitch'
					};
				}
			}
			// Check for Local File
			else if (GeneralUtils.isLocalFile(url)) {
				return {
					url,
					title: path.basename(url, path.extname(url)),
					type: 'local'
				};
			}
			// Fallback to Direct URL
			else {
				let title = "Direct URL";
				try {
					const urlObj = new URL(url);
					const pathname = urlObj.pathname;
					const filename = pathname.split('/').pop();

					if (filename && filename.includes('.')) {
						title = decodeURIComponent(filename.replace(/\.[^/.]+$/, ""));
					} else if (pathname !== '/' && pathname.length > 1) {
						const pathSegment = pathname.split('/').pop();
						if (pathSegment) {
							title = decodeURIComponent(pathSegment);
						}
					}
				} catch (e) {
					logger.debug("Could not parse URL for title extraction:", url);
				}

				return {
					url,
					title,
					type: 'url'
				};
			}

			return null;
		} catch (error) {
			logger.error("Failed to resolve media source:", error);
			return null;
		}
	}

	public async getTwitchStreamUrl(url: string): Promise<string | null> {
		try {
			// Handle VODs
			if (url.includes('/videos/')) {
				const vodId = url.split('/videos/').pop() as string;
				const vodInfo = await getVod(vodId);
				const vod = vodInfo.find((stream: TwitchStream) => stream.resolution === `${config.width}x${config.height}`) || vodInfo[0];
				if (vod?.url) {
					return vod.url;
				}
				logger.error("No VOD URL found");
				return null;
			} else {
				const twitchId = url.split('/').pop() as string;
				const streams = await getStream(twitchId);
				const stream = streams.find((stream: TwitchStream) => stream.resolution === `${config.width}x${config.height}`) || streams[0];
				if (stream?.url) {
					return stream.url;
				}
				logger.error("No Stream URL found");
				return null;
			}
		} catch (error) {
			logger.error("Failed to get Twitch stream URL:", error);
			return null;
		}
	}

	public async downloadYouTubeVideo(url: string): Promise<string | null> {
		try {
			const ytDlpDownloadOptions = {
				format: `bestvideo[height<=${config.height || 720}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${config.height || 720}]+bestaudio/best[height<=${config.height || 720}]/best`,
				noPlaylist: true,
			};

			const tempFilePath = await downloadToTempFile(url, ytDlpDownloadOptions);
			return tempFilePath;
		} catch (error) {
			logger.error("Failed to download YouTube video:", error);
			return null;
		}
	}

	public async searchYouTube(query: string, limit: number = 5): Promise<string[]> {
		try {
			return await this.youtube.search(query, limit);
		} catch (error) {
			logger.error("Failed to search YouTube:", error);
			return [];
		}
	}

	public async searchAndPlayYouTube(query: string): Promise<MediaSource | null> {
		try {
			const searchResult = await this.youtube.searchAndGetPageUrl(query);
			if (searchResult.pageUrl && searchResult.title) {
				return {
					url: searchResult.pageUrl,
					title: searchResult.title,
					type: 'youtube'
				};
			}
			return null;
		} catch (error) {
			logger.error("Failed to search and play YouTube:", error);
			return null;
		}
	}
}