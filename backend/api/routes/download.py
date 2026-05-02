import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from api.services import job_service
from api.services.storage import get_output_path, output_exists

router = APIRouter()


@router.get("/download/{job_id}")
async def download_video(job_id: str):
    job = await job_service.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    status = job.get("status")
    if status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Job is not completed yet. Current status: '{status}'.",
        )

    if not output_exists(job_id):
        raise HTTPException(
            status_code=410,
            detail="Output file has expired or is no longer available.",
        )

    output_path = get_output_path(job_id)
    original_filename = job.get("filename", "output.mp4")
    base, _ = os.path.splitext(original_filename)
    download_filename = f"{base}_no_watermark.mp4"

    return FileResponse(
        path=output_path,
        media_type="video/mp4",
        filename=download_filename,
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"'
        },
    )
