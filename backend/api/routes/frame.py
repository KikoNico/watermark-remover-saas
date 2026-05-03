import base64
import json
import os
import subprocess
import tempfile

from fastapi import APIRouter, HTTPException, Query

from api.services import job_service

router = APIRouter()


def _probe_video(video_path: str) -> tuple[int, int, float]:
    """Returns (width, height, duration_seconds)."""
    probe = subprocess.run(
        [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_streams", "-show_format",
            "-select_streams", "v:0",
            video_path,
        ],
        capture_output=True,
        timeout=10,
        text=True,
    )
    try:
        data = json.loads(probe.stdout)
        streams = data.get("streams", [{}])
        width = int(streams[0].get("width", 1280))
        height = int(streams[0].get("height", 720))
        duration = float(data.get("format", {}).get("duration", 60))
    except (ValueError, IndexError, KeyError):
        width, height, duration = 1280, 720, 60.0
    return width, height, duration


def _extract_frame(video_path: str, timestamp: float) -> bytes | None:
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        frame_path = f.name
    try:
        result = subprocess.run(
            ["ffmpeg", "-y", "-ss", str(timestamp), "-i", video_path,
             "-vframes", "1", "-q:v", "3", frame_path],
            capture_output=True,
            timeout=30,
        )
        if result.returncode == 0 and os.path.exists(frame_path) and os.path.getsize(frame_path) > 0:
            with open(frame_path, "rb") as f:
                return f.read()
    finally:
        if os.path.exists(frame_path):
            os.unlink(frame_path)
    return None


@router.get("/jobs/{job_id}/frames")
async def get_job_frames(job_id: str, count: int = Query(default=10, ge=1, le=20)):
    job = await job_service.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    video_path = job.get("video_path")
    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    video_width, video_height, duration = _probe_video(video_path)

    frames_b64 = []
    for i in range(count):
        t = duration * (i + 0.5) / count
        data = _extract_frame(video_path, t)
        if data:
            frames_b64.append(base64.b64encode(data).decode())

    # Fallback: try frame at t=0 if nothing extracted
    if not frames_b64:
        data = _extract_frame(video_path, 0)
        if data:
            frames_b64.append(base64.b64encode(data).decode())

    return {
        "frames": frames_b64,
        "video_width": video_width,
        "video_height": video_height,
    }
