<div align="center">

<img src="assets/logo.svg" alt="StreamBot Logo" width="400" height="120"/>

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
- [⚙️ Configuration](#-configuration)
- [🌐 Web Interface](#-web-interface)
- [🤝 Contributing](#-contributing)
- [⚠️ Legal](#-legal)
- [📝 License](#-license)

## ✨ Features

- 📁 **Local Video Streaming**: Stream videos from your local videos folder
- 🎬 **YouTube Integration**: Stream YouTube videos with smart search functionality
- 🔗 **YouTube Live Streams**: Direct streaming support for YouTube live content
- 🌐 **Twitch Support**: Stream Twitch live streams and video-on-demand (VODs)
- 🔗 **Direct URL Streaming**: Stream from any URL supported by yt-dlp (thousands of video sites including Vimeo, Dailymotion, Facebook, Instagram, news sites, and more)
- 🎵 **Queue System**: Queue multiple videos with auto-play and skip functionality
- 🌐 **Web Management Interface**: Full-featured web dashboard for video library management
- 📤 **Video Upload**: Upload videos through the web interface or download from remote URLs
- 🖼️ **Video Previews**: Generate and view thumbnail previews for all videos
- ⚙️ **Runtime Configuration**: Adjust streaming parameters and bot settings during runtime

## 📋 Requirements

### Runtime Requirements
- **[Bun](https://bun.sh/) `v1.1.39+`** (recommended) or **[Node.js](https://nodejs.org/) `v21+`**
- **[FFmpeg](https://www.ffmpeg.org/)** (automatically installed by the bot if missing)

### System Recommendations
- **GPU with hardware acceleration** (optional, for improved streaming performance)
- **High-speed internet** (for remote video streaming and downloads)
- **Sufficient disk space** (for video storage and cache)

## 🚀 Installation

This project is [hosted on GitHub](https://github.com/ysdragon/StreamBot).

### Prerequisites
- **Bun** `v1.1.39+` (recommended) or **Node.js** `v21+`
- **FFmpeg** (automatically installed by the bot if missing)
- **yt-dlp** (automatically downloaded and updated by the bot)

### Installation Steps

1. **Clone the repository:**
```bash
git clone https://github.com/ysdragon/StreamBot
cd StreamBot
```

2. **Install dependencies:**
```bash
bun install
```

3. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Update the configuration values in `.env` (see [Configuration](#configuration) section below)

4. **Setup complete!**
   - The bot will automatically download and update yt-dlp on first run
   - Required directories for videos and cache will be created automatically

## 🎮 Usage

### 🚀 Starting the Bot

**With Bun (recommended):**
```bash
bun run start
```

**With Node.js:**
```bash
bun run build
bun run start:node
```

**With web interface:**
```bash
bun run server    # Start only the web interface
```

### 📹 Video Playback

**Queue System:** All videos are played through an intelligent queue system that automatically advances to the next video when the current one ends.

**Smart Detection:** The `play` command automatically detects the type of input:
- Local files (in your `VIDEOS_DIR`)
- YouTube videos (by URL or search)
- Twitch streams (live or VOD)
- Any URL supported by yt-dlp

### 🔍 Content Discovery

**YouTube Search:** Use `ytsearch` to find videos, then `play` with the search results to stream them.

**Local Library:** Use `list` to browse your local video collection with file information.

### Video Sources

StreamBot supports multiple video sources:

- **Local Videos**: Store videos in your `VIDEOS_DIR` folder and use `play <filename>`
- **Smart Play**: Use `play <input>` for automatic detection and streaming (local file, YouTube video, Twitch stream, or any URL supported by yt-dlp)
- **YouTube Search**: Use `ytsearch <query>` to search YouTube and display results (use `play` with search results to stream)
- **Live Streams**: Full support for YouTube Live streams and Twitch live content
- **Video Queue**: All playback goes through a queue system - videos are added to queue and played sequentially

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

### 🌐 Cloudflare WARP Deployment (Advanced)

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

> **⚠️ Note:** The web interface may have limited functionality when using WARP configuration.


## 🎯 Commands

### 📺 Playback Commands

| Command | Description | Aliases |
|---------|-------------|---------|
| `play <input>` | Smart play: local video, URL, or YouTube search | |
| `ytsearch <query>` | Search YouTube and display results | |
| `stop` | Stop current playback and leave voice channel | `leave`, `s` |
| `skip` | Skip to next video in queue | `next` |
| `queue` | Display current video queue with playback status | |
| `list` | Show local video library with file information | |

### 🔧 Utility Commands

| Command | Description | Aliases |
|---------|-------------|---------|
| `status` | Show detailed playback status and system information | |
| `preview <video>` | Generate 5 thumbnail previews for specified video | |
| `ping` | Check bot latency and response time | |
| `help [command]` | Show available commands or detailed help for specific command | |

### ⚙️ Administration Commands

| Command | Description | Aliases |
|---------|-------------|---------|
| `config [parameter] [value]` | View or modify bot configuration (Admin only) | `cfg`, `set` |

## ⚙️ Configuration

StreamBot is configured through environment variables in a `.env` file. Copy `.env.example` to `.env` and modify the values as needed.

### 🔐 Discord Self-Bot Configuration

```bash
# Required: Your Discord self-bot token (see wiki for setup instructions)
TOKEN = "YOUR_BOT_TOKEN_HERE"

# Command prefix for bot commands
PREFIX = "$"

# Discord server where the bot will operate
GUILD_ID = "YOUR_SERVER_ID"

# Channel where bot will respond to commands
COMMAND_CHANNEL_ID = "COMMAND_CHANNEL_ID"

# Voice/video channel where bot will stream
VIDEO_CHANNEL_ID = "VIDEO_CHANNEL_ID"

# Admin user IDs (comma-separated or JSON array)
ADMIN_IDS = ["YOUR_USER_ID_HERE"]
```

### 📁 File Management

```bash
# Directory where video files are stored
VIDEOS_DIR = "./videos"

# Directory for caching video preview thumbnails
PREVIEW_CACHE_DIR = "./tmp/preview-cache"
```

### 🌐 Content Source Configuration

```bash
# Path to browser cookies for accessing private/premium content
# Supports: YouTube Premium, age-restricted content, private videos
YTDLP_COOKIES_PATH = ""
```

### 🎥 Streaming Configuration

```bash
# Video Quality Settings
STREAM_RESPECT_VIDEO_PARAMS = "false"  # Use original video parameters if true
STREAM_WIDTH = "1280"                  # Output resolution width
STREAM_HEIGHT = "720"                  # Output resolution height
STREAM_FPS = "30"                      # Target frame rate

# Bitrate Settings (affects quality and bandwidth usage)
STREAM_BITRATE_KBPS = "2000"           # Target bitrate (higher = better quality)
STREAM_MAX_BITRATE_KBPS = "2500"       # Maximum allowed bitrate

# Performance & Encoding
STREAM_HARDWARE_ACCELERATION = "false" # Use GPU acceleration if available
STREAM_VIDEO_CODEC = "H264"            # Codec: H264, H265, VP8, VP9, AV1

# H.264/H.265 Encoding Preset (quality vs speed tradeoff)
# Options: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
STREAM_H26X_PRESET = "ultrafast"
```

### 🌐 Web Interface Configuration

```bash
# Enable/disable the web management interface
SERVER_ENABLED = "false"

# Web interface authentication
SERVER_USERNAME = "admin"
SERVER_PASSWORD = "admin"  # Plain text or bcrypt hash

# Web server port
SERVER_PORT = "8080"
```

### Using Cookies with yt-dlp

To access private, or premium content (like YouTube Premium videos), you can provide a cookies file to yt-dlp:

1. **Export cookies from your browser** using a browser extension like:
   - [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) (Chromium based browsers)
   - [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/) (Firefox based browsers)

2. **Save the cookies file** (usually named `cookies.txt`) to a location accessible by the bot

3. **Configure the path** in one of two ways:
   - Set `YTDLP_COOKIES_PATH` in your `.env` file:
     ```bash
     YTDLP_COOKIES_PATH = "./cookies.txt"
     ```
   - Or use the config command while the bot is running:
     ```
     $config ytdlpCookiesPath ./cookies.txt
     ```

4. **Restart the bot** if you updated the `.env` file

The cookies will be automatically used for all yt-dlp operations, allowing access to restricted content.

## Get Token ?
Check the [Get token wiki](https://github.com/ysdragon/StreamBot/wiki/Get-Discord-user-token)

## 🌐 Web Interface

When enabled by setting `SERVER_ENABLED=true` in your `.env` file, StreamBot provides a comprehensive web-based management interface for seamless video library control.

### ✨ Features

- 📋 **Video Library Management**: Browse your video collection with file sizes and detailed information
- 📤 **Local File Upload**: Upload videos directly through the web interface with progress tracking
- 🌐 **Remote URL Download**: Download videos from remote URLs directly to your library with progress tracking
- 🖼️ **Video Previews**: Generate and view 5 thumbnail screenshots from different parts of each video
- 🗑️ **File Management**: Delete videos from your library through the web interface
- 📊 **Video Metadata**: View detailed information about video files (duration, resolution, codec, etc.)

### 🔧 Setup

1. **Enable the web server:**
   ```bash
   SERVER_ENABLED=true
   ```

2. **Configure authentication:**
   ```bash
   SERVER_USERNAME=your_username
   SERVER_PASSWORD=your_password  # Plain text or bcrypt hash
   SERVER_PORT=8080
   ```

3. **Restart the bot** to apply changes

4. **Access the interface** at `http://localhost:SERVER_PORT`

### 🎯 Usage

- **Dashboard**: Overview of all videos in your library with file sizes
- **Upload**: Choose local files or provide remote URLs for download
- **Preview**: Click on any video to generate and view thumbnail previews
- **Delete**: Remove unwanted videos from your library

## 🤝 Contributing
Contributions are welcome! Feel free to:
- 🐛 Report bugs via [issues](https://github.com/ysdragon/StreamBot/issues/new)
- 🔧 Submit [pull requests](https://github.com/ysdragon/StreamBot/pulls)
- 💡 Suggest new features

## ⚠️ Legal

This bot may violate Discord's ToS. Use at your own risk.

## ⚠️ Disclaimer

I disclaim any unethical use of this project before God.

إبراء الذمة: أتبرأ من أي استخدام غير أخلاقي لهذا المشروع أمام الله.

## 📝 License

Licensed under MIT License. See [LICENSE](https://github.com/ysdragon/StreamBot/blob/main/LICENSE) for details.
