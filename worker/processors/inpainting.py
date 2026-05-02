from typing import List

import numpy as np

from worker.config import BATCH_SIZE


class InpaintingProcessor:
    def __init__(self, remover):
        self.remover = remover

    def process_frame(self, frame: np.ndarray, mask: np.ndarray) -> np.ndarray:
        return self.remover.inpaint(frame, mask)

    def process_frames_batch(
        self,
        frames: List[np.ndarray],
        masks: List[np.ndarray],
    ) -> List[np.ndarray]:
        results = []
        for i in range(0, len(frames), BATCH_SIZE):
            batch_f = frames[i : i + BATCH_SIZE]
            batch_m = masks[i : i + BATCH_SIZE]
            for frame, mask in zip(batch_f, batch_m):
                results.append(self.remover.inpaint(frame, mask))
        return results
