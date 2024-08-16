import { Client, TextChannel, CustomStatus, ActivityOptions, MessageAttachment } from "discord.js-selfbot-v13";
import { command, streamLivestreamVideo, MediaUdp, StreamOptions, Streamer } from "@dank074/discord-video-stream";
import config from "./config"
import fs from 'fs';
import path from 'path';
import ytdl from '@distube/ytdl-core';
import yts from 'play-dl';

const streamer = new Streamer(new Client());

const streamOpts: StreamOptions = {
    width: config.width,
    height: config.height,
    fps: config.fps,
    bitrateKbps: config.bitrateKbps,
    maxBitrateKbps: config.maxBitrateKbps,
    hardwareAcceleratedDecoding: config.hardwareAcceleratedDecoding,
    videoCodec: config.videoCodec === 'VP8' ? 'VP8' : 'H264'
};

// create videos folder if not exists
if (!fs.existsSync(config.videosFolder)) {
    fs.mkdirSync(config.videosFolder);
}

const videoFiles = fs.readdirSync(config.videosFolder);
let videos = videoFiles.map(file => {
    const fileName = path.parse(file).name;
    // replace space with _
    return { name: fileName.replace(/ /g, '_'), path: path.join(config.videosFolder, file) };
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

let streamStatus = {
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
    // when exit channel
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
    // when join channel success
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
    if (message.author.bot) return; // ignore bots
    if (message.author.id === streamer.client.user?.id) return; // ignore self
    if (!config.cmdChannelId.includes(message.channel.id.toString())) return; // ignore non-command channels
    if (!message.content.startsWith(config.prefix!)) return; // ignore non-commands
    const args = message.content.slice(config.prefix!.length).trim().split(/ +/); // split command and arguments

    if (args.length === 0) return;
    const user_cmd = args.shift()!.toLowerCase();
    const [guildId, channelId] = [config.guildId, config.videoChannelId!];

    if (config.cmdChannelId.includes(message.channel.id)) {
        switch (user_cmd) {
            case 'play':
                if (streamStatus.joined) {
                    message.reply('** Already joined **');
                    return;
                }
                // get video name and find video file
                let videoname = args.shift()
                let video = videos.find(m => m.name == videoname);

                if (!video) {
                    message.reply('** Video not found **');
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
                const streamUdpConn = await streamer.createStream(streamOpts);
                playVideo(video.path, streamUdpConn);
                message.reply('** Playing ( `' + videoname + '` )... **');
                console.log('Playing ( ' + videoname + ' )...');
                streamer.client.user?.setActivity(status_watch(videoname) as unknown as ActivityOptions)
                break;
            case 'playlink':
                if (streamStatus.joined) {
                    message.reply('**Already joined**');
                    return;
                }

                let link = args.shift() || '';

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
                        const yturl = await getVideoUrl(link).catch(error => {
                            console.error("Error:", error);
                        });
                        if (yturl) {
                            message.reply('**Playing...**');
                            playVideo(yturl, streamLinkUdpConn);
                            streamer.client.user?.setActivity(status_watch("") as unknown as ActivityOptions);
                        }
                        break;
                    default:
                        playVideo(link, streamLinkUdpConn);
                        message.reply('**Playing...**');
                        streamer.client.user?.setActivity(status_watch("") as unknown as ActivityOptions);
                }

                break;
            case 'ytplay':
                if (streamStatus.joined) {
                    message.reply('**Already joined**');
                    return;
                }

                let title = args.length > 1 ? args.slice(1).join(' ') : args[1] || args.shift() || '';

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

                break;
            case 'ytsearch':
                let query = args.length > 1 ? args.slice(1).join(' ') : args[1] || args.shift() || '';

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

                break;
            case 'stop':
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
                // use sigkill??
                command?.kill("SIGKILL");
                console.log("Stopped playing")
                message.reply('**Stopped playing.**');
                break;
            case 'pause':
                if (streamStatus.playing) {
                    command?.kill("SIGSTOP");
                    message.reply('Paused');
                    streamStatus.playing = false;
                } else {
                    message.reply('Not playing');
                }
                break;
            case 'resume':
                if (!streamStatus.playing) {
                    command?.kill("SIGCONT");
                    message.reply('Resumed');
                    streamStatus.playing = true;
                } else {
                    message.reply('Already Playing!');
                }
                break;
            case 'list':
                message.reply(`Available videos:\n${videos.map(m => m.name).join('\n')}`);
                break;
            case 'status':
                message.reply(`Joined: ${streamStatus.joined}\nPlaying: ${streamStatus.playing}`);
                break;
            case 'refresh':
                // refresh video list
                const videoFiles = fs.readdirSync(config.videosFolder);
                videos = videoFiles.map(file => {
                    const fileName = path.parse(file).name;
                    // replace space with _
                    return { name: fileName.replace(/ /g, '_'), path: path.join(config.videosFolder, file) };
                });
                message.reply('video list refreshed ' + videos.length + ' videos found.\n' + videos.map(m => m.name).join('\n'));
                break;
            case 'preview':
                let vid = args.shift();
                let vid_name = videos.find(m => m.name === vid);


                if (!vid_name) {
                    message.reply('** Video not found **');
                    return;
                }

                try {
                    //                                                replace _ with space
                    const thumbnails = await ffmpegScreenshot(`${vid_name.name.replace(/_/g, ' ')}${path.extname(vid_name.path)}`);
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
                break;
            case 'help':
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

                // reply all commands here
                message.reply(help);
                break;
            default:
                message.reply('**Invalid command**');
        }
    }
});

streamer.client.login(config.token);

async function playVideo(video: string, udpConn: MediaUdp) {
    console.log("Started playing video");
    udpConn.mediaConnection.setSpeaking(true);
    udpConn.mediaConnection.setVideoStatus(true);

    try {
        const videoStream = await streamLivestreamVideo(video, udpConn);
        videoStream;
        console.log("Finished playing video");
    } catch (error) {
        console.log("Error playing video: ", error);
    } finally {
        udpConn.mediaConnection.setSpeaking(false);
        udpConn.mediaConnection.setVideoStatus(false);
        command?.kill("SIGKILL");
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

async function getVideoUrl(videoUrl: string) {

    const video = await ytdl.getInfo(videoUrl);
    const videoDetails = video.videoDetails;
    if (videoDetails.isLiveContent) {
        // check if the video url is livestream
        const tsFormats = video.formats.filter(format => format.container === 'ts');
        const highestTsFormat = tsFormats.reduce((prev: any, current: any) => {
            if (!prev || current.bitrate > prev.bitrate) {
                return current;
            }
            return prev;
        });

        if (highestTsFormat) {
            return highestTsFormat.url;
        }
    } else {
        const videoFormats = video.formats
            .filter((format: {
                hasVideo: any; hasAudio: any;
            }) => format.hasVideo && format.hasAudio)
            .filter(format => format.container === 'mp4');

        return videoFormats[0].url;
    }
}

async function ytPlayTitle(title: string) {
    try {
        const r = await yts.search(title, { limit: 1 });

        if (r.length > 0) {
            const video = r[0];
            const videoId = video.id;
            if (videoId) {
                const ytvideo = await ytdl.getInfo(videoId);
                const videoFormats = ytvideo.formats
                    .filter((format: {
                        hasVideo: any; hasAudio: any;
                    }) => format.hasVideo && format.hasAudio)
                    .filter(format => format.container === 'mp4');
                return videoFormats[0].url;
            }
        }
    } catch (error) {
        console.log('No videos found with the given title.');
    }
}

async function ytSearch(title: string): Promise<string[]> {
    try {
        const r = await yts.search(title, { limit: 5 });
        const searchResults: string[] = [];
        if (r.length > 0) {
            r.forEach(function (video: any, index: number) { // Corrected forEach loop
                const result = `${index + 1}. \`${video.title}\``;
                searchResults.push(result);
            });
        }
        return searchResults;
    } catch (error) {
        console.log('No videos found with the given title.');
        return [];
    }
}

let ffmpegRunning: { [key: string]: boolean } = {};

async function ffmpegScreenshot(video: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
        if (ffmpegRunning[video]) {
            // wait for ffmpeg to finish
            let wait = () => {
                if (ffmpegRunning[video] == false) {
                    resolve(images);
                }
                setTimeout(wait, 100);
            }
            wait();
            return;
        }
        ffmpegRunning[video] = true;
        const ffmpeg = require("fluent-ffmpeg");
        const ts = ['10%', '30%', '50%', '70%', '90%'];
        const images: string[] = [];

        const takeScreenshots = (i: number) => {
            if (i >= ts.length) {
                ffmpegRunning[video] = false;
                resolve(images);
                return;
            }
            console.log(`Taking screenshot ${i + 1} of ${video} at ${ts[i]}`);
            ffmpeg(`${config.videosFolder}/${video}`)
                .on("end", () => {
                    const screenshotPath = `${config.previewCache}/${video}-${i + 1}.jpg`;
                    images.push(screenshotPath);
                    takeScreenshots(i + 1);
                })
                .on("error", (err: any) => {
                    ffmpegRunning[video] = false;
                    reject(err);
                })
                .screenshots({
                    count: 1,
                    filename: `${video}-${i + 1}.jpg`,
                    timestamps: [ts[i]],
                    folder: config.previewCache,
                    size: "640x480"
                });
        };

        takeScreenshots(0);
    });
}

// run server if enabled in config
if (config.server_enabled) {
    // run server.js
    require('./server');
}
