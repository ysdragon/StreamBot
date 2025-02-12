export interface VideoFormat {
    hasVideo: boolean;
    hasAudio: boolean;
    url: string;
    bitrate?: number;
    qualityLabel?: string;
    container?: string;
    isLiveContent?: boolean;
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