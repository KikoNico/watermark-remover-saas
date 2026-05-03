import glob as _glob
import json
import logging
import os
import shutil
import subprocess
import sys
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

DETECTION_SAMPLES = 5       # frames for quick preliminary check
BLUR_KERNEL = (51, 51)      # GaussianBlur kernel — must be odd
BLUR_PAD = 10               # pixels of padding around detected bbox


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


def _detect_bbox(frame: cv2.Mat, detector: WatermarkDetector, width: int, height: int):
    """Run detection on a single frame. Returns (x, y, w, h) or None."""
    mask = detector.detect(frame)
    coords = cv2.findNonZero(mask)
    if coords is None:
        return None
    x, y, w, h = cv2.boundingRect(coords)
    x = max(0, x - BLUR_PAD)
    y = max(0, y - BLUR_PAD)
    w = min(width - x, w + BLUR_PAD * 2)
    h = min(height - y, h + BLUR_PAD * 2)
    return (x, y, w, h)


def has_watermark(video_path: str, detector: WatermarkDetector, total_frames: int) -> bool:
    """Sample DETECTION_SAMPLES frames. Returns True if any watermark found."""
    cap = cv2.VideoCapture(video_path)
    indices = [int(i * total_frames / DETECTION_SAMPLES) for i in range(DETECTION_SAMPLES)]
    found = False
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue
        if cv2.findNonZero(detector.detect(frame)) is not None:
            found = True
            break
    cap.release()
    return found


import queue as _queue
import threading


def _process_with_zones(
    r: redis.Redis,
    job_id: str,
    video_path: str,
    output_path: str,
    zones: list,
    info: dict,
) -> None:
    """Fast path: single FFmpeg pass blurring pre-defined zones."""
    vid_w, vid_h = info["width"], info["height"]
    total_frames = max(info["total_frames"], 1)
    total_seconds = max(total_frames / max(info["fps"], 1), 1)

    clean_zones = []
    for z in zones:
        x = max(0, z["x"])
        y = max(0, z["y"])
        w = min(vid_w - x, z["w"])
        h = min(vid_h - y, z["h"])
        w = w if w % 2 == 0 else w + 1
        h = h if h % 2 == 0 else h + 1
        w = min(vid_w - x, w)
        h = min(vid_h - y, h)
        if w > 0 and h > 0:
            clean_zones.append({"x": x, "y": y, "w": w, "h": h})

    if not clean_zones:
        log.info(f"Job {job_id[:8]}… no valid zones — copying original.")
        shutil.copy2(video_path, output_path)
        return

    n = len(clean_zones)
    parts = [f"[0:v]split={n + 1}" + "".join(f"[s{i}]" for i in range(n + 1))]
    for i, z in enumerate(clean_zones):
        parts.append(f"[s{i + 1}]crop={z['w']}:{z['h']}:{z['x']}:{z['y']},boxblur=20:5[b{i}]")
    for i, z in enumerate(clean_zones):
        src = "s0" if i == 0 else f"t{i - 1}"
        dst = f"t{i}" if i < n - 1 else "out"
        parts.append(f"[{src}][b{i}]overlay={z['x']}:{z['y']}[{dst}]")
    blur_filter = ";".join(parts)

    log.info(f"Job {job_id[:8]}… blurring {n} zone(s) with FFmpeg.")
    update_status(r, job_id, "processing", progress=5)

    if sys.platform == "darwin":
        video_codec = ["-c:v", "h264_videotoolbox", "-b:v", "8000k"]
    else:
        video_codec = ["-c:v", "libx264", "-preset", "fast", "-crf", "18"]

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    proc = subprocess.Popen(
        [
            "ffmpeg", "-y", "-i", video_path,
            "-filter_complex", blur_filter,
            "-map", "[out]",
            "-map", "0:a?",
            *video_codec,
            "-c:a", "copy",
            "-pix_fmt", "yuv420p",
            "-progress", "pipe:2",
            output_path,
        ],
        stderr=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
    )

    stderr_lines = []
    line_queue: _queue.Queue = _queue.Queue()

    def _read_stderr():
        try:
            for raw in proc.stderr:
                line_queue.put(raw)
        finally:
            line_queue.put(None)

    threading.Thread(target=_read_stderr, daemon=True).start()

    while True:
        try:
            raw_line = line_queue.get(timeout=0.5)
        except _queue.Empty:
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
                pct = 5 + int((current_s / total_seconds) * 94)
                update_status(r, job_id, "processing", progress=min(pct, 99))
            except ValueError:
                pass
        if is_cancelled(r, job_id):
            proc.kill()
            proc.wait()
            raise JobCancelledError()

    proc.wait()
    if proc.returncode != 0:
        err = "\n".join(stderr_lines[-30:])
        raise RuntimeError(f"FFmpeg blur failed: {err}")

    log.info(f"Job {job_id[:8]}… complete — saved to {output_path}")


