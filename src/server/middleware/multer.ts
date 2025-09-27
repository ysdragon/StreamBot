import multer, { StorageEngine } from 'multer';
import path from 'path';
import config from '../../config.js';

// Define the type for the file object
interface MulterFile extends Express.Multer.File {
	originalname: string;
}

// Configure multer storage
export const storage: StorageEngine = multer.diskStorage({
	destination: (req: Express.Request, file: MulterFile, cb: (error: Error | null, destination: string) => void) => {
		cb(null, config.videosDir);
	},
	filename: (req: Express.Request, file: MulterFile, cb: (error: Error | null, filename: string) => void) => {
		cb(null, file.originalname);
	},
});

// Create the multer upload instance
export const upload = multer({ storage });