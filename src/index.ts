import { Client, TextChannel, CustomStatus, ActivityOptions, MessageAttachment } from "discord.js-selfbot-v13";
import { streamLivestreamVideo, MediaUdp, StreamOptions, Streamer, Utils } from "@dank074/discord-video-stream";
import config from "./config.js";
import fs from 'fs';
import path from 'path';
import ytdl from '@distube/ytdl-core';
import { getStream } from 'twitch-m3u8';
import yts from 'play-dl';
import ffmpeg from 'fluent-ffmpeg';
import { getVideoParams, ffmpegScreenshot } from "./utils/ffmpeg.js";
import PCancelable, {CancelError} from "p-cancelable";

interface TwitchStream {
    quality: string;
    resolution: string;
    url: string;
}

const streamer = new Streamer(new Client());
let command: PCancelable<string> | undefined;

const streamOpts: StreamOptions = {
    width: config.width,
    height: config.height,
    fps: config.fps,
    bitrateKbps: config.bitrateKbps,
    maxBitrateKbps: config.maxBitrateKbps,
    hardwareAcceleratedDecoding: config.hardwareAcceleratedDecoding,
    videoCodec: Utils.normalizeVideoCodec(config.videoCodec),
    readAtNativeFps: false,

    /**
     * Advanced options
     * 
     * Enables sending RTCP sender reports. Helps the receiver synchronize the audio/video frames, except in some weird
     * cases which is why you can disable it
     */
    rtcpSenderReportEnabled: false,
    /**
     * Encoding preset for H264 or H265. The faster it is, the lower the quality
     * Available presets: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
     */
    h26xPreset: config.h26xPreset
};

// Create the videosFolder dir if it doesn't exist
if (!fs.existsSync(config.videosDir)) {
    fs.mkdirSync(config.videosDir);
}

// Create previewCache/ytVideoCacheDir parent dir if it doesn't exist
if (!fs.existsSync(path.dirname(config.ytVideoCacheDir))) {
    fs.mkdirSync(path.dirname(config.ytVideoCacheDir), { recursive: true });
}

// Create the previewCache dir if it doesn't exist
if (!fs.existsSync(config.previewCacheDir)) {
    fs.mkdirSync(config.previewCacheDir);
}

// Create the ytVideoCacheDir dir if it doesn't exist
if (!fs.existsSync(config.ytVideoCacheDir)) {
    fs.mkdirSync(config.ytVideoCacheDir);
}

const tmpVideo = `${config.ytVideoCacheDir}/temp_vid.mp4`;

const videoFiles = fs.readdirSync(config.videosDir);
let videos = videoFiles.map(file => {
    const fileName = path.parse(file).name;
    // replace space with _
    return { name: fileName.replace(/ /g, '_'), path: path.join(config.videosDir, file) };
});

// print out all videos
console.log(`Available videos:\n${videos.map(m => m.name).join('\n')}`);

const status_idle = () => {
    return new CustomStatus(new Client())
        .setEmoji('📽')
        .setState('Watching Something!')
}

const status_watch = (name) => {
    return new CustomStatus(new Client())
        .setEmoji('📽')
        .setState(`Playing ${name}...`)
}

// ready event
streamer.client.on("ready", () => {
    if (streamer.client.user) {
        console.log(`--- ${streamer.client.user.tag} is ready ---`);
        streamer.client.user.setActivity(status_idle() as unknown as ActivityOptions)
    }
});

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

