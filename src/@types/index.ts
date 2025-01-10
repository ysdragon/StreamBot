export interface VideoFormat {
    hasVideo: boolean;
    hasAudio: boolean;
    url: string;
    bitrate?: number;
    qualityLabel?: string;
    container?: string;
}

export interface YouTubeVideo {
    id?: string;
    title: string;
    formats: VideoFormat[];
    videoDetails?: {
        isLiveContent: boolean;
    };
}

export interface TwitchStream {
    quality: string;
    resolution: string;
    url: string;
}