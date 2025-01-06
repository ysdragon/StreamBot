# Use ubuntu 24.04 (noble) as the base image
FROM ubuntu:24.04

# Set the working directory
WORKDIR /home/bots/StreamBot

# Install minimal dependencies
RUN apt-get update && apt-get install -y curl ca-certificates unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install bun and add to PATH
ENV BUN_INSTALL="/usr/local/"
RUN curl -fsSL https://bun.sh/install | bash

# Install remaining dependencies and clean cache
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json
COPY package.json ./

# Install dependencies
RUN bun install

# Copy the rest of the application code
COPY . .

# Verify the application builds
RUN bun run build

# Specify the port number the container should expose
EXPOSE 3000

# Create videos folder
RUN mkdir -p ./videos

# Command to run the application
CMD ["bun", "run", "start"]