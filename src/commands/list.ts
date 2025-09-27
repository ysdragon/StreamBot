import { BaseCommand } from "./base.js";
import { CommandContext, Video } from "../types/index.js";
import fs from 'fs';
import path from 'path';
import config from "../config.js";

export default class ListCommand extends BaseCommand {
	name = "list";
	description = "Show available local videos";
	usage = "list";

	async execute(context: CommandContext): Promise<void> {
		// Always refresh video list from filesystem
		const videoFiles = fs.readdirSync(config.videosDir);
		const refreshedVideos = videoFiles.map(file => {
			const fileName = path.parse(file).name;
			return { name: fileName, path: path.join(config.videosDir, file) };
		});

		// Update the videos array in context
		context.videos.length = 0;
		context.videos.push(...refreshedVideos);

		const videoList = refreshedVideos.map((video, index) => `${index + 1}. \`${video.name}\``);
		if (videoList.length > 0) {
			await this.sendList(context.message,
				[`(${refreshedVideos.length} videos found)`, ...videoList]);
		} else {
			await this.sendError(context.message, 'No videos found');
		}
	}
}