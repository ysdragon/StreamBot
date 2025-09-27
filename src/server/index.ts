import express from "express";
import session from "express-session";
import expressLayouts from "express-ejs-layouts";
import path from "path";
import fs from "fs";
import config from "../config.js";
import logger from "../utils/logger.js";
import { stringify, prettySize } from "./utils/helpers.js";

// Import middleware
import { requireAuth } from "./middleware/auth.js";

// Import route handlers
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import uploadRoutes from "./routes/upload.js";
import previewRoutes from "./routes/preview.js";

const app = express();

// Configure EJS templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src/server/views'));

// Use express-ejs-layouts
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({
	secret: 'streambot-2024',
	resave: false,
	saveUninitialized: true,
	cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Serve static files from public directory
app.use(express.static(path.join(process.cwd(), 'src/server/public')));

// Make helper functions available to all templates
app.use((req, res, next) => {
	res.locals.stringify = stringify;
	res.locals.prettySize = prettySize;
	next();
});

// Apply authentication middleware to all routes except login
app.use(requireAuth);

// Routes
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', uploadRoutes);
app.use('/', previewRoutes);

// Create necessary directories
if (!fs.existsSync(config.videosDir)) {
	fs.mkdirSync(config.videosDir);
}

if (!fs.existsSync(path.dirname(config.previewCacheDir))) {
	fs.mkdirSync(path.dirname(config.previewCacheDir), { recursive: true });
}

if (!fs.existsSync(config.previewCacheDir)) {
	fs.mkdirSync(config.previewCacheDir);
}

// Start server
app.listen(config.server_port, () => {
	logger.info(`Server is running on port ${config.server_port}`);
});

export default app;