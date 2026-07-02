# Backend image with Chromium so live WhatsApp Web (Puppeteer) works on Railway.
FROM node:20-slim

# Chromium + the shared libraries WhatsApp Web (Puppeteer) needs to launch it.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
      fonts-liberation \
      libnss3 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdrm2 libgbm1 \
      libasound2 libpangocairo-1.0-0 libxcomposite1 libxdamage1 libxfixes3 \
      libxrandr2 libxkbcommon0 libx11-xcb1 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Use the system Chromium instead of Puppeteer's own download.
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Railway sets PORT; the app reads process.env.PORT.
EXPOSE 8080
CMD ["node", "src/index.js"]
