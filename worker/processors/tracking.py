from typing import List

import cv2
import numpy as np


class WatermarkTracker:
    @staticmethod
    def smooth_masks(masks: List[np.ndarray], window: int = 5) -> List[np.ndarray]:
        """
        Temporally smooth masks to reduce per-frame flicker.
        Uses a sliding window average: a pixel is marked as watermark
        if it appears in >50% of frames in the window.
        """
        if not masks:
            return masks

        n = len(masks)
        smoothed = []
        half = window // 2

        for i in range(n):
            start = max(0, i - half)
            end = min(n, i + half + 1)
            stack = np.stack(masks[start:end], axis=0).astype(np.float32)
            avg = np.mean(stack, axis=0)
            smoothed_mask = (avg > 127).astype(np.uint8) * 255
            smoothed.append(smoothed_mask)

        return smoothed

    @staticmethod
    def dilate_mask(mask: np.ndarray, pixels: int = 8) -> np.ndarray:
        """Expand mask slightly to ensure full watermark edge coverage."""
        if mask.max() == 0:
            return mask
        kernel = np.ones((pixels, pixels), np.uint8)
        return cv2.dilate(mask, kernel, iterations=1)
