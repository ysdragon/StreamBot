import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import config from '../../config.js';
import logger from '../../utils/logger.js';
import { prettySize } from '../utils/helpers.js';

const router = Router();

// Main dashboard route
router.get("/", (req, res) => {
	fs.readdir(config.videosDir, (err, files) => {
		if (err) {
			logger.error(err);
			res.status(500).send("Internal Server Error");
			return;
		}

		const fileList = files.map((file) => {
			const stats = fs.statSync(path.join(config.videosDir, file));
			return { name: file, size: prettySize(stats.size) };
		});

		res.render('pages/dashboard', {
			files: fileList,
			showLogout: true
		});
	});
});


export default router;