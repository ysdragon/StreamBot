import config from "../config.js";
import ffmpeg from "fluent-ffmpeg"

let ffmpegRunning: { [key: string]: boolean } = {};

export async function ffmpegScreenshot(video: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
        if (ffmpegRunning[video]) {
            // Wait for ffmpeg to finish
            let wait = (images: string[]) => {
                if (ffmpegRunning[video] == false) {
                    resolve(images);
                }
                setTimeout(() => wait(images), 100);
            }
            wait([]);
            return;
        }
        ffmpegRunning[video] = true;
        const ts = ['10%', '30%', '50%', '70%', '90%'];
        const images: string[] = [];

        const takeScreenshots = (i: number) => {
            if (i >= ts.length) {
                ffmpegRunning[video] = false;
                resolve(images);
                return;
            }
            console.log(`Taking screenshot ${i + 1} of ${video} at ${ts[i]}`);
            ffmpeg(`${config.videosDir}/${video}`)
                .on("end", () => {
                    const screenshotPath = `${config.previewCacheDir}/${video}-${i + 1}.jpg`;
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
                    folder: config.previewCacheDir,
                    size: "640x480"
                });
        };

        takeScreenshots(0);
    });
}

// Checking video params
export async function getVideoParams(videoPath: string): Promise<{ width: number, height: number, bitrate: string, maxbitrate: string, fps: number }> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                return reject(err);
            }

            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');

            if (videoStream && videoStream.width && videoStream.height && videoStream.bit_rate) {
                const rFrameRate = videoStream.r_frame_rate || videoStream.avg_frame_rate;

                if (rFrameRate) {
                    const [numerator, denominator] = rFrameRate.split('/').map(Number);
                    videoStream.fps = numerator / denominator;
                } else {
                    videoStream.fps = 0
                }

                resolve({ width: videoStream.width, height: videoStream.height, bitrate: videoStream.bit_rate, maxbitrate: videoStream.maxBitrate, fps: videoStream.fps });
            } else {
                reject(new Error('Unable to get Resolution.'));
            }
        });
    });
}

