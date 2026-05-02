# Watermark Removal Worker

This is the local GPU worker that processes video jobs queued by the backend.

## Prerequisites

- Python 3.10+
- Redis running on `localhost:6379`
- NVIDIA GPU with CUDA (recommended — CPU works but is very slow)
- ~3 GB free disk for AI models (downloaded once)
- `ffmpeg` in PATH for optimal output encoding (optional)

## Setup

```bash
cd worker

# Create virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# For CUDA (GPU) support, install the right torch for your CUDA version:
# CUDA 11.8: pip install torch==2.1.1 torchvision==0.16.1 --index-url https://download.pytorch.org/whl/cu118
# CUDA 12.1: pip install torch==2.1.1 torchvision==0.16.1 --index-url https://download.pytorch.org/whl/cu121
```

## Download Models (first run only)

```bash
python -m worker.models.download_models
```

Downloads ~2.5 GB to `~/.cache/watermark_remover/`.

## Running

```bash
python worker.py
```

The worker will:
1. Load Florence-2 and LaMA models into memory
2. Connect to Redis
3. Poll for jobs and process them automatically

Keep this terminal open while you want to process videos.

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `STORAGE_PATH` | `/tmp/watermark_remover/videos` | Where the backend saves uploaded videos |
| `MODELS_CACHE` | `~/.cache/watermark_remover` | Local model cache directory |
| `BATCH_SIZE` | `4` | Frames processed per batch (reduce if OOM) |
| `USE_FP16` | `true` | Half precision (requires CUDA GPU) |

## Troubleshooting

**CUDA out of memory:**
- Reduce `BATCH_SIZE` to `1` or `2`
- Set `USE_FP16=true` (default)
- Close other GPU applications

**`simple_lama_inpainting` not found:**
- Worker falls back to OpenCV TELEA inpainting (lower quality, no extra install needed)
- For best results: `pip install simple-lama-inpainting`

**Redis connection refused:**
- Make sure Redis is running: `redis-server` (or `redis-cli ping`)
- Check `REDIS_URL` in your `.env`

**Video not found:**
- Ensure `STORAGE_PATH` matches what the backend uses
- Both backend and worker must share the same filesystem path

**ffmpeg not found:**
- Output still works but uses raw mp4v codec
- Install ffmpeg: https://ffmpeg.org/download.html and add to PATH

## Running as a background service (optional)

**Windows (Task Scheduler):**
Create a basic task that runs `python worker.py` on system startup.

**Linux (systemd):**
```ini
[Unit]
Description=Watermark Removal Worker
After=network.target redis.service

[Service]
WorkingDirectory=/path/to/worker
ExecStart=/path/to/venv/bin/python worker.py
Restart=always

[Install]
WantedBy=multi-user.target
```

**macOS (launchd):**
Use a plist in `~/Library/LaunchAgents/` pointing to `python worker.py`.
