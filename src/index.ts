import { Client, TextChannel, CustomStatus, Message, MessageAttachment, ActivityOptions } from "discord.js-selfbot-v13";
import { streamLivestreamVideo, MediaUdp, StreamOptions, Streamer, Utils } from "@dank074/discord-video-stream";
import config from "./config.js";
import fs from 'fs';
import path from 'path';
import ytdl from '@distube/ytdl-core';
import { getStream, getVod } from 'twitch-m3u8';
import yts from 'play-dl';
import { getVideoParams, ffmpegScreenshot } from "./utils/ffmpeg.js";
import PCancelable, { CancelError } from "p-cancelable";
import logger from './utils/logger.js';
import { Youtube } from './utils/youtube.js';
import { TwitchStream } from './@types/index.js';

// Create a new instance of Streamer
const streamer = new Streamer(new Client());

// Create a cancelable command
let command: PCancelable<string> | undefined;

// Create a new instance of Youtube
const youtube = new Youtube();

const streamOpts: StreamOptions = {
    width: config.width,
    height: config.height,
    fps: config.fps,
    bitrateKbps: config.bitrateKbps,
    maxBitrateKbps: config.maxBitrateKbps,
    hardwareAcceleratedDecoding: config.hardwareAcceleratedDecoding,
    videoCodec: Utils.normalizeVideoCodec(config.videoCodec),

    /**
     * Advanced options
     * 
     * Enables sending RTCP sender reports. Helps the receiver synchronize the audio/video frames, except in some weird
     * cases which is why you can disable it
     */
    rtcpSenderReportEnabled: true,

    /**
     * Encoding preset for H264 or H265. The faster it is, the lower the quality
     * Available presets: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
     */
    h26xPreset: config.h26xPreset,

    /**
     * Adds ffmpeg params to minimize latency and start outputting video as fast as possible.
     * Might create lag in video output in some rare cases
     */
    minimizeLatency: true,

    /**
     * Use or disable ChaCha20-Poly1305 encryption.
     * ChaCha20-Poly1305 encryption is faster than AES-256-GCM, except when using AES-NI
     */
    forceChacha20Encryption: false
};

// Create the videosFolder dir
fs.mkdirSync(config.videosDir, { recursive: true });

// Create preview cache directory structure
fs.mkdirSync(config.previewCacheDir, { recursive: true });

// Get all video files
const videoFiles = fs.readdirSync(config.videosDir);

// Create an array of video objects
let videos = videoFiles.map(file => {
    const fileName = path.parse(file).name;
    // replace space with _
    return { name: fileName.replace(/ /g, '_'), path: path.join(config.videosDir, file) };
});

// print out all videos
logger.info(`Available videos:\n${videos.map(m => m.name).join('\n')}`);

// Ready event
streamer.client.on("ready", async () => {
    if (streamer.client.user) {
        logger.info(`${streamer.client.user.tag} is ready`);
        streamer.client.user?.setActivity(status_idle() as ActivityOptions);
    }
});

// Stream status object
const streamStatus = {
    joined: false,
    joinsucc: false,
    playing: false,
    channelInfo: {
        guildId: config.guildId,
        channelId: config.videoChannelId,
        cmdChannelId: config.cmdChannelId
    }
}

// Voice state update event
streamer.client.on('voiceStateUpdate', async (oldState, newState) => {
    // When exit channel
    if (oldState.member?.user.id == streamer.client.user?.id) {
        if (oldState.channelId && !newState.channelId) {
            streamStatus.joined = false;
            streamStatus.joinsucc = false;
            streamStatus.playing = false;
            streamStatus.channelInfo = {
                guildId: config.guildId,
                channelId: config.videoChannelId,
                cmdChannelId: config.cmdChannelId
            }
            streamer.client.user?.setActivity(status_idle() as ActivityOptions);
        }
    }

    // When join channel success
    if (newState.member?.user.id == streamer.client.user?.id) {
        if (newState.channelId && !oldState.channelId) {
            streamStatus.joined = true;
            if (newState.guild.id == streamStatus.channelInfo.guildId && newState.channelId == streamStatus.channelInfo.channelId) {
                streamStatus.joinsucc = true;
            }
        }
    }
})

