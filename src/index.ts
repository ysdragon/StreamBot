import { Client, TextChannel, CustomStatus, Message, MessageAttachment, ActivityOptions } from "discord.js-selfbot-v13";
import { Streamer, Utils, prepareStream, playStream } from "@dank074/discord-video-stream";
import config from "./config.js";
import fs from 'fs';
import path from 'path';
import { getStream, getVod } from 'twitch-m3u8';
import yts from 'play-dl';
import { getVideoParams, ffmpegScreenshot } from "./utils/ffmpeg.js";
import logger from './utils/logger.js';
import { downloadExecutable, downloadToTempFile, checkForUpdatesAndUpdate } from './utils/yt-dlp.js';
import { Youtube } from './utils/youtube.js';
import { TwitchStream } from './@types/index.js';

// Download yt-dlp and check for updates
(async () => {
    try {
        await downloadExecutable();
        await checkForUpdatesAndUpdate();
    } catch (error) {
        logger.error("Error during initial yt-dlp setup/update:", error);
    }
})();

// Create a new instance of Streamer
const streamer = new Streamer(new Client());

// Declare a controller to abort the stream
let controller: AbortController;

// Create a new instance of Youtube
const youtube = new Youtube();

const streamOpts = {
    width: config.width,
    height: config.height,
    frameRate: config.fps,
    bitrateVideo: config.bitrateKbps,
    bitrateVideoMax: config.maxBitrateKbps,
    videoCodec: Utils.normalizeVideoCodec(config.videoCodec),
    hardwareAcceleratedDecoding: config.hardwareAcceleratedDecoding,
    minimizeLatency: false,
    h26xPreset: config.h26xPreset
};

// Create the videosFolder dir if it doesn't exist
if (!fs.existsSync(config.videosDir)) {
    fs.mkdirSync(config.videosDir);
}

// Create previewCache parent dir if it doesn't exist
if (!fs.existsSync(path.dirname(config.previewCacheDir))) {
    fs.mkdirSync(path.dirname(config.previewCacheDir), { recursive: true });
}

