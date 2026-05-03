import base64
import json
import os
import subprocess
import tempfile

from fastapi import APIRouter, HTTPException

from api.services import job_service

router = APIRouter()


@router.get("/jobs/{job_id}/frame")
async def get_job_frame(job_id: str):
    job = await job_service.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    video_path = job.get("video_path")
    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    # Get video dimensions
    probe = subprocess.run(
        [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_streams", "-select_streams", "v:0",
            video_path,
        ],
        capture_output=True,
        timeout=10,
        text=True,
    )
    try:
        streams = json.loads(probe.stdout).get("streams", [{}])
        video_width = int(streams[0].get("width", 1280))
        video_height = int(streams[0].get("height", 720))
    except (ValueError, IndexError, KeyError):
        video_width, video_height = 1280, 720

    # Extract a frame at 10 seconds (or beginning if video is shorter)
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        frame_path = f.name

    try:
        result = subprocess.run(
            ["ffmpeg", "-y", "-ss", "10", "-i", video_path, "-vframes", "1", "-q:v", "2", frame_path],
            capture_output=True,
            timeout=30,
        )
        if result.returncode != 0 or not os.path.getsize(frame_path):
            subprocess.run(
                ["ffmpeg", "-y", "-i", video_path, "-vframes", "1", "-q:v", "2", frame_path],
                capture_output=True,
                timeout=30,
            )

        with open(frame_path, "rb") as f:
            frame_bytes = f.read()
    finally:
        if os.path.exists(frame_path):
            os.unlink(frame_path)

    return {
        "frame_base64": base64.b64encode(frame_bytes).decode(),
        "video_width": video_width,
        "video_height": video_height,
    }