streamer.client.on('voiceStateUpdate', (oldState, newState) => {
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
            streamer.client.user?.setActivity(status_idle() as unknown as ActivityOptions)
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
                        message.reply('** Already joined **');
                        return;
                    }
                    // Get video name and find video file
                    const videoname = args.shift()
                    const video = videos.find(m => m.name == videoname);

                    if (!video) {
                        message.reply('** Video not found **');
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
                            console.error('Unable to determine resolution, using static resolution....', error);
                        }
                    }

                    await streamer.joinVoice(guildId, channelId, streamOpts);
                    streamStatus.joined = true;
                    streamStatus.playing = true;
                    streamStatus.channelInfo = {
                        guildId: guildId,
                        channelId: channelId,
                        cmdChannelId: message.channel.id
                    }
                    const streamUdpConn = await streamer.createStream(streamOpts);
                    playVideo(video.path, streamUdpConn);
                    message.reply('** Playing ( `' + videoname + '` )... **');
                    console.log('Playing ( ' + videoname + ' )...');
                    streamer.client.user?.setActivity(status_watch(videoname) as unknown as ActivityOptions)
                }
                break;
            case 'playlink':
                {
                    if (streamStatus.joined) {
                        message.reply('**Already joined**');
                        return;
                    }

                    const link = args.shift() || '';

                    if (!link) {
                        message.reply('**Please provide a direct link/Youtube Link.**')
                        return;
                    }

                    await streamer.joinVoice(guildId, channelId, streamOpts);

                    streamStatus.joined = true;
                    streamStatus.playing = true;
                    streamStatus.channelInfo = {
                        guildId: guildId,
                        channelId: channelId,
                        cmdChannelId: message.channel.id
                    }

                    const streamLinkUdpConn = await streamer.createStream(streamOpts);

                    switch (true) {
                        case ytdl.validateURL(link):
                            {
                                const yturl = await getVideoUrl(link).catch(error => {
                                    console.error("Error:", error);
                                });
                                if (yturl) {
                                    message.reply('**Playing...**');
                                    playVideo(yturl, streamLinkUdpConn);
                                    streamer.client.user?.setActivity(status_watch("") as unknown as ActivityOptions);
                                }
                            }
                            break;
                        case link.includes('twitch.tv'):
                            {
                                const twitchId = link.split('/').pop() as string;
                                const twitchUrl = await getTwitchStreamUrl(twitchId);
                                if (twitchUrl) {
                                    message.reply('**Playing...**');
                                    playVideo(twitchUrl, streamLinkUdpConn);
                                    streamer.client.user?.setActivity(status_watch(`twitch.tv/${twitchId}`) as unknown as ActivityOptions);
                                }
                            }
                            break;
                        default:
                            {
                                playVideo(link, streamLinkUdpConn);
                                message.reply('**Playing...**');
                                streamer.client.user?.setActivity(status_watch("") as unknown as ActivityOptions);
                            }
                    }
                }
                break;
            case 'ytplay':
                {
                    if (streamStatus.joined) {
                        message.reply('**Already joined**');
                        return;
                    }

                    const title = args.length > 1 ? args.slice(1).join(' ') : args[1] || args.shift() || '';

                    if (!title) {
                        message.reply('**Please provide a Youtube title!**')
                        return;
                    }

                    await streamer.joinVoice(guildId, channelId, streamOpts);

                    streamStatus.joined = true;
                    streamStatus.playing = true;
                    streamStatus.channelInfo = {
                        guildId: guildId,
                        channelId: channelId,
                        cmdChannelId: message.channel.id
                    }

                    const streamYoutubeTitleUdpConn = await streamer.createStream(streamOpts);
                    const ytUrlFromTitle = await ytPlayTitle(title);
                    if (ytUrlFromTitle) {
                        message.reply('**Playing...**');
                        playVideo(ytUrlFromTitle, streamYoutubeTitleUdpConn);
                        streamer.client.user?.setActivity(status_watch("") as unknown as ActivityOptions);
                    }
                }
                break;
            case 'ytsearch':
                {
                    const query = args.length > 1 ? args.slice(1).join(' ') : args[1] || args.shift() || '';

                    if (!query) {
                        message.reply('**Please provide a Youtube title!**')
                        return;
                    }

                    const ytSearchQuery = await ytSearch(query);
                    try {
                        if (ytSearchQuery) {
                            message.reply(ytSearchQuery.join('\n'));
                        }

                    } catch (error) {
                        message.reply("Error");
                    }
                }
                break;
            case 'stop':
                {
                    if (!streamStatus.joined) {
                        message.reply('**Already Stopped!**');
                        return;
                    }
                    streamer.leaveVoice()
                    streamStatus.joined = false;
                    streamStatus.joinsucc = false;
                    streamStatus.playing = false;
                    streamStatus.channelInfo = {
                        guildId: '',
                        channelId: '',
                        cmdChannelId: streamStatus.channelInfo.cmdChannelId
                    }

                    command?.cancel()
                    
                    console.log("Stopped playing")
                    message.reply('**Stopped playing.**');
                }
                break;
            // Disabled pause and resume commands until I find a better implementation
            // case 'pause':
            //     if (streamStatus.playing) {
            //         command?.kill("SIGSTOP");
            //         message.reply('Paused');
            //         streamStatus.playing = false;
            //     } else {
            //         message.reply('Not playing');
            //     }
            //     break;
            // case 'resume':
            //     if (!streamStatus.playing) {
            //         command?.kill("SIGCONT");
            //         message.reply('Resumed');
            //         streamStatus.playing = true;
            //     } else {
            //         message.reply('Already Playing!');
            //     }
            //     break;
            case 'list':
                {
                    message.reply(`Available videos:\n${videos.map(m => m.name).join('\n')}`);
                }
                break;
            case 'status':
                {
                    message.reply(`Joined: ${streamStatus.joined}\nPlaying: ${streamStatus.playing}`);
                }
                break;
            case 'refresh':
                {
                    // refresh video list
                    const videoFiles = fs.readdirSync(config.videosDir);
                    videos = videoFiles.map(file => {
                        const fileName = path.parse(file).name;
                        // replace space with _
                        return { name: fileName.replace(/ /g, '_'), path: path.join(config.videosDir, file) };
                    });
                    message.reply('video list refreshed ' + videos.length + ' videos found.\n' + videos.map(m => m.name).join('\n'));
                }
                break;
            case 'preview':
                {
                    const vid = args.shift();
                    const vid_name = videos.find(m => m.name === vid);

                    if (!vid_name) {
                        message.reply('** Video not found **');
                        return;
                    }

                    try {
                        const hasUnderscore = vid_name.name.includes('_');
                        //                                                Replace _ with space
                        const thumbnails = await ffmpegScreenshot(`${hasUnderscore ? vid_name.name : vid_name.name.replace(/_/g, ' ')}${path.extname(vid_name.path)}`);
                        if (thumbnails.length > 0) {
                            const attachments: MessageAttachment[] = [];
                            for (const screenshotPath of thumbnails) {
                                attachments.push(new MessageAttachment(screenshotPath));
                            }
                            await message.reply({ files: attachments });
                        } else {
                            message.reply('Failed to generate preview thumbnails.');
                        }
                    } catch (error) {
                        console.error('Error generating preview thumbnails:', error);
                    }
                }
                break;
            case 'help':
                {
                    const commands = {
                        play: {
                            description: 'Play a video',
                            usage: 'play [video name]',
                        },

                        playlink: {
                            description: 'Play a video/video/stream direct link or from youtube link',
                            usage: 'playlink [link]',
                        },

                        ytplay: {
                            description: 'Play a YouTube video from a title query',
                            usage: 'ytplay [query]',
                        },

                        ytsearch: {
                            description: 'Search for a YouTube video using a title query',
                            usage: 'ytsearch [query]',
                        },

                        stop: {
                            description: 'Stop the current playing video',
                            usage: 'stop'
                        },

                        pause: {
                            description: 'Pause the currently playing video',
                            usage: 'pause'
                        },

                        resume: {
                            description: 'Resume the paused video',
                            usage: 'resume'
                        },

                        list: {
                            description: 'Get available video list',
                            usage: 'list'
                        },

                        refresh: {
                            description: 'Refresh video list.',
                            usage: 'refresh'
                        },

                        status: {
                            description: 'Get bot status.',
                            usage: 'status'
                        },

                        preview: {
                            description: 'Generate and obtain preview thumbnails of a specific video.',
                            usage: 'preview [video name]'
                        },

                        help: {
                            description: 'Show this help message',
                            usage: 'help'
                        }
                    }


                    let help = 'Available commands:\n\n';

                    for (const [name, cmd] of Object.entries(commands)) {
                        help += `**${name}: ${cmd.description}**\n`;
                        help += `Usage: \`${config.prefix}${cmd.usage}\`\n`;

                    }

                    // Reply with all commands
                    message.reply(help);
                }
                break;
            default:
                {
                    message.reply('**Invalid command**');
                }
        }
    }
});

