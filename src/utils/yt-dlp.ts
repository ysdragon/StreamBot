import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import nodePath from "node:path";
import process from "node:process";
import os from "node:os";
import crypto from "node:crypto";
import got from "got";
import { YTFlags } from "../@types/index.js";
import logger from "./logger.js";
import { spawn } from "bun";

let determinedFilename: string;
const platform = process.platform;
const arch = process.arch;

if (platform === "win32") {
    if (arch === "x64") {
        determinedFilename = "yt-dlp.exe";
    }
    else if (arch === "ia32") {    
        determinedFilename = "yt-dlp_x86.exe";
    }
} else if (platform === "darwin") {
    determinedFilename = "yt-dlp_macos";
} else if (platform === "linux") {
    if (arch === "arm64") {
        determinedFilename = "yt-dlp_linux_aarch64";
    } else if (arch === "arm") {
        determinedFilename = "yt-dlp_linux_armv7l";
    } else if (arch === "x64") {
        determinedFilename = "yt-dlp";
    } else {
        logger.warn(`Unsupported Linux architecture '${arch}' for yt-dlp. Falling back to generic 'yt-dlp'. Download might fail.`);
        determinedFilename = "yt-dlp";
    }
} else {
    logger.warn(`Unsupported OS '${platform}' for yt-dlp. Attempting to use generic 'yt-dlp'. Download might fail.`);
    determinedFilename = "yt-dlp";
}

const filename = determinedFilename;
const scriptsPath = nodePath.resolve(process.cwd(), "scripts");
const exePath = nodePath.resolve(scriptsPath, filename);

function args(url: string, options: Partial<YTFlags>): string[] {
    const optArgs: string[] = [];
    for (const [key, val] of Object.entries(options)) {
        if (val === null || val === undefined) {
            continue;
        }

        const flag = key.replaceAll(/[A-Z]/gu, ms => `-${ms.toLowerCase()}`);

        if (typeof val === "boolean") {
            if (val) {
                optArgs.push(`--${flag}`);
            } else {
                optArgs.push(`--no-${flag}`);
            }
        } else {
            optArgs.push(`--${flag}`);
            optArgs.push(String(val));
        }
    }
    return [url, ...optArgs];
}

function json(str: string) {
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
}

export async function downloadExecutable() {
    if (!existsSync(exePath)) {
        logger.info("Yt-dlp couldn't be found, trying to download...");
        const releases = await got.get("https://api.github.com/repos/yt-dlp/yt-dlp/releases?per_page=1").json();
        const release = releases[0];
        const asset = release.assets.find(ast => ast.name === filename);
        await new Promise((resolve, reject) => {
            got.get(asset.browser_download_url).buffer().then(x => {
                mkdirSync(scriptsPath, { recursive: true });
                writeFileSync(exePath, x, { mode: 0o777 });
                return 0;
            }).then(resolve).catch(reject);
        });
        logger.info("Yt-dlp has been downloaded.");
    }
}

export function exec(url: string, options: Partial<YTFlags> = {}, spawnOptions: Record<string, any> = {}) {
    return spawn([exePath, ...args(url, options)], {
        windowsHide: true,
        ...spawnOptions,
        stdio: ["ignore", "pipe", "pipe"]
    });
}

export default async function ytdl(url: string, options: Partial<YTFlags> = {}, spawnOptions: Record<string, any> = {}) {
    let data = "";
    let errorData = "";

    const proc = exec(url, options, spawnOptions);

    if (proc.stdout) {
        const reader = proc.stdout.getReader();
        const decoder = new TextDecoder();
        let result = await reader.read();
        while (!result.done) {
            data += decoder.decode(result.value, { stream: true });
            result = await reader.read();
        }
        data += decoder.decode();
    }

    if (proc.stderr) {
        const reader = proc.stderr.getReader();
        const decoder = new TextDecoder();
        let result = await reader.read();
        while (!result.done) {
            errorData += decoder.decode(result.value, { stream: true });
            result = await reader.read();
        }
        errorData += decoder.decode();
    }

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
        logger.error(`yt-dlp process exited with code ${exitCode}. Stderr: ${errorData}`);
        throw new Error(`yt-dlp failed with exit code ${exitCode}: ${errorData || data}`);
    }

    return json(data);
}

export async function downloadToTempFile(url: string, options: Partial<YTFlags> = {}): Promise<string> {
    await downloadExecutable();

    const tempDir = os.tmpdir();
    const tempFilename = `ytdlp_temp_${crypto.randomBytes(6).toString('hex')}.mp4`;
    const tempFilePath = nodePath.join(tempDir, tempFilename);

    const downloadOptions: Partial<YTFlags> = {
        ...options,
        output: tempFilePath,
        quiet: true,
        noWarnings: true,
    };

    const proc = spawn([exePath, ...args(url, downloadOptions)], {
        windowsHide: true,
        stdio: ["ignore", "ignore", "pipe"]
    });

    let errorData = "";
    if (proc.stderr) {
        const reader = proc.stderr.getReader();
        const decoder = new TextDecoder();
        let result = await reader.read();
        while (!result.done) {
            errorData += decoder.decode(result.value, { stream: true });
            result = await reader.read();
        }
        errorData += decoder.decode();
    }

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
        if (existsSync(tempFilePath)) {
            try {
                unlinkSync(tempFilePath);
            } catch (cleanupError) {
                logger.warn(`Failed to cleanup temp file ${tempFilePath} after yt-dlp error:`, cleanupError);
            }
        }
        const errorMessage = `yt-dlp failed to download to temp file. Exit code: ${exitCode}. Stderr: ${errorData.trim()}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
    }

    if (!existsSync(tempFilePath)) {
        const errorMessage = `yt-dlp exited successfully but temp file ${tempFilePath} was not created. Stderr: ${errorData.trim()}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
    }
    
    logger.info(`yt-dlp successfully downloaded to temp file: ${tempFilePath}`);
    return tempFilePath;
}

export async function checkForUpdatesAndUpdate(): Promise<void> {
    try {
        await downloadExecutable();
        const updateProc = spawn([exePath, "--update"], {
            stdio: ["ignore", "pipe", "pipe"],
        });

        let stdoutData = "";
        let stderrData = "";

        if (updateProc.stdout) {
            const stdoutReader = updateProc.stdout.getReader();
            const decoder = new TextDecoder();
            let result = await stdoutReader.read();
            while (!result.done) {
                stdoutData += decoder.decode(result.value, { stream: true });
                result = await stdoutReader.read();
            }
            stdoutData += decoder.decode();
        }

        if (updateProc.stderr) {
            const stderrReader = updateProc.stderr.getReader();
            const decoder = new TextDecoder();
            let result = await stderrReader.read();
            while (!result.done) {
                stderrData += decoder.decode(result.value, { stream: true });
                result = await stderrReader.read();
            }
            stderrData += decoder.decode();
        }

        const exitCode = await updateProc.exited;

        if (exitCode === 0) {
            if (stdoutData.includes("Updated yt-dlp to")) {
                logger.info(`yt-dlp updated successfully. Output: ${stdoutData.trim()}`);
            }
        } else {
            logger.warn(`yt-dlp update check failed or an update was not straightforward. Exit code: ${exitCode}.`);
            if (stdoutData.trim()) logger.warn(`yt-dlp update stdout: ${stdoutData.trim()}`);
            if (stderrData.trim()) logger.error(`yt-dlp update stderr: ${stderrData.trim()}`);
        }
    } catch (error) {
        logger.error("Error during yt-dlp update check process:", error);
    }
}