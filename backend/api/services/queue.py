import os
import json
from typing import Optional

import redis as redis_lib

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
QUEUE_KEY = "watermark_jobs"

_redis_client: Optional[redis_lib.Redis] = None


def get_redis() -> redis_lib.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis_lib.Redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
    return _redis_client


def enqueue_job(job_id: str, video_path: str) -> None:
    r = get_redis()
    payload = json.dumps({"job_id": job_id, "video_path": video_path})
    r.rpush(QUEUE_KEY, payload)


def get_job_data(job_id: str) -> Optional[dict]:
    r = get_redis()
    raw = r.get(f"job:{job_id}")
    if raw is None:
        return None
    return json.loads(raw)


def set_job_data(job_id: str, data: dict) -> None:
    r = get_redis()
    r.set(f"job:{job_id}", json.dumps(data))


def update_job_status(
    job_id: str,
    status: str,
    progress: Optional[int] = None,
    error: Optional[str] = None,
) -> None:
    data = get_job_data(job_id)
    if data is None:
        return
    data["status"] = status
    if progress is not None:
        data["progress"] = progress
    if error is not None:
        data["error"] = error
    set_job_data(job_id, data)