// Create the previewCache dir if it doesn't exist
if (!fs.existsSync(config.previewCacheDir)) {
    fs.mkdirSync(config.previewCacheDir);
}

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
    manualStop: false,
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
                                streamOpts.bitrateVideo = Math.floor(Number(resolution.bitrate) / 1000);
                            }

                            if (resolution.maxbitrate != "N/A") {
                                streamOpts.bitrateVideoMax = Math.floor(Number(resolution.bitrate) / 1000);
                            }

                            if (resolution.fps) {
                                streamOpts.frameRate = resolution.fps
                            }

                        } catch (error) {
                            logger.error('Unable to determine resolution, using static resolution....', error);
                        }
                    }

                    // Log playing video
                    logger.info(`Playing local video: ${video.path}`);

                    // Play video
                    playVideo(message, video.path, videoname);
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

                    switch (true) {
                        case (link.includes('youtube.com/') || link.includes('youtu.be/')):
                            {
                                try {
                                    const videoDetails = await youtube.getVideoInfo(link);

                                    if (videoDetails && videoDetails.title) {
                                        playVideo(message, link, videoDetails.title);
                                    } else {
                                        logger.error(`Failed to get YouTube video info for link: ${link}.`);
                                        await sendError(message, 'Failed to process YouTube link.');
                                    }
                                } catch (error) {
                                    logger.error(`Error processing YouTube link: ${link}`, error);
                                    await sendError(message, 'Error processing YouTube link.');
                                }
                            }
                            break;
                        case link.includes('twitch.tv'):
                            {
                                const twitchId = link.split('/').pop() as string;
                                const twitchUrl = await getTwitchStreamUrl(link);
                                if (twitchUrl) {
                                    playVideo(message, twitchUrl, `twitch.tv/${twitchId}`);
                                }
                            }
                            break;
                        default:
                            {
                                playVideo(message, link, "URL");
                            }
                    }
                }
                break;
            case 'ytplay':
                {
                    const title = args.length > 1 ? args.slice(1).join(' ') : args[1] || args.shift() || '';

                    if (!title) {
                        await sendError(message, 'Please provide a video title.');
                        return;
                    }

                    try {
                        const searchResults = await yts.search(title, { limit: 1 });
                        const videoResult = searchResults[0];

                        const searchResult = await youtube.searchAndGetPageUrl(title);
                        
                        if (searchResult.pageUrl && searchResult.title) {
                            playVideo(message, searchResult.pageUrl, searchResult.title);
                        } else {
                            logger.warn(`No video found or title missing for search: "${title}" using youtube.searchAndGetPageUrl.`);
                            throw new Error('Could not find video');
                        }
                    } catch (error) {
                        logger.error('Failed to play YouTube video:', error);
                        await cleanupStreamStatus();
                        await sendError(message, 'Failed to play video. Please try again.');
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

                    try {
                        streamStatus.manualStop = true;
                        
                        controller?.abort();

                        await sendSuccess(message, 'Stopped playing video.');
                        logger.info("Stopped playing video.");

                        streamer.stopStream();
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

                    } catch (error) {
                        logger.error("Error during force termination:", error);
                    }
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
async function playVideo(message: Message, videoSource: string, title?: string) {
    logger.info(`Attempting to play: ${title || videoSource}`);
    const [guildId, channelId, cmdChannelId] = [config.guildId, config.videoChannelId, config.cmdChannelId!];

    streamStatus.manualStop = false;

    let inputForFfmpeg: any = videoSource;
    let tempFilePath: string | null = null;
    let downloadInProgressMessage: Message | null = null;
    let isLiveYouTubeStream = false;

    try {
        if (typeof videoSource === 'string' && (videoSource.includes('youtube.com/') || videoSource.includes('youtu.be/'))) {
            const videoDetails = await youtube.getVideoInfo(videoSource);

            if (videoDetails?.videoDetails?.isLiveContent) {
                isLiveYouTubeStream = true;
                logger.info(`YouTube video is live: ${title || videoSource}.`);
                const liveStreamUrl = await youtube.getLiveStreamUrl(videoSource);
                if (liveStreamUrl) {
                    inputForFfmpeg = liveStreamUrl;
                    logger.info(`Using direct live stream URL for ffmpeg: ${liveStreamUrl}`);
                } else {
                    logger.error(`Failed to get live stream URL for ${title || videoSource}. Falling back to download attempt or error.`);
                    await sendError(message, `Failed to get live stream URL for \`${title || 'YouTube live video'}\`.`);
                    await cleanupStreamStatus();
                    return;
                }
            } else {
                downloadInProgressMessage = await message.reply(`📥 Downloading \`${title || 'YouTube video'}\`...`).catch(e => {
                    logger.warn("Failed to send 'Downloading...' message:", e);
                    return null;
                });
                logger.info(`Downloading ${title || videoSource}...`);
                
                const ytDlpDownloadOptions: Parameters<typeof downloadToTempFile>[1] = {
                    format: `bestvideo[height<=${streamOpts.height || 720}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${streamOpts.height || 720}]+bestaudio/best[height<=${streamOpts.height || 720}]/best`,
                    noPlaylist: true,
                };
                
                try {
                    tempFilePath = await downloadToTempFile(videoSource, ytDlpDownloadOptions);
                    inputForFfmpeg = tempFilePath;
                    logger.info(`Using temp file for ffmpeg: ${tempFilePath}`);
                    if (downloadInProgressMessage) {
                        await downloadInProgressMessage.delete().catch(e => logger.warn("Failed to delete 'Downloading...' message:", e));
                    }
                } catch (downloadError) {
                    logger.error("Failed to download YouTube video:", downloadError);
                    if (downloadInProgressMessage) {
                        await downloadInProgressMessage.edit(`❌ Failed to download \`${title || 'YouTube video'}\`.`).catch(e => logger.warn("Failed to edit 'Downloading...' message:", e));
                    } else {
                        await sendError(message, `Failed to download video: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`);
                    }
                    await cleanupStreamStatus();
                    return;
                }
            }
        }
        
        await streamer.joinVoice(guildId, channelId);
        streamStatus.joined = true;
        streamStatus.playing = true;
        streamStatus.channelInfo = { guildId, channelId, cmdChannelId };

        if (title) {
            streamer.client.user?.setActivity(status_watch(title) as ActivityOptions);
        }
        await sendPlaying(message, title || videoSource);

        controller?.abort();
        controller = new AbortController();

        if (!controller) {
            throw new Error('Controller is not initialized');
        }
        const { command, output: ffmpegOutput } = prepareStream(inputForFfmpeg, streamOpts, controller.signal);

        command.on("error", (err, stdout, stderr) => {
            logger.error("An error happened with ffmpeg:", err.message);
            if (stdout) logger.error("ffmpeg stdout:", stdout);
            if (stderr) logger.error("ffmpeg stderr:", stderr);
            if (controller && !controller.signal.aborted) controller.abort();
        });
        
        command.on("end", (stdout, stderr) => {
            logger.info(`ffmpeg processing finished successfully for ${title || videoSource}.`);
        });

        await playStream(ffmpegOutput, streamer, undefined, controller.signal)
            .catch((err) => {
                if (controller && !controller.signal.aborted) {
                    logger.error('playStream error:', err);
                }
                if (controller && !controller.signal.aborted) controller.abort();
            });

        if (controller && !controller.signal.aborted) {
            logger.info(`Finished playing: ${title || videoSource}`);
        }

    } catch (error) {
        logger.error(`Error in playVideo for ${title || videoSource}:`, error);
        if (controller && !controller.signal.aborted) controller.abort();
    } finally {
        if (!streamStatus.manualStop && controller && !controller.signal.aborted) {
            await sendFinishMessage();
        }

        await cleanupStreamStatus();

        if (tempFilePath && !isLiveYouTubeStream) {
            try {
                logger.info(`Attempting to delete temp file: ${tempFilePath}`);
                fs.unlinkSync(tempFilePath);
                logger.info(`Successfully deleted temp file: ${tempFilePath}`);
            } catch (cleanupError) {
                logger.error(`Failed to delete temp file ${tempFilePath}:`, cleanupError);
            }
        }
    }
}

// Function to cleanup stream status
async function cleanupStreamStatus() {
    if (streamStatus.manualStop) {
        return;
    }

    try {
        controller?.abort();
        streamer.stopStream();
        streamer.leaveVoice();

        streamer.client.user?.setActivity(status_idle() as ActivityOptions);

        // Reset all status flags
        streamStatus.joined = false;
        streamStatus.joinsucc = false;
        streamStatus.playing = false;
        streamStatus.manualStop = false;
        streamStatus.channelInfo = {
            guildId: "",
            channelId: "",
            cmdChannelId: "",
        };
    } catch (error) {
        logger.error("Error during cleanup:", error);
    }
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    if (!(error instanceof Error && error.message.includes('SIGTERM'))) {
        logger.error('Uncaught Exception:', error);
        return
    }
});

// Run server if enabled in config
if (config.server_enabled) {
    // Run server.js
    import('./server.js');
}

// Login to Discord
streamer.client.login(config.token);