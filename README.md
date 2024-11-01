# StreamBot

This is a Discord selfbot that allows streaming videos, and streams from YouTube and direct links to a Discord voice channel.

## Features

- Stream videos from a local folder.
- Stream and search for YouTube videos using titles.
- Stream YouTube videos/live streams by link.
- Stream arbitrary links (video files, live streams, etc.).
- Playback commands: play, playlink, ytplay, pause, resume, stop.
- List available videos.
- Refresh the video list.
- Get playback status.

## Requirements
[Node.js](https://nodejs.org/) _(version 21 or later)_  
[FFmpeg](https://www.ffmpeg.org/) _(must be added to path or installed to working directory)_

## Installation Steps:

This project is [hosted on github](https://github.com/ysdragon/StreamBot).
1. You can clone this project directly using this command:

```
git clone https://github.com/ysdragon/StreamBot
```

2. Use [bun](https://bun.sh) or any other package manager to install all the dependencies:
```
bun install 
```

3. Build the artifacts from source:
```
bun run build
```

4. Rename [.env.example](https://github.com/ysdragon/StreamBot/blob/main/.env.example) to .env

## Usage
Start the built artifacts:
```
bun run start
```

## Start with Docker Compose

If you want to use Docker Compose, follow these steps:

1. Create a new folder.
2. Run the following command to download the `docker-compose.yml` file:
   ```bash
   wget https://raw.githubusercontent.com/ysdragon/StreamBot/main/docker-compose.yml
   ```
3. Edit the `docker-compose.yml` file and update the necessary information (e.g., TOKEN, PREFIX, GUILD_ID, etc.).
4. Run the following command to start the Docker Compose setup:
   ```bash
   docker compose up -d
   ```
   
## Commands

```
play <video name> - Play a video from the local folder.
playlink <url> - Play a (YouTube video/live stream, direct link).
ytplay <query> - Play a YouTube video from a title query.
ytsearch <query> - Search for a YouTube video using a title query.
stop - Stop the current playback.
pause - Pause the current playback.
resume - Resume playback.
list - List available videos.
refresh - Refresh the video list.
status - Get current playback status.
preview <video name> - Generate and obtain preview thumbnails of a specific video.
help - Show help message.
```

## Configuration

Configuration is done via `.env`:

```bash
# Selfbot options
TOKEN = "" # Your Discord self-bot token
PREFIX = "$" # The prefix used to trigger your self-bot commands
GUILD_ID = "" # The ID of the Discord server your self-bot will be running on
COMMAND_CHANNEL_ID = "" # The ID of the Discord channel where your self-bot will respond to commands
VIDEO_CHANNEL_ID = "" # The ID of the Discord voice/video channel where your self-bot will stream videos

# General options
VIDEOS_DIR = "./videos" # The local path where you store video files
PREVIEW_CACHE_DIR = "./tmp/preview-cache" # The local path where your self-bot will cache video preview thumbnails
YT_VIDEO_CACHE: "false" # Whether to enable youtube video caching, set to "true" to enable, "false" to disable
YT_VIDEO_CACHE_DIR = "./tmp/video-cache" # The local path where your self-bot will cache youtube videos

# Stream options
STREAM_RESPECT_VIDEO_PARAMS = "false"  # This option is used to respect video parameters such as width, height, fps, bitrate, and max bitrate.
STREAM_WIDTH = "1280" # The width of the video stream in pixels
STREAM_HEIGHT = "720" # The height of the video stream in pixels
STREAM_FPS = "30" # The frames per second (FPS) of the video stream
STREAM_BITRATE_KBPS = "1000" # The bitrate of the video stream in kilobits per second (Kbps)
STREAM_MAX_BITRATE_KBPS = "2500" # The maximum bitrate of the video stream in kilobits per second (Kbps)
STREAM_HARDWARE_ACCELERATION = "false" # Whether to use hardware acceleration for video decoding, set to "true" to enable, "false" to disable
STREAM_VIDEO_CODEC = "H264" # The video codec to use for the stream, can be "H264" or "H265" or "VP8"

# Videos server options
SERVER_ENABLED = "false" # Whether to enable the built-in video server
SERVER_USERNAME = "admin" # The username for the video server's admin interface
SERVER_PASSWORD = "admin" # The password for the video server's admin interface
SERVER_PORT = "8080" # The port number the video server will listen on
```

## Get Token ?
Check the [Get token wiki](https://github.com/ysdragon/StreamBot/wiki/Get-Discord-user-token)

## Server

An optional basic HTTP server can be enabled to manage the video library:

- List videos
- Upload videos
- Delete videos
- Generate video preview thumbnails

## Todo

- [x]  Adding ytsearch and ytplay commands   

# Contributing
Public contributions are welcome!  
You can create a [new issue](https://github.com/ysdragon/StreamBot/issues/new) for bugs, or feel free to open a [pull request](https://github.com/ysdragon/StreamBot/pulls) for any and all your changes or work-in-progress features.


## Legal

This bot may violate Discord's Terms of Service. Use at your own risk.

## إبراء الذمة
أتبرأ من أي استخدام غير أخلاقي لهذا المشروع أمام الله.

## License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/ysdragon/StreamBot/blob/main/LICENSE) file for details.
