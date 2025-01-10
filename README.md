<div align="center">

# StreamBot

A powerful Discord selfbot for streaming videos and live content to Discord voice channels.

![GitHub release](https://img.shields.io/github/v/release/ysdragon/StreamBot)
[![CodeFactor](https://www.codefactor.io/repository/github/ysdragon/streambot/badge)](https://www.codefactor.io/repository/github/ysdragon/streambot)

</div>

## ✨ Features

- 📁 Stream videos from a local folder
- 🎬 Stream and search YouTube videos by title
- 🔗 Stream YouTube videos/live streams by link
- 🌐 Stream from arbitrary links (video files, live streams, Twitch, etc.)
- ⚡ Playback controls: play, stop
- 📋 Video library management

## 📋 Requirements
- [Bun](https://bun.sh/) `v1.1.39+`
- [FFmpeg](https://www.ffmpeg.org/) _(in PATH or working directory)_

## 🚀 Installation

This project is [hosted on GitHub](https://github.com/ysdragon/StreamBot).

1. Clone the repository:
```bash
git clone https://github.com/ysdragon/StreamBot
```

2. Install dependencies:
```bash
bun install
```

3. Configure environment:
   - Rename `.env.example` to `.env`
   - Update configuration values

## 🎮 Usage

Start with Bun:
```bash
bun run start
```

Start with Node.js:
```bash
bun run build
bun run start:node
```

## 🐳 Docker Setup

1. Create a new directory
2. Download compose file:
```bash
wget https://raw.githubusercontent.com/ysdragon/StreamBot/main/docker-compose.yml
```
3. Configure `docker-compose.yml`
4. Launch:
```bash
docker compose up -d
```

## 🎯 Commands

| Command | Description |
|---------|-------------|
| `play <video>` | Play local video |
| `playlink <url>` | Stream from URL/YouTube/Twitch |
| `ytplay <query>` | Play YouTube video |
| `ytsearch <query>` | Search YouTube |
| `stop` | Stop playback |
| `list` | Show video library |
| `refresh` | Update video list |
| `status` | Show playback status |
| `preview <video>` | Generate thumbnails |
| `help` | Show help |

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

# Stream options
STREAM_RESPECT_VIDEO_PARAMS = "false"  # This option is used to respect video parameters such as width, height, fps, bitrate, and max bitrate.
STREAM_WIDTH = "1280" # The width of the video stream in pixels
STREAM_HEIGHT = "720" # The height of the video stream in pixels
STREAM_FPS = "30" # The frames per second (FPS) of the video stream
STREAM_BITRATE_KBPS = "2000" # The bitrate of the video stream in kilobits per second (Kbps)
STREAM_MAX_BITRATE_KBPS = "2500" # The maximum bitrate of the video stream in kilobits per second (Kbps)
STREAM_HARDWARE_ACCELERATION = "false" # Whether to use hardware acceleration for video decoding, set to "true" to enable, "false" to disable
STREAM_VIDEO_CODEC = "H264" # The video codec to use for the stream, can be "H264" or "H265" or "VP8"

# STREAM_H26X_PRESET: Determines the encoding preset for H26x video streams. 
# If the STREAM_H26X_PRESET environment variable is set, it parses the value 
# using the parsePreset function. If not set, it defaults to 'ultrafast' for 
# optimal encoding speed. This preset is only applicable when the codec is 
# H26x; otherwise, it should be disabled or ignored.
# Available presets: "ultrafast", "superfast", "veryfast", "faster", 
# "fast", "medium", "slow", "slower", "veryslow".
STREAM_H26X_PRESET = "ultrafast"

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

## 🤝 Contributing
Contributions are welcome! Feel free to:
- 🐛 Report bugs via [issues](https://github.com/ysdragon/StreamBot/issues/new)
- 🔧 Submit [pull requests](https://github.com/ysdragon/StreamBot/pulls)
- 💡 Suggest new features

## ⚠️ Legal

This bot may violate Discord's Terms of Service. Use at your own risk.

## إبراء الذمة
أتبرأ من أي استخدام غير أخلاقي لهذا المشروع أمام الله.

## 📝 License

Licensed under MIT License. See [LICENSE](https://github.com/ysdragon/StreamBot/blob/main/LICENSE) for details.
