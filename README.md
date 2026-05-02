# Watermark Remover SaaS

AI-powered watermark removal for videos. Powered by Florence-2 (detection) and LaMA (inpainting).

## Architecture

```
Browser → Next.js Frontend (Vercel)
            ↓ POST /api/upload
        FastAPI Backend (Vercel serverless)
            ↓ Redis queue
        Python Worker (your local GPU PC)
            ↓ Florence-2 + LaMA
        Cleaned video saved locally
```

## Quick Start

### 1. Start Redis

```bash
# Windows: download from https://github.com/microsoftarchive/redis/releases
redis-server

# macOS:
brew install redis && redis-server

# Linux:
sudo apt install redis-server && redis-server
```

### 2. Start the Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn api.index:app --reload --port 8000
```

### 3. Start the Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
# → http://localhost:3000
```

### 4. Start the Worker (on your GPU machine)

```bash
cd worker
pip install -r requirements.txt
python -m worker.models.download_models   # first time only
python worker.py
```

## Deployment

- **Frontend:** Push to GitHub → auto-deploy on Vercel
- **Backend:** Same repo → Vercel detects FastAPI in `api/` folder
- **Worker:** Runs locally on your PC (must stay running)

Set `NEXT_PUBLIC_API_URL` in Vercel to point to your deployed backend URL.

## Supported Formats

MP4, MOV, MKV, WebM, AVI — up to 5 GB. Output is always H.264 MP4.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, TypeScript |
| Backend | FastAPI, Python 3.10+ |
| Queue | Redis |
| Detection | Microsoft Florence-2-large |
| Inpainting | LaMA (simple-lama-inpainting) |
| Storage | Local filesystem |
