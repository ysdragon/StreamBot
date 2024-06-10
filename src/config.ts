import dotenv from "dotenv"

dotenv.config()

export default {
    // Selfbot options
    token: process.env.TOKEN,
    prefix: process.env.PREFIX,
    guildId: process.env.GUILD_ID ? process.env.GUILD_ID : '',
    cmdChannelId: process.env.COMMAND_CHANNEL_ID ? process.env.COMMAND_CHANNEL_ID : '',
    videoChannelId: process.env.VIDEO_CHANNEL_ID ? process.env.VIDEO_CHANNEL_ID : '',
    previewCache: process.env.PREVIEW_CACHE ? process.env.PREVIEW_CACHE : '/tmp/preview-cache',

    // Stream options
    width: process.env.STREAM_WIDTH ? parseInt(process.env.STREAM_WIDTH) : 1280,
    height: process.env.STREAM_HEIGHT ? parseInt(process.env.STREAM_HEIGHT) : 720,
    fps: process.env.STREAM_FPS ? parseInt(process.env.STREAM_FPS) : 30,
    bitrateKbps: process.env.STREAM_BITRATE_KBPS ? parseInt(process.env.STREAM_BITRATE_KBPS) : 1000,
    maxBitrateKbps: process.env.STREAM_MAX_BITRATE_KBPS ? parseInt(process.env.STREAM_MAX_BITRATE_KBPS) : 2500,
    hardwareAcceleratedDecoding: process.env.STREAM_HARDWARE_ACCELERATION ? parseBoolean(process.env.STREAM_HARDWARE_ACCELERATION) : false,
    videoCodec: process.env.STREAM_VIDEO_CODEC === 'VP8' ? 'VP8' : 'H264',

    // Videos server options
    server_enabled: process.env.SERVER_ENABLED ? parseBoolean(process.env.SERVER_ENABLED) : false,
    server_username: process.env.SERVER_USERNAME ? process.env.SERVER_USERNAME : 'admin',
    server_password: process.env.SERVER_PASSWORD ? process.env.SERVER_PASSWORD : 'admin',
    server_port: parseInt(process.env.SERVER_PORT ? process.env.SERVER_PORT : '8080'),
    videosFolder: process.env.VIDEOS_FOLDER ? process.env.VIDEOS_FOLDER : './videos'
}

function parseBoolean(value: string | undefined): boolean {
    if (typeof value === "string") {
        value = value.trim().toLowerCase();
    }
    switch (value) {
        case "true":
            return true;
        default:
            return false;
    }
}