def process_job(
    r: redis.Redis,
    job_id: str,
    detector: WatermarkDetector,
) -> None:
    video_path = get_input_path(job_id)
    output_path = get_output_path(job_id)
    temp_path = output_path + ".tmp.mp4"

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Input video not found: {video_path}")

    log.info(f"Processing: {video_path}")
    info = VideoProcessor.get_video_info(video_path)

    # Fast path: zones were pre-defined by the user
    raw = r.get(f"{JOB_KEY_PREFIX}{job_id}")
    zones = json.loads(raw).get("zones") if raw else None
    if zones:
        _process_with_zones(r, job_id, video_path, output_path, zones, info)
        return

    total_frames = max(info["total_frames"], 1)
    fps = max(info["fps"], 1)
    width, height = info["width"], info["height"]

    # Fallback: frame-by-frame Florence-2 detection
    update_status(r, job_id, "processing", progress=3)
    if is_cancelled(r, job_id):
        raise JobCancelledError()

    if not has_watermark(video_path, detector, total_frames):
        log.info(f"Job {job_id[:8]}… no watermark detected — copying original.")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        shutil.copy2(video_path, output_path)
        return

    update_status(r, job_id, "processing", progress=5)

    # Detect every ~2 seconds of video
    detection_interval = max(1, int(fps * 2))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")

    try:
        cap = cv2.VideoCapture(video_path)
        out = cv2.VideoWriter(temp_path, fourcc, fps, (width, height))

        try:
            current_bbox = None
            frame_idx = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Re-run detection once per second of video
                if frame_idx % detection_interval == 0:
                    if is_cancelled(r, job_id):
                        raise JobCancelledError()
                    current_bbox = _detect_bbox(frame, detector, width, height)
                    if current_bbox:
                        log.info(
                            f"Job {job_id[:8]}… frame {frame_idx}: "
                            f"watermark at {current_bbox}"
                        )

                # Blur the watermark region only when detected
                if current_bbox is not None:
                    x, y, w, h = current_bbox
                    roi = frame[y:y + h, x:x + w]
                    if roi.size > 0:
                        frame[y:y + h, x:x + w] = cv2.GaussianBlur(roi, BLUR_KERNEL, 0)

                out.write(frame)
                frame_idx += 1

                # Update progress every 150 frames (~5 seconds at 30fps)
                if frame_idx % 150 == 0:
                    pct = 5 + int((frame_idx / total_frames) * 83)
                    update_status(r, job_id, "processing", progress=min(pct, 88))

        finally:
            cap.release()
            out.release()

        # Re-encode temp video + copy audio from original
        update_status(r, job_id, "processing", progress=90)

        if sys.platform == "darwin":
            video_codec = ["-c:v", "h264_videotoolbox", "-b:v", "8000k"]
        else:
            video_codec = ["-c:v", "libx264", "-preset", "fast", "-crf", "18"]

        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", temp_path,
                "-i", video_path,
                "-map", "0:v",
                "-map", "1:a?",
                *video_codec,
                "-c:a", "copy",
                "-pix_fmt", "yuv420p",
                output_path,
            ],
            capture_output=True,
            timeout=7200,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"FFmpeg re-encode failed: "
                f"{result.stderr.decode(errors='replace')[-500:]}"
            )

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

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