// Message create event
streamer.client.on('messageCreate', async (message) => {
    if (
        message.author.bot ||
        message.author.id === streamer.client.user?.id ||
        !config.cmdChannelId.includes(message.channel.id.toString()) ||
        !message.content.startsWith(config.prefix!)
    ) return; // Ignore bots, self, non-command channels, and non-commands

    const args = message.content.slice(config.prefix!.length).trim().split(/ +/); // Split command and arguments

    if (args.length === 0) return; // No arguments provided

    const user_cmd = args.shift()!.toLowerCase();
    const [guildId, channelId] = [config.guildId, config.videoChannelId!];

    if (config.cmdChannelId.includes(message.channel.id)) {
        switch (user_cmd) {
            case 'play':
                {
                    if (streamStatus.joined) {
                        sendError(message, 'Already joined');
                        return;
                    }
                    // Get video name and find video file
                    const videoname = args.shift()
                    const video = videos.find(m => m.name == videoname);

                    if (!video) {
                        await sendError(message, 'Video not found');
                        return;
                    }

                    // Check if the respect video parameters environment variable is enabled
                    if (config.respect_video_params) {
                        // Checking video params
                        try {
                            const resolution = await getVideoParams(video.path);
                            streamOpts.height = resolution.height;
                            streamOpts.width = resolution.width;
                            if (resolution.bitrate != "N/A") {
                                streamOpts.bitrateKbps = Math.floor(Number(resolution.bitrate) / 1000);
                            }

                            if (resolution.maxbitrate != "N/A") {
                                streamOpts.maxBitrateKbps = Math.floor(Number(resolution.bitrate) / 1000);
                            }

                            if (resolution.fps) {
                                streamOpts.fps = resolution.fps
                            }

                        } catch (error) {
                            logger.error('Unable to determine resolution, using static resolution....', error);
                        }
                    }

                    // Join voice channel
                    await streamer.joinVoice(guildId, channelId, streamOpts)

                    // Create stream
                    const streamUdpConn = await streamer.createStream(streamOpts);

                    streamStatus.joined = true;
                    streamStatus.playing = true;
                    streamStatus.channelInfo = {
                        guildId: guildId,
                        channelId: channelId,
                        cmdChannelId: message.channel.id
                    }

                    // Log playing video
                    logger.info(`Playing local video: ${video.path}`);

                    // Send playing message
                    sendPlaying(message, videoname || "Local Video");

                    // Play video
                    playVideo(video.path, streamUdpConn, videoname);
                }
                break;
            case 'playlink':
                {
                    if (streamStatus.joined) {
                        sendError(message, 'Already joined');
                        return;
                    }

                    const link = args.shift() || '';

                    if (!link) {
                        await sendError(message, 'Please provide a link.');
                        return;
                    }

                    // Join voice channel
                    await streamer.joinVoice(guildId, channelId, streamOpts);

                    // Create stream
                    const streamLinkUdpConn = await streamer.createStream(streamOpts);

                    streamStatus.joined = true;
                    streamStatus.playing = true;
                    streamStatus.channelInfo = {
                        guildId: guildId,
                        channelId: channelId,
                        cmdChannelId: message.channel.id
                    }

                    switch (true) {
                        case ytdl.validateURL(link):
                            {
                                const [videoInfo, yturl] = await Promise.all([
                                    ytdl.getInfo(link),
                                    getVideoUrl(link).catch(error => {
                                        logger.error("Error:", error);
                                        return null;
                                    })
                                ]);

                                if (yturl) {
                                    sendPlaying(message, videoInfo.videoDetails.title);
                                    playVideo(yturl, streamLinkUdpConn, videoInfo.videoDetails.title);
                                }
                            }
                            break;
                        case link.includes('twitch.tv'):
                            {
                                const twitchId = link.split('/').pop() as string;
                                const twitchUrl = await getTwitchStreamUrl(link);
                                if (twitchUrl) {
                                    sendPlaying(message, `${twitchId}'s Twitch Stream`);
                                    playVideo(twitchUrl, streamLinkUdpConn, `twitch.tv/${twitchId}`);
                                }
                            }
                            break;
                        default:
                            {
                                sendPlaying(message, "URL");
                                playVideo(link, streamLinkUdpConn, "URL");
                            }
                    }
                }
                break;
            case 'ytplay':
                {
                    if (streamStatus.joined) {
                        sendError(message, 'Already joined');
                        return;
                    }

                    const title = args.length > 1 ? args.slice(1).join(' ') : args[1] || args.shift() || '';

                    if (!title) {
                        await sendError(message, 'Please provide a video title.');
                        return;
                    }

                    // Join voice channel
                    await streamer.joinVoice(guildId, channelId, streamOpts);

                    // Create stream
                    const streamYoutubeTitleUdpConn = await streamer.createStream(streamOpts);

                    const [ytUrlFromTitle, searchResults] = await Promise.all([
                        ytPlayTitle(title),
                        yts.search(title, { limit: 1 })
                    ]);

                    streamStatus.joined = true;
                    streamStatus.playing = true;
                    streamStatus.channelInfo = {
                        guildId: guildId,
                        channelId: channelId,
                        cmdChannelId: message.channel.id
                    }

                    const videoResult = searchResults[0];
                    if (ytUrlFromTitle && videoResult?.title) {
                        sendPlaying(message, videoResult.title);
                        playVideo(ytUrlFromTitle, streamYoutubeTitleUdpConn, videoResult.title);
                    }
                }
                break;
            case 'ytsearch':
                {
                    const query = args.length > 1 ? args.slice(1).join(' ') : args[1] || args.shift() || '';

                    if (!query) {
                        await sendError(message, 'Please provide a search query.');
                        return;
                    }

                    const ytSearchQuery = await ytSearch(query);
                    try {
                        if (ytSearchQuery) {
                            await sendList(message, ytSearchQuery, "ytsearch");
                        }

                    } catch (error) {
                        await sendError(message, 'Failed to search for videos.');
                    }
                }
                break;
            case 'stop':
                {
                    if (!streamStatus.joined) {
                        sendError(message, '**Already Stopped!**');
                        return;
                    }

                    command?.cancel()

                    logger.info("Stopped playing")
                    sendSuccess(message, 'Stopped playing video');
                }
                break;
            case 'list':
                {
                    const videoList = videos.map((video, index) => `${index + 1}. \`${video.name}\``);
                    if (videoList.length > 0) {
                        await sendList(message, videoList);
                    } else {
                        await sendError(message, 'No videos found');
                    }
                }
                break;
            case 'status':
                {
                    await sendInfo(message, 'Status',
                        `Joined: ${streamStatus.joined}\nPlaying: ${streamStatus.playing}`);
                }
                break;
            case 'refresh':
                {
                    // Refresh video list
                    const videoFiles = fs.readdirSync(config.videosDir);
                    videos = videoFiles.map(file => {
                        const fileName = path.parse(file).name;
                        // Replace space with _
                        return { name: fileName.replace(/ /g, '_'), path: path.join(config.videosDir, file) };
                    });
                    const refreshedList = videos.map((video, index) => `${index + 1}. \`${video.name}\``);
                    await sendList(message,
                        [`(${videos.length} videos found)`, ...refreshedList], "refresh");
                }
                break;
            case 'preview':
                {
                    const vid = args.shift();
                    const vid_name = videos.find(m => m.name === vid);

                    if (!vid_name) {
                        await sendError(message, 'Video not found');
                        return;
                    }

                    // React with camera emoji
                    message.react('📸');

                    // Reply with message to indicate that the preview is being generated
                    message.reply('📸 **Generating preview thumbnails...**');

                    try {

                        const hasUnderscore = vid_name.name.includes('_');
                        //                                                Replace _ with space
                        const thumbnails = await ffmpegScreenshot(`${hasUnderscore ? vid_name.name : vid_name.name.replace(/_/g, ' ')}${path.extname(vid_name.path)}`);
                        if (thumbnails.length > 0) {
                            const attachments: MessageAttachment[] = [];
                            for (const screenshotPath of thumbnails) {
                                attachments.push(new MessageAttachment(screenshotPath));
                            }

                            // Message content
                            const content = `📸 **Preview**: \`${vid_name.name}\``;

                            // Send message with attachments
                            await message.reply({
                                content,
                                files: attachments
                            });

                        } else {
                            await sendError(message, 'Failed to generate preview thumbnails.');
                        }
                    } catch (error) {
                        logger.error('Error generating preview thumbnails:', error);
                    }
                }
                break;
            case 'help':
                {
                    // Help text
                    const helpText = [
                        '📽 **Available Commands**',
                        '',
                        '🎬 **Media**',
                        `\`${config.prefix}play\` - Play local video`,
                        `\`${config.prefix}playlink\` - Play video from URL/YouTube/Twitch`,
                        `\`${config.prefix}ytplay\` - Play video from YouTube`,
                        `\`${config.prefix}stop\` - Stop playback`,
                        '',
                        '🛠️ **Utils**',
                        `\`${config.prefix}list\` - Show local videos`,
                        `\`${config.prefix}refresh\` - Update list`,
                        `\`${config.prefix}status\` - Show status`,
                        `\`${config.prefix}preview\` - Video preview`,
                        '',
                        '🔍 **Search**',
                        `\`${config.prefix}ytsearch\` - YouTube search`,
                        `\`${config.prefix}help\` - Show this help`
                    ].join('\n');

                    // React with clipboard emoji
                    await message.react('📋');

                    // Reply with all commands
                    await message.reply(helpText);
                }
                break;
            default:
                {
                    await sendError(message, 'Invalid command');
                }
        }
    }
});

