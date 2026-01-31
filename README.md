<div align="center">

<img src="src/server/public/favicon.svg" alt="StreamBot Logo" width="400" height="120"/>

# StreamBot

**A powerful Discord self-bot for streaming videos from multiple sources with a web management interface**

![GitHub release](https://img.shields.io/github/v/release/ysdragon/StreamBot)
[![CodeFactor](https://www.codefactor.io/repository/github/ysdragon/streambot/badge)](https://www.codefactor.io/repository/github/ysdragon/streambot)

[![Ceasefire Now](https://badge.techforpalestine.org/default)](https://techforpalestine.org/learn-more)

</div>

## 📑 Table of Contents

- [✨ Features](#-features)
- [📋 Requirements](#-requirements)
- [🚀 Installation](#-installation)
- [🎮 Usage](#-usage)
- [🐳 Docker Setup](#-docker-setup)
- [🎯 Commands](#-commands)
- [⚙️ Configuration](#%EF%B8%8F-configuration)
- [🌐 Web Interface](#-web-interface)
- [🤝 Contributing](#-contributing)
- [⚠️ Disclaimer](#%EF%B8%8F-disclaimer)
- [📝 License](#-license)

## ✨ Features

- 📁 **Local Video Streaming**: Stream videos from your local videos folder
- 🎬 **YouTube Integration**: Stream YouTube videos with smart search functionality
- 📺 **YouTube Live Streams**: Direct streaming support for YouTube live content
- 🟣 **Twitch Support**: Stream Twitch live streams and video-on-demand (VODs)
- 🔗 **Direct URL Streaming**: Stream from any URL supported by [yt-dlp](https://github.com/yt-dlp/yt-dlp) (thousands of video sites including Vimeo, Dailymotion, Facebook, Instagram, news sites, and more)
- 🎵 **Queue System**: Queue multiple videos with auto-play and skip functionality
- 🌐 **Web Management Interface**: Full-featured web dashboard for video library management
- 📤 **Video Upload**: Upload videos through the web interface or download from remote URLs
- 🖼️ **Video Previews**: Generate and view thumbnail previews for all videos
- ⚙️ **Runtime Configuration**: Adjust streaming parameters and bot settings during runtime

## 📋 Requirements

- **[Bun](https://bun.sh/) v1.1.39+** (recommended) or **[Node.js](https://nodejs.org/) v21+**
- **[FFmpeg](https://www.ffmpeg.org/)** (the bot will attempt to install it automatically if missing, but manual installation is recommended)
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** (automatically downloaded and updated by the bot)

### 💡 Optional
- 🎮 **GPU with hardware acceleration** for improved streaming performance
- 🌐 **High-speed internet** for remote video streaming and downloads
- 💾 **Sufficient disk space** for video storage and cache

## 🚀 Installation

This project is [hosted on GitHub](https://github.com/ysdragon/StreamBot).

1. **Clone the repository:**
```bash
git clone https://github.com/ysdragon/StreamBot
cd StreamBot
```

2. **Install dependencies:**

With Bun (recommended):
```bash
bun install
```

With npm:
```bash
npm install
```

3. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Update the configuration values (see [⚙️ Configuration](#%EF%B8%8F-configuration) section)
   - See the [wiki](https://github.com/ysdragon/StreamBot/wiki/Get-Discord-user-token) for instructions on obtaining your Discord token

4. **Setup complete!** 🎉 Required directories for videos and cache will be created automatically on first run.

## 🎮 Usage

### 🚀 Starting the Bot

**With Bun (recommended):**
```bash
bun run start
```

**With Node.js:**
```bash
npm run build
npm run start:node
```

**With web interface enabled:**
Set `SERVER_ENABLED=true` in your `.env` file. The web interface runs alongside the bot automatically.

To run only the web interface without the bot:
```bash
bun run server       # With Bun
npm run server:node  # With Node.js (after building)
```

### 📹 Video Playback

All videos are played through a queue system that automatically advances to the next video when the current one ends.

The `play` command automatically detects the input type:
- 📁 Local files from your `VIDEOS_DIR`
- 🎬 YouTube videos (by URL or search query)
- 🟣 Twitch streams (live or VOD)
- 🔗 Any URL supported by yt-dlp

Use `ytsearch` to find YouTube videos, then `play` with the results to stream them. Use `list` to browse your local video collection.

## 🐳 Docker Setup

StreamBot provides ready-to-use Docker configurations for easy deployment.

### 📦 Standard Deployment

1. **Create project directory:**
```bash
mkdir streambot && cd streambot
```

2. **Download Docker Compose configuration:**
```bash
wget https://raw.githubusercontent.com/ysdragon/StreamBot/main/docker-compose.yml
```

3. **Configure environment:**
   - Edit `docker-compose.yml` to set your environment variables
   - Ensure video storage directories are properly mounted

4. **Launch StreamBot:**
```bash
docker compose up -d
```

### ☁️ Cloudflare WARP Deployment

For enhanced network capabilities with Cloudflare WARP:

1. **Download WARP configuration:**
```bash
wget https://raw.githubusercontent.com/ysdragon/StreamBot/main/docker-compose-warp.yml
```

2. **Configure WARP settings:**
   - Add your WARP license key to `docker-compose-warp.yml`
   - Update Discord token and other required environment variables

3. **Launch with WARP:**
```bash
docker compose -f docker-compose-warp.yml up -d
```

> ⚠️ **Note:** The web interface is not available in WARP mode because the WARP container uses network isolation that prevents external access to the web server port.

## 🎯 Commands

### 📺 Playback Commands

| Command | Description | Aliases |
|---------|-------------|---------|
| `play <video_name\|url\|search_query>` | Play local video, URL, or search YouTube videos | |
| `ytsearch <query>` | Search for videos on YouTube | |
| `stop` | Stop current video playback and clear queue | `leave`, `s` |
| `skip` | Skip the currently playing video | `next` |
| `queue` | Display the current video queue | |
| `list` | Show available local videos | |

### 🔧 Utility Commands

| Command | Description | Aliases |
|---------|-------------|---------|
| `status` | Show current streaming status | |
| `preview <video_name>` | Generate preview thumbnails for a video | |
| `ping` | Check bot latency | |
| `help` | Show available commands | |

### 🛡️ Administration Commands

| Command | Description | Aliases |
|---------|-------------|---------|
| `config [parameter] [value]` | View or adjust bot configuration parameters (Admin only) | `cfg`, `set` |

## ⚙️ Configuration

StreamBot is configured through environment variables in a `.env` file. Copy `.env.example` to `.env` and modify the values as needed.

### 🔐 Discord Self-Bot Configuration

```bash
# Required: Your Discord self-bot token
# See: https://github.com/ysdragon/StreamBot/wiki/Get-Discord-user-token
TOKEN="YOUR_BOT_TOKEN_HERE"

# Command prefix for bot commands
PREFIX="$"

# Discord server where the bot will operate
GUILD_ID="YOUR_SERVER_ID"

# Channel where bot will respond to commands
COMMAND_CHANNEL_ID="COMMAND_CHANNEL_ID"

# Voice/video channel where bot will stream
VIDEO_CHANNEL_ID="VIDEO_CHANNEL_ID"

# Admin user IDs - comma-separated or JSON array format
# Examples:
#   ADMIN_IDS="123456789,987654321"
#   ADMIN_IDS=["123456789","987654321"]
ADMIN_IDS=["YOUR_USER_ID_HERE"]
```

### 📁 File Management

```bash
# Directory where video files are stored
VIDEOS_DIR="./videos"

# Directory for caching video preview thumbnails
PREVIEW_CACHE_DIR="./tmp/preview-cache"
```

### 🍪 Content Source Configuration

```bash
# Path to browser cookies for accessing private/premium content
# Supports: YouTube Premium, age-restricted content, private videos
YTDLP_COOKIES_PATH=""
```

### 🎥 Streaming Configuration

```bash
# Video Quality Settings
STREAM_RESPECT_VIDEO_PARAMS="false"  # Use original video parameters if true
STREAM_WIDTH="1280"                  # Output resolution width
STREAM_HEIGHT="720"                  # Output resolution height
STREAM_FPS="30"                      # Target frame rate

# Bitrate Settings (affects quality and bandwidth usage)
STREAM_BITRATE_KBPS="2000"           # Target bitrate (higher = better quality)
STREAM_MAX_BITRATE_KBPS="2500"       # Maximum allowed bitrate

# Performance & Encoding
STREAM_HARDWARE_ACCELERATION="false" # Use GPU acceleration if available
STREAM_VIDEO_CODEC="H264"            # Codec: H264, H265, VP8, VP9, AV1

# H.264/H.265 Encoding Preset (quality vs speed tradeoff)
# Options: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
STREAM_H26X_PRESET="ultrafast"
```

### 🌐 Web Interface Configuration

```bash
# Enable/disable the web management interface
SERVER_ENABLED="false"

# Web interface authentication
SERVER_USERNAME="admin"
SERVER_PASSWORD="admin"  # Plain text, bcrypt, or argon2 hash

# Web server port
SERVER_PORT="8080"
```

### 🍪 Using Cookies with yt-dlp

To access private or premium content (like YouTube Premium videos), you can provide a cookies file:

1. **Export cookies from your browser** using a browser extension:
   - [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) (Chromium-based browsers)
   - [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/) (Firefox-based browsers)

2. **Save the cookies file** (usually named `cookies.txt`) to a location accessible by the bot

3. **Configure the path** in your `.env` file:
   ```bash
   YTDLP_COOKIES_PATH="./cookies.txt"
   ```
   Or use the config command at runtime:
   ```
   $config ytdlpCookiesPath ./cookies.txt
   ```

4. **Restart the bot** if you updated the `.env` file

## 🌐 Web Interface

When enabled (`SERVER_ENABLED="true"`), StreamBot provides a web-based management interface.

### ✨ Features

- 📋 **Video Library Management**: Browse your video collection with file sizes and detailed information
- 📤 **Local File Upload**: Upload videos directly with progress tracking
- 🌐 **Remote URL Download**: Download videos from URLs directly to your library
- 🖼️ **Video Previews**: Generate and view thumbnail screenshots from different parts of each video
- 🗑️ **File Management**: Delete videos from your library
- 📊 **Video Metadata**: View detailed information (duration, resolution, codec, etc.)

### 🔗 Access

After enabling and restarting the bot, access the interface at `http://localhost:8080` (or your configured `SERVER_PORT`).

## 🤝 Contributing

Contributions are welcome! Feel free to:
- 🐛 Report bugs via [issues](https://github.com/ysdragon/StreamBot/issues/new)
- 🔧 Submit [pull requests](https://github.com/ysdragon/StreamBot/pulls)
- 💡 Suggest new features

## ⚠️ Disclaimer

This bot may violate Discord's Terms of Service. Use at your own risk.

I disavow before Allah any unethical use of this project.

إبراء الذمة: أتبرأ من أي استخدام غير أخلاقي لهذا المشروع أمام الله.

## 📝 License

Licensed under MIT License. See [LICENSE](https://github.com/ysdragon/StreamBot/blob/main/LICENSE) for details.
