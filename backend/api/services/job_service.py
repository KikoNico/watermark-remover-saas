import uuid
from datetime import datetime, timezone
from typing import Optional

from api.services import storage, queue


async def create_job(file_bytes: bytes, filename: str) -> dict:
    job_id = str(uuid.uuid4())
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "mp4"

    video_path = storage.save_video(file_bytes, job_id, ext)

    now = datetime.now(timezone.utc).isoformat()
    job_record = {
        "job_id": job_id,
        "status": "awaiting_zones",
        "progress": 0,
        "created_at": now,
        "started_at": None,
        "completed_at": None,
        "error": None,
        "video_path": video_path,
        "filename": filename,
    }

    queue.set_job_data(job_id, job_record)

    return job_record


async def start_job(job_id: str, zones: list) -> None:
    job = queue.get_job_data(job_id)
    if job is None:
        raise ValueError(f"Job {job_id} not found")
    job["zones"] = zones
    job["status"] = "queued"
    queue.set_job_data(job_id, job)
    queue.enqueue_job(job_id, job["video_path"])


async def get_job(job_id: str) -> Optional[dict]:
    return queue.get_job_data(job_id)
