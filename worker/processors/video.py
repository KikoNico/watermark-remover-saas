import os
import subprocess
from typing import Iterator, List, Tuple

import cv2
import numpy as np


class VideoProcessor:
    @staticmethod
    def get_video_info(video_path: str) -> dict:
        cap = cv2.VideoCapture(video_path)
        info = {
            "fps": cap.get(cv2.CAP_PROP_FPS),
            "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "total_frames": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        }
        cap.release()
        return info

    @staticmethod
    def extract_frames(video_path: str) -> Iterator[Tuple[int, np.ndarray]]:
        """Yield (frame_index, bgr_frame) for every frame in the video."""
        cap = cv2.VideoCapture(video_path)
        idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            yield idx, frame
            idx += 1
        cap.release()

    @staticmethod
    def save_video(
        frames: List[np.ndarray],
        output_path: str,
        fps: float,
        width: int,
        height: int,
    ) -> None:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        for frame in frames:
            out.write(frame)
        out.release()

        # Re-encode with ffmpeg for broad compatibility
        tmp = output_path + ".raw.mp4"
        os.rename(output_path, tmp)
        try:
            result = subprocess.run(
                [
                    "ffmpeg", "-y", "-i", tmp,
                    "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                    "-pix_fmt", "yuv420p",
                    output_path,
                ],
                capture_output=True,
                timeout=7200,
            )
            if result.returncode == 0:
                os.remove(tmp)
            else:
                os.rename(tmp, output_path)
        except (FileNotFoundError, subprocess.TimeoutExpired):
            os.rename(tmp, output_path)
