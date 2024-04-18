# StreamBot

This is a Discord selfbot that allows streaming movies, videos, and streams from YouTube/Tiktok and direct links to a Discord voice channel.

## 🧐Features

- Stream movies/videos from a local folder.
- Stream and search for YouTube videos using titles.
- Stream (YouTube videos/live streams, Tiktok videos/live streams) by link.
- Stream arbitrary links (video files, live streams, etc.).
- Playback commands: play, playlink, ytplay, pause, resume, stop.
- List available movies.
- Refresh the movie list.
- Get playback status.

## Requirements
[node.js](https://nodejs.org/) _(version 16.9.0 or later)_  
[ffmpeg](https://www.ffmpeg.org/) _(must be added to path or installed to working directory)_

## 🛠️ Installation Steps:

This project is [hosted on github](https://github.com/ysdragon/StreamBot). You can clone this project directly using this command:

```
git clone https://github.com/ysdragon/StreamBot
```

Use [bun](https://bun.sh) to install all the dependencies:
```
bun install 
```

Build the artifacts from source:
```
bun run build
```

## Usage
Start the built artifacts:
```
bun run start
```

## 🛠️ Commands

```
play <movie name> - Play a movie from the local folder.
playlink <url> - Play a (YouTube video/live stream, TikTok video/live stream, direct link).
ytplay <query> - Play a YouTube video from a title query.
ytsearch <query> - Search for a YouTube video using a title query.
stop - Stop the current playback.
pause - Pause the current playback.
resume - Resume playback.
list - List available movies.
refresh - Refresh the movie list.
status - Get current playback status.
help - Show help message.
```

## 🛠️ Configuration

Configuration is done via `config.json`:

```json
{
  "token": "<user bot token>", // discord user token
  "prefix": "$", // bot prefix 
  "guildId": "<guild id (server id)>",
  "commandChannel": "<command channel id>",
  "videoChannel": "<voice channel id>",
  "adminIds": ["<admin id>"],
  "movieFolder": "<movies folder path>",
  "previewCache": "/tmp/preview-cache", // here you can set the preview thumbnails cache folder
  "streamOpts": {
    "width": 1920, // Resolution width
    "height": 1080, // Resolution height 
    "fps": 30,  // Stream fps
    "bitrateKbps": 8000, // Stream bitrate in kb
    "maxBitrateKbps": 2500, // An option to change the max bitrate value in the payload
    "hardware_acc": false, // Enable or disable stream hardware acceleration
    "videoCodec": "H264" // Stream/video codec can be set to either (H264), (H265) or (VP8)
  },
  "server": {
    "enabled": false, // if you want to enable the movies server
    "username": "admin", // here you can set the username
    "password": "admin",  // here you can set the password
    "port": 8080 // here you can set a port to listen the movies server site
  }
}
```

## Get Token ?
Check the [Get token wiki](https://github.com/ysdragon/StreamBot/wiki/Get-Discord-user-token)

## Server

An optional basic HTTP server can be enabled to manage the movie library:

- List movies
- Upload movies
- Delete movies
- Generate video preview thumbnails

Protected by HTTP basic auth.

## Todo

- [x]  Adding ytsearch and ytplay commands   
- [ ]  Play from torrents  

# Contributing
Public contributions are welcome!  
You can create a [new issue](https://github.com/ysdragon/StreamBot/issues/new) for bugs, or feel free to open a [pull request](https://github.com/ysdragon/StreamBot/pulls) for any and all your changes or work-in-progress features.


## Legal

This bot may violate Discord's Terms of Service. Use at your own risk.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
