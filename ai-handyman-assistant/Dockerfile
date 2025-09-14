FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    sox \
    ffmpeg

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm install -g typescript

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Create media directory for RTMP
RUN mkdir -p /app/media

# Expose ports
EXPOSE 3000 1935 8000 8001

# Set environment
ENV NODE_ENV=production

# Start application
CMD ["node", "dist/index.js"]