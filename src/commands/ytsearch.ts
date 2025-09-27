import { BaseCommand } from "./base.js";
import { CommandContext } from "../types/index.js";
import { MediaService } from "../services/media.js";

export default class YTSearchCommand extends BaseCommand {
	name = "ytsearch";
	description = "Search for videos on YouTube";
	usage = "ytsearch <query>";

	private mediaService: MediaService;

	constructor() {
		super();
		this.mediaService = new MediaService();
	}

	async execute(context: CommandContext): Promise<void> {
		const query = context.args.join(' ');

		if (!query) {
			await this.sendError(context.message, 'Please provide a search query.');
			return;
		}

		try {
			const searchResults = await this.mediaService.searchYouTube(query);
			if (searchResults.length > 0) {
				await this.sendList(context.message, searchResults, "ytsearch");
			} else {
				await this.sendError(context.message, 'No videos found.');
			}
		} catch (error) {
			await this.sendError(context.message, 'Failed to search for videos.');
		}
	}
}