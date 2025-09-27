import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import config from '../../config.js';
import logger from '../../utils/logger.js';
import { ffmpegScreenshot } from '../../utils/ffmpeg.js';
import { stringify } from '../utils/helpers.js';

const router = Router();

// Preview route
router.get("/preview/:file", (req, res) => {
	const file = req.params.file;
	if (!fs.existsSync(path.join(config.videosDir, file))) {
		res.status(404).send("Not Found");
		return;
	}

	ffmpeg.ffprobe(`${config.videosDir}/${file}`, (err, metadata) => {
		if (err) {
			logger.error(err);
			res.status(500).send("Internal Server Error");
			return;
		}

		// Generate preview images
		const previews = [];
		for (let i = 1; i <= 5; i++) {
			previews.push(`/api/preview/${file}/${i}`);
		}

		res.render('pages/preview', {
			filename: file,
			metadata: metadata,
			previews: previews,
			showLogout: true
		});
	});
});

// Generate preview of video file using ffmpeg, cache it to previewCache and serve it
router.get("/api/preview/:file/:id", async (req, res) => {
	const file = req.params.file;
	const id = parseInt(req.params.id, 10);

	// id should be 1, 2, 3, 4 or 5
	if (id < 1 || id > 5) {
		res.status(404).send("Not Found");
		return;
	}

	// check if preview exists
	const previewFile = path.resolve(config.previewCacheDir, `${file}-${id}.jpg`);
	if (fs.existsSync(previewFile)) {
		res.sendFile(previewFile);
	} else {
		try {
			await ffmpegScreenshot(file);
		} catch (err) {
			logger.error(err);
			res.status(500).send("Internal Server Error");
			return;
		}
		res.sendFile(previewFile);
	}
});

// Delete route
router.get("/delete/:file", (req, res) => {
	const file = req.params.file;
	const filePath = path.join(config.videosDir, file);

	if (fs.existsSync(filePath)) {
		fs.unlink(filePath, (err) => {
			if (err) {
				logger.error(err);
				res.status(500).send("Internal Server Error");
			} else {
				res.redirect("/");
			}
		});
	} else {
		res.status(404).send("Not Found");
	}
});

export default router;