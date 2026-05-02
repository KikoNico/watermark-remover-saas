from dataclasses import dataclass
from typing import Optional


@dataclass
class Job:
    job_id: str
    status: str  # queued | processing | completed | failed
    progress: int
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]
    error: Optional[str]
    video_path: str
    filename: str
