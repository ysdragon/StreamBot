import { Router } from 'express';
import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import config from '../../config.js';
import logger from '../../utils/logger.js';
import { upload } from '../middleware/multer.js';

const router = Router();
const agent = new https.Agent({ rejectUnauthorized: false });

// Upload route - local file with progress support
router.post("/api/upload", upload.single("file"), (req, res) => {
 	res.json({
 		success: true,
 		message: "File uploaded successfully",
 		filename: req.file.filename,
 		size: req.file.size
 	});
 });

// Upload route - remote file with progress support
router.post("/api/remote_upload", upload.single("link"), async (req, res) => {
 	const link = req.body.link;
 	const filename = link.substring(link.lastIndexOf('/') + 1);
 	const filepath = path.join(config.videosDir, filename);

 	try {
 		// First, get the file info to determine size
 		const headResponse = await axios.head(link, { httpsAgent: agent });
 		const totalSize = parseInt(headResponse.headers['content-length'], 10);

 		// Set up progress tracking
 		let downloaded = 0;
 		let lastProgressSent = 0;

 		const response = await axios.get(link, {
 			responseType: "stream",
 			httpsAgent: agent,
 			onDownloadProgress: (progressEvent) => {
 				downloaded = progressEvent.loaded;
 				const percentCompleted = Math.round((downloaded * 100) / totalSize);

 				// Send progress updates every 2%
 				if (percentCompleted - lastProgressSent >= 2) {
 					lastProgressSent = percentCompleted;
 					logger.info(`Remote download progress: ${percentCompleted}%`);
 				}
 			}
 		});

 		const writer = fs.createWriteStream(filepath);

 		response.data.on('data', (chunk) => {
 			downloaded += chunk.length;
 			const percentCompleted = Math.round((downloaded * 100) / totalSize);

 			// Send progress updates every 2%
 			if (percentCompleted - lastProgressSent >= 2) {
 				lastProgressSent = percentCompleted;
 				logger.info(`Remote download progress: ${percentCompleted}%`);
 			}
 		});

 		response.data.pipe(writer);

 		writer.on("finish", () => {
 			res.json({
 				success: true,
 				message: "Remote file downloaded successfully",
 				filename: filename,
 				size: downloaded
 			});
 		});

 		writer.on("error", (err) => {
 			logger.error(err);
 			res.status(500).json({ success: false, message: "Error downloading file" });
 		});
 	} catch (err) {
 		logger.error(err);
 		res.status(500).json({ success: false, message: "Error downloading file" });
 	}
 });

export default router;