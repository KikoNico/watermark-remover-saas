from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.services import job_service

router = APIRouter()


class Zone(BaseModel):
    x: int
    y: int
    w: int
    h: int


class StartJobRequest(BaseModel):
    zones: List[Zone]


@router.post("/jobs/{job_id}/start")
async def start_job(job_id: str, body: StartJobRequest):
    job = await job_service.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "awaiting_zones":
        raise HTTPException(
            status_code=400,
            detail=f"Job cannot be started from status '{job['status']}'",
        )

    zones = [z.model_dump() for z in body.zones]
    await job_service.start_job(job_id, zones)
    return {"job_id": job_id, "status": "queued"}
