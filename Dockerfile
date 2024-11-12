# Use the official nodejs 22 debian bookworm slim as the base image
FROM node:22.11-bookworm-slim

# Set the working directory
WORKDIR /home/bots/StreamBot

# Install important deps
RUN apt-get update && apt-get install -y -qq build-essential ffmpeg python3

# Clean cache
RUN apt clean --dry-run

# Install pnpm
RUN npm install pnpm -g

# Copy package.json
COPY package.json ./

# Install dependencies
RUN pnpm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN pnpm run build

# Specify the port number the container should expose
EXPOSE 3000

# Create videos folder
RUN mkdir -p ./videos

# Command to run the application
CMD ["pnpm", "run", "start"]