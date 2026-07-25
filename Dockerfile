# Step 1: Build React Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Step 2: Set up Python Runtime & ML Dependencies
FROM python:3.11-slim

# Install system dependencies (FFmpeg for audio processing & libsndfile)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements & code
COPY server/app.py ./server/app.py
RUN pip install --no-cache-dir \
    flask \
    flask-cors \
    requests \
    yt-dlp \
    ytmusicapi \
    librosa \
    numpy \
    soundfile \
    demucs \
    torch \
    torchaudio

# Copy built static frontend files into Flask static directory
COPY --from=frontend-builder /app/dist ./server/static

# Expose port (Cloud Run defaults to PORT environment variable, usually 8080 or 5000)
ENV PORT=8080
EXPOSE 8080

CMD ["python", "server/app.py"]
