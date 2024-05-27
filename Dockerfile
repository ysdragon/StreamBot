# Use the official nodejs alpine image as the base image
FROM node:21-alpine3.18

# Set the working directory
WORKDIR /home/bun/app

# Install important deps
RUN apk --no-cache add --virtual .builds-deps build-base python3 gcompat

# Install bun
ADD https://github.com/oven-sh/bun/releases/latest/download/bun-linux-x64.zip bun-linux-x64.zip
RUN unzip bun-linux-x64.zip && chmod +x ./bun-linux-x64/bun && cp bun-linux-x64/bun /usr/local/bin/
RUN rm -rf bun-linux-x64.zip ./bun-linux-x64

# Copy package.json
COPY package.json ./

# Install dependencies
RUN bun install

# Copy the rest of the application code
COPY . .

# Build the application
RUN bun run build

# Specify the port number the container should expose
EXPOSE 3000

# Create Videos folder
RUN mkdir -p ./videos

# Command to run the application
CMD ["bun", "run", "start"]