streamer.client.login(config.token);

async function playVideo(video: string, udpConn: MediaUdp) {
    console.log("Started playing video");
    udpConn.mediaConnection.setSpeaking(true);
    udpConn.mediaConnection.setVideoStatus(true);

    try {
        command = PCancelable.fn<string, string>((input, onCancel) => streamLivestreamVideo(video, udpConn))(video);
        
        const res = await command;
        console.log("Finished playing video " + res);
        
        // Check: if tmpVideo exists, delete it
        if (fs.existsSync(tmpVideo)) {
            fs.unlink(tmpVideo, (err) => {
                if (err) {
                    console.error(`Error deleting video: ${err}`);
                } else {
                    console.log(`Temp Video deleted: ${tmpVideo}`);
                }
            });
        }
    } catch (error) {
        if ( !(error instanceof CancelError) ) {
            console.error("Error occurred while playing video:", error);
        } 
    } finally {
        udpConn.mediaConnection.setSpeaking(false);
        udpConn.mediaConnection.setVideoStatus(false);
        await sendFinishMessage();
        await cleanupStreamStatus();
    }
}

async function sendFinishMessage() {
    const channel = streamer.client.channels.cache.get(config.cmdChannelId.toString()) as TextChannel;
    await channel?.send("**Finished playing video.**");
}

async function cleanupStreamStatus() {
    streamer.leaveVoice();
    streamer.client.user?.setActivity(status_idle() as unknown as ActivityOptions);

    streamStatus.joined = false;
    streamStatus.joinsucc = false;
    streamStatus.playing = false;
    streamStatus.channelInfo = {
        guildId: "",
        channelId: "",
        cmdChannelId: "",
    };
}

