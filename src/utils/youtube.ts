import ytdl from '@distube/ytdl-core';
import logger from './logger.js';
import yts from 'play-dl';
import { VideoFormat, YouTubeVideo } from '../@types/index.js';

export class Youtube {
    async getVideoInfo(url: string): Promise<YouTubeVideo | null> {
        try {
            if (!ytdl.validateURL(url)) {
                throw new Error('Invalid YouTube URL');
            }

            const info = await ytdl.getInfo(url, { playerClients: ['WEB', 'ANDROID'] });
            return {
                id: info.videoDetails.videoId,
                title: info.videoDetails.title,
                formats: info.formats,
                videoDetails: {
                    isLiveContent: info.videoDetails.isLiveContent
                }
            };
        } catch (error) {
            logger.error('Failed to get video info:', error);
            return null;
        }
    }

    async getVideoUrl(videoUrl: string): Promise<string | null> {
        try {
            const video = await this.getVideoInfo(videoUrl);
            if (!video) return null;

            if (video.videoDetails?.isLiveContent) {
                return this.getLiveStreamUrl(video);
            }

            return this.getDirectVideoUrl(video);
        } catch (error) {
            logger.error("Failed to get video URL:", error);
            return null;
        }
    }

    async searchAndPlay(title: string): Promise<string | null> {
        try {
            const results = await yts.search(title, { limit: 1 });
            if (results.length === 0 || !results[0].id) return null;

            const videoInfo = await ytdl.getInfo(results[0].id);
            return this.getDirectVideoUrl({
                title: videoInfo.videoDetails.title,
                formats: videoInfo.formats,
                videoDetails: {
                    isLiveContent: videoInfo.videoDetails.isLive
                }
            });
        } catch (error) {
            logger.error("Video search failed:", error);
            return null;
        }
    }

    async search(query: string, limit: number = 5): Promise<string[]> {
        try {
            const searchResults = await yts.search(query, { limit });
            return searchResults.map((video, index) =>
                `${index + 1}. \`${video.title}\``
            );
        } catch (error) {
            logger.warn("No videos found with the given title");
            return [];
        }
    }

    private getLiveStreamUrl(video: YouTubeVideo): string | null {
        const tsFormats = video.formats.filter(format => format.container === "ts");
        const highestTsFormat = tsFormats.reduce<VideoFormat | null>((prev, current) => {
            return !prev || (current.bitrate || 0) > (prev.bitrate || 0) ? current : prev;
        }, null);

        return highestTsFormat ? highestTsFormat.url : null;
    }

    private getDirectVideoUrl(video: YouTubeVideo): string | null {
        try {
            // Get formats with both video and audio
            const formats = video.formats.filter(format => format.hasVideo && format.hasAudio);
            
            if (formats.length === 0) {
                logger.warn('No formats with both video and audio found');
                return null;
            }

            // Sort formats by quality priority
            formats.sort((a, b) => {
                const qualityA = a.qualityLabel ? parseInt(a.qualityLabel) : 0;
                const qualityB = b.qualityLabel ? parseInt(b.qualityLabel) : 0;
                
                if (qualityA !== qualityB) {
                    return qualityB - qualityA;
                }
                
                // If same quality, compare by bitrate
                return (b.bitrate || 0) - (a.bitrate || 0);
            });

            const bestFormat = formats[0];
            logger.info(`Selected format: ${bestFormat.qualityLabel || 'N/A'} ${bestFormat.container || 'N/A'} (${Math.round((bestFormat.bitrate || 0) / 1000)} kbps)`);

            
            return bestFormat?.url || null;
        } catch (error) {
            logger.error('Error selecting video format:', error);
            return null;
        }
    }
}