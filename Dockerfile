# Use the official nodejs 22 debian bookworm slim as the base image
FROM ubuntu:22.04

# Set the working directory
WORKDIR /streambot

RUN apt-get update && apt-get install -y curl

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -

# Install important deps and clean cache
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    ffmpeg \
    nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
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