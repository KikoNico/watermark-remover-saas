import glob as _glob
import json
import logging
import os
import subprocess
import time
from datetime import datetime, timezone

import cv2
import redis

from worker.config import (
    JOB_KEY_PREFIX,
    POLL_INTERVAL,
    QUEUE_KEY,
    REDIS_URL,
    STORAGE_PATH,
)
from worker.models.detector import WatermarkDetector
from worker.processors.video import VideoProcessor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


def get_input_path(job_id: str) -> str:
    patterns = _glob.glob(os.path.join(STORAGE_PATH, job_id, "input.*"))
    return patterns[0] if patterns else os.path.join(STORAGE_PATH, job_id, "input.mp4")


def get_output_path(job_id: str) -> str:
    return os.path.join(STORAGE_PATH, job_id, "output.mp4")


def update_status(
    r: redis.Redis,
    job_id: str,
    status: str,
    progress: int = None,
    error: str = None,
) -> None:
    key = f"{JOB_KEY_PREFIX}{job_id}"
    raw = r.get(key)
    job = json.loads(raw) if raw else {}

    job["status"] = status
    if progress is not None:
        job["progress"] = progress
    if error is not None:
        job["error"] = error
    if status == "processing" and not job.get("started_at"):
        job["started_at"] = datetime.now(timezone.utc).isoformat()
    if status in ("completed", "failed"):
        job["completed_at"] = datetime.now(timezone.utc).isoformat()

    r.set(key, json.dumps(job))
    log.info(f"Job {job_id[:8]}…  status={status}  progress={progress}")


class JobCancelledError(Exception):
    pass


def is_cancelled(r: redis.Redis, job_id: str) -> bool:
    key = f"{JOB_KEY_PREFIX}{job_id}"
    raw = r.get(key)
    if not raw:
        return False
    return json.loads(raw).get("status") == "cancelled"


DETECTION_SAMPLES = 5  # number of frames to sample for watermark detection


def detect_watermark_bbox(
    video_path: str,
    detector: WatermarkDetector,
    total_frames: int,
) -> tuple[int, int, int, int] | None:
    """
    Sample a few frames, run detection, return union bounding box (x, y, w, h).
    Returns None if no watermark found.
    """
    cap = cv2.VideoCapture(video_path)
    x1_min, y1_min, x2_max, y2_max = float("inf"), float("inf"), 0, 0
    found = False

    indices = [int(i * total_frames / DETECTION_SAMPLES) for i in range(DETECTION_SAMPLES)]
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue
        mask = detector.detect(frame)
        coords = cv2.findNonZero(mask)
        if coords is None:
            continue
        found = True
        fx, fy, fw, fh = cv2.boundingRect(coords)
        x1_min = min(x1_min, fx)
        y1_min = min(y1_min, fy)
        x2_max = max(x2_max, fx + fw)
        y2_max = max(y2_max, fy + fh)

    cap.release()
    if not found:
        return None
    return int(x1_min), int(y1_min), int(x2_max - x1_min), int(y2_max - y1_min)


