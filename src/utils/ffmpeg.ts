import config from "../config";
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