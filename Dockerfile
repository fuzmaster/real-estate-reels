# Real Estate Reels - production backend container
# This runs the Express API + static Vite frontend + Remotion renderer.

FROM node:20-bookworm-slim

WORKDIR /app

# Remotion/Chromium/FFmpeg runtime dependencies.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV CHROME_PATH=/usr/bin/chromium
ENV DISABLE_AUTO_OPEN=1

# Install root deps first for better Docker layer caching.
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Install client deps and build frontend.
COPY client/package*.json ./client/
# The client build runs TypeScript/Vite, so devDependencies must be present
# even though the final container still runs with NODE_ENV=production.
RUN npm ci --prefix client --include=dev || npm install --prefix client --include=dev
COPY client ./client
RUN npm run build --prefix client

# Install Remotion deps.
COPY remotion/package*.json ./remotion/
RUN npm ci --prefix remotion || npm install --prefix remotion
COPY remotion ./remotion

# Copy server and remaining root files.
COPY server.js ./server.js
COPY README.md ./README.md
COPY ROADMAP.md ./ROADMAP.md

# Render/Railway can mount persistent storage here.
RUN mkdir -p /var/data/assets/Projects /var/data/outputs /app/remotion/public/Projects

ENV DATA_ROOT=/var/data
ENV ASSETS_ROOT=/var/data/assets
ENV OUTPUT_ROOT=/var/data/outputs
ENV REMOTION_PROJECT=/app/remotion

EXPOSE 3000

CMD ["node", "server.js"]
