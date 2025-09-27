<div align="center">

<img src="assets/logo.svg" alt="StreamBot Logo" width="400" height="120"/>

# StreamBot

![GitHub release](https://img.shields.io/github/v/release/ysdragon/StreamBot)
[![CodeFactor](https://www.codefactor.io/repository/github/ysdragon/streambot/badge)](https://www.codefactor.io/repository/github/ysdragon/streambot)

[![Ceasefire Now](https://badge.techforpalestine.org/default)](https://techforpalestine.org/learn-more)

</div>

## ✨ Features

- 📁 **Local Video Streaming**: Stream videos from your local videos folder
- 🎬 **YouTube Integration**: Stream YouTube videos
- 🔗 **YouTube Live Streams**: Direct streaming support for YouTube live content
- 🌐 **Twitch Support**: Stream Twitch live streams and video-on-demand (VODs)
- 🔗 **Direct URL Streaming**: Stream from arbitrary video file URLs and live streams
- 🎵 **Queue System**: Queue multiple videos with auto-play and skip functionality
- 🌐 **Web Management Interface**: Full-featured web dashboard for video library management
- 📤 **Video Upload**: Upload videos through the web interface

## 📋 Requirements
- [Bun](https://bun.sh/) `v1.1.39+` (recommended) or [Node.js](https://nodejs.org/) `v16+`
- [FFmpeg](https://www.ffmpeg.org/) _(in PATH or working directory)_
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) _(automatically downloaded/updated by the bot)_

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

### Starting the Bot

**With Bun (recommended):**
```bash
bun run start
```

**With Node.js:**
```bash
bun run build
bun run start:node
```

> **Note:** All videos are played through a queue system. Use the `play` command to add videos to the queue, and they will be played sequentially with automatic advancement to the next video.

### Video Sources

StreamBot supports multiple video sources:

- **Local Videos**: Store videos in your `VIDEOS_DIR` folder and use `play <filename>`
- **Smart Play**: Use `play <input>` for automatic detection and streaming (local file, URL, YouTube video, or Twitch stream)
- **YouTube Search**: Use `ytsearch <query>` to search YouTube and display results (use `play` with search results to stream)
- **Live Streams**: Full support for YouTube Live streams and Twitch live content
- **Video Queue**: All playback goes through a queue system - videos are added to queue and played sequentially

## 🐳 Docker Setup

### Standard Setup
1. Create a directory and navigate to it:
```bash
mkdir streambot && cd streambot
```

2. Download the compose file:
```bash
wget https://raw.githubusercontent.com/ysdragon/StreamBot/main/docker-compose.yml
```

3. Configure environment variables in `docker-compose.yml`

4. Launch container:
```bash
docker compose up -d
```

### Cloudflare WARP Setup
1. Download WARP compose file:
```bash
wget https://raw.githubusercontent.com/ysdragon/StreamBot/main/docker-compose-warp.yml
```

2. Configure `docker-compose-warp.yml`:
   - Add your WARP license key
   - Update TOKEN, etc

3. Launch with WARP:
```bash
docker compose -f docker-compose-warp.yml up -d
```
> [!NOTE]
> The basic video server will not work if you use WARP.


## 🎯 Commands

| Command | Description | Aliases |
|---------|-------------|---------|
| `play <input>` | Smart play: local video, URL, or YouTube search | |
| `ytsearch <query>` | Search YouTube and display results | |
| `stop` | Stop current playback | `leave`, `s` |
| `skip` | Skip to next video in queue | `next` |
| `queue` | Display current video queue | |
| `list` | Show local video library | |
| `status` | Show playback status | |
| `preview <video>` | Generate video thumbnails | |
| `ping` | Check bot latency | |
| `help` | Show available commands | |

## Configuration

Configuration is done via `.env` file:

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
STREAM_RESPECT_VIDEO_PARAMS = "false" # Respect original video parameters (width, height, fps, bitrate)
STREAM_WIDTH = "1280" # The width of the video stream in pixels
STREAM_HEIGHT = "720" # The height of the video stream in pixels
STREAM_FPS = "30" # The frames per second (FPS) of the video stream
STREAM_BITRATE_KBPS = "1000" # The bitrate of the video stream in kilobits per second (Kbps)
STREAM_MAX_BITRATE_KBPS = "2500" # The maximum bitrate of the video stream in kilobits per second (Kbps)
STREAM_HARDWARE_ACCELERATION = "false" # Enable hardware acceleration for video decoding
STREAM_VIDEO_CODEC = "H264" # Video codec: VP8, H264, H265, VP9, or AV1

# H.26x encoding preset for optimal quality/speed balance
# Available presets: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
STREAM_H26X_PRESET = "ultrafast"

# Videos server options
SERVER_ENABLED = "false" # Enable the built-in web server for video management
SERVER_USERNAME = "admin" # Username for the web interface
SERVER_PASSWORD = "admin" # Password for the web interface (bcrypt hash is supported)
SERVER_PORT = "8080" # Port number for the web server
```

## Get Token ?
Check the [Get token wiki](https://github.com/ysdragon/StreamBot/wiki/Get-Discord-user-token)

## 🌐 Web Interface

When enabled by setting `SERVER_ENABLED=true` in your `.env` file, StreamBot provides a user-friendly web-based management interface for seamless video library control.

**Features:**
- 📋 **Video Library Management**: Browse, search, and organize your video collection
- 📤 **Video Upload**: Upload new videos directly through the web interface
- 🖼️ **Thumbnail Generation**: Automatic preview generation for all videos in the library

**Access:** Available at `http://localhost:SERVER_PORT` when enabled

**Setup:**
1. Set `SERVER_ENABLED=true` in your `.env` file
2. Configure `SERVER_USERNAME`, `SERVER_PASSWORD`, and `SERVER_PORT`
3. Restart the bot to apply changes
4. Access the web interface in your browser at the configured port

## 🤝 Contributing
Contributions are welcome! Feel free to:
- 🐛 Report bugs via [issues](https://github.com/ysdragon/StreamBot/issues/new)
- 🔧 Submit [pull requests](https://github.com/ysdragon/StreamBot/pulls)
- 💡 Suggest new features

## ⚠️ Legal

This bot may violate Discord's ToS. Use at your own risk.

## إبراء الذمة
أتبرأ من أي استخدام غير أخلاقي لهذا المشروع أمام الله.

## 📝 License

Licensed under MIT License. See [LICENSE](https://github.com/ysdragon/StreamBot/blob/main/LICENSE) for details.
