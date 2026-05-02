import numpy as np
from PIL import Image


class WatermarkRemover:
    """Inpaints watermark regions. Uses simple-lama-inpainting when available, falls back to OpenCV."""

    def __init__(self):
        self._load_model()

    def _load_model(self):
        try:
            from simple_lama_inpainting import SimpleLama
            self.lama = SimpleLama()
            self.use_lama = True
            print("LaMA inpainting model loaded.")
        except ImportError:
            print("simple_lama_inpainting not installed — using OpenCV TELEA fallback.")
            self.use_lama = False

    def inpaint(self, frame: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """
        Remove watermark from frame using mask.
        frame: BGR numpy array (H, W, 3)
        mask: binary uint8 array (H, W) — 255=watermark
        Returns cleaned BGR numpy array.
        """
        if mask.max() == 0:
            return frame

        if self.use_lama:
            return self._inpaint_lama(frame, mask)
        return self._inpaint_opencv(frame, mask)

    def _inpaint_lama(self, frame: np.ndarray, mask: np.ndarray) -> np.ndarray:
        image_pil = Image.fromarray(frame[:, :, ::-1])  # BGR → RGB
        mask_pil = Image.fromarray(mask)
        result = self.lama(image_pil, mask_pil)
        return np.array(result)[:, :, ::-1]  # RGB → BGR

    def _inpaint_opencv(self, frame: np.ndarray, mask: np.ndarray) -> np.ndarray:
        import cv2
        return cv2.inpaint(frame, mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)
