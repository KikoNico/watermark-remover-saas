import os
import shutil

STORAGE_BASE = os.getenv("STORAGE_PATH", "/tmp/watermark_remover/videos")


def ensure_storage_dir() -> None:
    os.makedirs(STORAGE_BASE, exist_ok=True)


def _job_dir(job_id: str) -> str:
    return os.path.join(STORAGE_BASE, job_id)


def get_input_path(job_id: str) -> str:
    return os.path.join(_job_dir(job_id), "input.mp4")


def get_output_path(job_id: str) -> str:
    return os.path.join(_job_dir(job_id), "output.mp4")


def save_video(file_bytes: bytes, job_id: str, ext: str) -> str:
    job_dir = _job_dir(job_id)
    os.makedirs(job_dir, exist_ok=True)
    input_path = os.path.join(job_dir, f"input.{ext}")
    with open(input_path, "wb") as f:
        f.write(file_bytes)
    return input_path


def output_exists(job_id: str) -> bool:
    return os.path.isfile(get_output_path(job_id))


def delete_job_files(job_id: str) -> bool:
    job_dir = _job_dir(job_id)
    if os.path.isdir(job_dir):
        shutil.rmtree(job_dir, ignore_errors=True)
        return True
    return False