async function ytVideoCache(ytVideo: any): Promise<string | null> {
    // Filter formats to get the best video format without audio
    const videoFormats = ytVideo.formats.filter(
        (format: { hasVideo: boolean; hasAudio: boolean }) =>
            format.hasVideo && !format.hasAudio
    );

    // Filter formats to get the best audio format
    const audioFormats = ytVideo.formats.filter(
        (format: { hasVideo: boolean; hasAudio: boolean }) =>
            !format.hasVideo && format.hasAudio
    );

    // Find the best video format
    const bestVideoFormat = videoFormats.reduce((best: any, current: any) => {
        return !best || parseInt(current.qualityLabel) > parseInt(best.qualityLabel)
            ? current
            : best;
    }, null);

    // Find the best audio format
    const bestAudioFormat = audioFormats.reduce((best: any, current: any) => {
        return !best || current.bitrate > best.bitrate ? current : best;
    }, null);

    // Check if we have both formats
    if (bestVideoFormat && bestAudioFormat) {
        const videoUrl = bestVideoFormat.url;
        const audioUrl = bestAudioFormat.url;

        console.log("Downloading/Merging ...");

        return new Promise((resolve, reject) => {
            // Use ffmpeg to merge video and audio
            ffmpeg()
                .input(videoUrl)
                .input(audioUrl)
                .outputOptions("-c:v copy")
                .outputOptions("-c:a aac")
                .on("end", () => {
                    console.log("Downloading/Merging finished!");
                    resolve(tmpVideo);
                })
                .on("error", (err) => {
                    console.error("Error merging streams:", err);
                    reject(err);
                })
                .save(tmpVideo);
        });
    }

    return null;
}

async function getTwitchStreamUrl(url: string): Promise<string | null> {
    try {
        const streams = await getStream(url);
        const stream = streams.find((stream: TwitchStream) => stream.resolution === `${config.width}x${config.height}`) || streams[0];
        return stream.url;
        // match best resolution with configured resolution
    } catch (error) {
        console.error("Error occurred while getting Twitch stream URL:", error);
        return null;
    }
}

async function getVideoUrl(videoUrl: string): Promise<string | null> {
    try {
        const video = await ytdl.getInfo(videoUrl, { playerClients: ['WEB', 'ANDROID'] });
        const videoDetails = video.videoDetails;

        if (videoDetails.isLiveContent) {
            // Check if the video URL is a livestream
            const tsFormats = video.formats.filter(
                (format) => format.container === "ts"
            );
            const highestTsFormat = tsFormats.reduce((prev: any, current: any) => {
                return !prev || current.bitrate > prev.bitrate ? current : prev;
            }, null);

            return highestTsFormat ? highestTsFormat.url : null;
        } else {
            // Check if youtube video caching is enabled
            if (config.ytVideoCache) {
                return await ytVideoCache(video);
            } else {
                const videoFormats = video.formats
                    .filter((format: {
                        hasVideo: boolean; hasAudio: boolean;
                    }) => format.hasVideo && format.hasAudio);

                return videoFormats[0].url ? videoFormats[0].url : null;
            }
        }
    } catch (error) {
        console.error("Error occurred while getting video URL:", error);
        return null;
    }
}

async function ytPlayTitle(title: string): Promise<string | null> {
    try {
        // Search for videos using the provided title
        const results = await yts.search(title, { limit: 1 });

        // Check if any results were found
        if (results.length > 0) {
            const video = results[0];
            const videoId = video.id;

            // Ensure videoId is valid before proceeding
            if (videoId) {
                const ytVideoInfo = await ytdl.getInfo(videoId, { playerClients: ['WEB', 'ANDROID'] });

                // Check if youtube video caching is enabled
                if (config.ytVideoCache) {
                    return await ytVideoCache(video);
                } else {
                    const videoFormats = ytVideoInfo.formats
                        .filter((format: {
                            hasVideo: boolean; hasAudio: boolean;
                        }) => format.hasVideo && format.hasAudio);

                    return videoFormats[0].url ? videoFormats[0].url : null;
                }

            }
        }

        return null;
    } catch (error) {
        console.error("Error occurred while searching for videos:", error);
        return null;
    }
}

async function ytSearch(title: string): Promise<string[]> {
    try {
        const r = await yts.search(title, { limit: 5 });
        const searchResults: string[] = [];
        if (r.length > 0) {
            r.forEach(function (video: any, index: number) {
                const result = `${index + 1}. \`${video.title}\``;
                searchResults.push(result);
            });
        }
        return searchResults;
    } catch (error) {
        console.log("No videos found with the given title.");
        return [];
    }
}

// Run server if enabled in config
if (config.server_enabled) {
    // Run server.js
    import('./server.js');
}