def process_job(
    r: redis.Redis,
    job_id: str,
    detector: WatermarkDetector,
) -> None:
    video_path = get_input_path(job_id)
    output_path = get_output_path(job_id)

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Input video not found: {video_path}")

    log.info(f"Processing: {video_path}")
    info = VideoProcessor.get_video_info(video_path)
    total_frames = max(info["total_frames"], 1)

    # Step 1: detect watermark on a few sample frames
    update_status(r, job_id, "processing", progress=5)
    if is_cancelled(r, job_id):
        raise JobCancelledError()

    bbox = detect_watermark_bbox(video_path, detector, total_frames)
    if bbox is None:
        log.info(f"Job {job_id[:8]}… no watermark detected — copying original.")
        import shutil
        shutil.copy2(video_path, output_path)
        return

    x, y, w, h = bbox
    vid_w, vid_h = info["width"], info["height"]

    # Add 10px padding and clamp to video boundaries
    pad = 10
    x = max(0, x - pad)
    y = max(0, y - pad)
    w = min(vid_w - x, w + pad * 2)
    h = min(vid_h - y, h + pad * 2)
    # FFmpeg requires even dimensions
    w = w if w % 2 == 0 else w + 1
    h = h if h % 2 == 0 else h + 1
    w = min(vid_w - x, w)
    h = min(vid_h - y, h)

    log.info(f"Job {job_id[:8]}… delogo bbox: x={x} y={y} w={w} h={h} (video {vid_w}x{vid_h})")

    if w <= 0 or h <= 0:
        raise RuntimeError(f"Invalid delogo bbox after clamping: w={w} h={h}")

    update_status(r, job_id, "processing", progress=20)

    if is_cancelled(r, job_id):
        raise JobCancelledError()

    # Step 2: blur the watermark region and overlay it on the original video
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    blur_filter = (
        f"[0:v]split[main][copy];"
        f"[copy]crop={w}:{h}:{x}:{y},boxblur=20:5[blurred];"
        f"[main][blurred]overlay={x}:{y}[out]"
    )
    total_seconds = max(total_frames / max(info["fps"], 1), 1)

    proc = subprocess.Popen(
        [
            "ffmpeg", "-y", "-i", video_path,
            "-filter_complex", blur_filter,
            "-map", "[out]",
            "-map", "0:a?",
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-c:a", "copy",
            "-pix_fmt", "yuv420p",
            "-progress", "pipe:2",
            output_path,
        ],
        stderr=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
    )

    import queue
    import threading

    stderr_lines = []
    line_queue: queue.Queue = queue.Queue()

    def _read_stderr():
        try:
            for raw in proc.stderr:
                line_queue.put(raw)
        finally:
            line_queue.put(None)  # sentinel

    reader = threading.Thread(target=_read_stderr, daemon=True)
    reader.start()

    try:
        while True:
            try:
                raw_line = line_queue.get(timeout=0.5)
            except queue.Empty:
                if proc.poll() is not None:
                    break
                continue

            if raw_line is None:
                break

            line = raw_line.decode(errors="replace").strip()
            stderr_lines.append(line)
            if line.startswith("out_time_ms="):
                try:
                    current_s = int(line.split("=")[1]) / 1_000_000
                    pct = 20 + int((current_s / total_seconds) * 80)
                    update_status(r, job_id, "processing", progress=min(pct, 99))
                except ValueError:
                    pass
            if is_cancelled(r, job_id):
                proc.kill()
                proc.wait()
                raise JobCancelledError()
    except (KeyboardInterrupt, SystemExit):
        proc.kill()
        proc.wait()
        raise

    proc.wait()
    if proc.returncode != 0:
        err = "\n".join(stderr_lines[-30:])
        raise RuntimeError(f"FFmpeg blur failed: {err}")

    log.info(f"Job {job_id[:8]}… complete — saved to {output_path}")


def main() -> None:
    log.info("=== Watermark Removal Worker starting ===")
    log.info("Loading Florence-2 detection model...")

    detector = WatermarkDetector()

    log.info("Model loaded. Connecting to Redis...")
    r = redis.from_url(REDIS_URL, decode_responses=True)
    r.ping()
    log.info(f"Connected. Waiting for jobs on queue '{QUEUE_KEY}'...")

    while True:
        try:
            result = r.blpop(QUEUE_KEY, timeout=POLL_INTERVAL)
            if result is None:
                continue

            _, raw = result
            job_data = json.loads(raw)
            job_id = job_data.get("job_id")

            if not job_id:
                log.warning("Received a job with no job_id — skipping.")
                continue

            log.info(f"Picked up job: {job_id}")
            update_status(r, job_id, "processing", progress=0)

            try:
                process_job(r, job_id, detector)
                update_status(r, job_id, "completed", progress=100)
            except JobCancelledError:
                log.info(f"Job {job_id[:8]}… was cancelled.")
            except Exception as exc:
                log.exception(f"Job {job_id} failed: {exc}")
                update_status(r, job_id, "failed", error=str(exc))

        except redis.exceptions.ConnectionError as exc:
            log.error(f"Redis connection lost: {exc}. Retrying in {POLL_INTERVAL}s...")
            time.sleep(POLL_INTERVAL)
        except Exception as exc:
            log.exception(f"Unexpected worker error: {exc}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
