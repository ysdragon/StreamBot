import winston from 'winston';

// Custom log format
const logFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	winston.format.colorize(),
	winston.format.printf(({ level, message, timestamp }) => {
		return `[${timestamp}] ${level}: ${message}`;
	})
);

// Create logger instance
const logger = winston.createLogger({
	level: 'info',
	format: logFormat,
	transports: [
		// Console output
		new winston.transports.Console()
	]
});

export default logger;