// Function to play video
async function playVideo(video: string, udpConn: MediaUdp, title?: string) {
    logger.info("Started playing video");
    udpConn.mediaConnection.setSpeaking(true);
    udpConn.mediaConnection.setVideoStatus(true);

    try {
        if (title) {
            streamer.client.user?.setActivity(status_watch(title) as ActivityOptions);
        }

        command = PCancelable.fn<string, string>(() => streamLivestreamVideo(video, udpConn))(video);

        const res = await command;
        logger.info(`Finished playing video: ${res}`);

    } catch (error) {
        if (!(error instanceof CancelError)) {
            logger.error("Error occurred while playing video:", error);
        }
    } finally {
        udpConn.mediaConnection.setSpeaking(false);
        udpConn.mediaConnection.setVideoStatus(false);
        await sendFinishMessage();
        await cleanupStreamStatus();
    }
}

// Function to cleanup stream status
async function cleanupStreamStatus() {
    streamer.leaveVoice();
    streamer.client.user?.setActivity(status_idle() as ActivityOptions);

    streamStatus.joined = false;
    streamStatus.joinsucc = false;
    streamStatus.playing = false;
    streamStatus.channelInfo = {
        guildId: "",
        channelId: "",
        cmdChannelId: "",
    };
}

// Function to get Twitch URL
async function getTwitchStreamUrl(url: string): Promise<string | null> {
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

// Function to get video URL from YouTube
async function getVideoUrl(videoUrl: string): Promise<string | null> {
    return await youtube.getVideoUrl(videoUrl);
}

// Function to play video from YouTube
async function ytPlayTitle(title: string): Promise<string | null> {
    return await youtube.searchAndPlay(title);
}

// Function to search for videos on YouTube
async function ytSearch(title: string): Promise<string[]> {
    return await youtube.search(title);
}

const status_idle = () => {
    return new CustomStatus(new Client())
        .setEmoji('📽')
        .setState('Watching Something!')
}

const status_watch = (name: string) => {
    return new CustomStatus(new Client())
        .setEmoji('📽')
        .setState(`Playing ${name}...`)
}

// Funtction to send playing message
async function sendPlaying(message: Message, title: string) {
    const content = `📽 **Now Playing**: \`${title}\``;
    await Promise.all([
        message.react('▶️'),
        message.reply(content)
    ]);
}

// Function to send finish message
async function sendFinishMessage() {
    const channel = streamer.client.channels.cache.get(config.cmdChannelId.toString()) as TextChannel;
    if (channel) {
        channel.send('⏹️ **Finished**: Finished playing video.');
    }
}

// Function to send video list message
async function sendList(message: Message, items: string[], type?: string) {
    await message.react('📋');
    if (type == "ytsearch") {
        await message.reply(`📋 **Search Results**:\n${items.join('\n')}`);
    } else if (type == "refresh") {
        await message.reply(`📋 **Video list refreshed**:\n${items.join('\n')}`);
    } else {
        await message.channel.send(`📋 **Local Videos List**:\n${items.join('\n')}`);
    }
}

// Function to send info message
async function sendInfo(message: Message, title: string, description: string) {
    await message.react('ℹ️');
    await message.channel.send(`ℹ️ **${title}**: ${description}`);
}


// Function to send success message
async function sendSuccess(message: Message, description: string) {
    await message.react('✅');
    await message.channel.send(`✅ **Success**: ${description}`);
}

// Function to send error message
async function sendError(message: Message, error: string) {
    await message.react('❌');
    await message.reply(`❌ **Error**: ${error}`);
}

// Run server if enabled in config
if (config.server_enabled) {
    // Run server.js
    import('./server.js');
}

// Login to Discord
streamer.client.login(config.token);