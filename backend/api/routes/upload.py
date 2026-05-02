from fastapi import APIRouter, File, UploadFile, HTTPException
from models.schemas import UploadResponse
from api.services import job_service

router = APIRouter()

ALLOWED_EXTENSIONS = {"mp4", "mov", "mkv", "webm", "avi"}
ALLOWED_CONTENT_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/x-matroska",
    "video/webm",
    "video/x-msvideo",
    "video/avi",
    "application/octet-stream",
}
MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024  # 5 GB


def _get_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


@router.post("/upload", response_model=UploadResponse)
async def upload_video(file: UploadFile = File(...)):
    ext = _get_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    content_type = (file.content_type or "").split(";")[0].strip()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported content type '{content_type}'.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File exceeds the maximum allowed size of 5 GB.",
        )
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    job = await job_service.create_job(file_bytes, file.filename or f"upload.{ext}")

    return UploadResponse(
        job_id=job["job_id"],
        status=job["status"],
        message="Video uploaded successfully. Processing has been queued.",
    )
