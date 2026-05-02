from fastapi import APIRouter, HTTPException

from api.services import job_service
from api.services.queue import update_job_status

router = APIRouter()


@router.delete("/cancel/{job_id}")
async def cancel_job(job_id: str):
    job = await job_service.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Trabajo '{job_id}' no encontrado.")

    status = job.get("status")
    if status in ("completed", "failed", "cancelled"):
        raise HTTPException(
            status_code=400,
            detail=f"No se puede cancelar: el trabajo ya está en estado '{status}'.",
        )

    update_job_status(job_id, "cancelled")
    return {"job_id": job_id, "status": "cancelled", "message": "Trabajo cancelado correctamente."}
