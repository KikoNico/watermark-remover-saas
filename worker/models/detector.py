import torch
import numpy as np
from PIL import Image
from transformers import AutoProcessor, AutoModelForCausalLM
from worker.config import MODELS_CACHE, USE_FP16


class WatermarkDetector:
    MODEL_ID = "microsoft/Florence-2-large"

    def __init__(self):
        if torch.cuda.is_available():
            self.device = "cuda"
        elif torch.backends.mps.is_available():
            self.device = "mps"
        else:
            self.device = "cpu"
        dtype = torch.float16 if USE_FP16 and self.device == "cuda" else torch.float32

        print(f"Loading Florence-2 on {self.device} ({dtype})...")
        self.model = AutoModelForCausalLM.from_pretrained(
            self.MODEL_ID,
            torch_dtype=dtype,
            trust_remote_code=True,
            cache_dir=MODELS_CACHE,
            attn_implementation="eager",
        ).to(self.device)

        self.processor = AutoProcessor.from_pretrained(
            self.MODEL_ID,
            trust_remote_code=True,
            cache_dir=MODELS_CACHE,
        )
        print("Florence-2 loaded.")

    def detect(self, frame: np.ndarray) -> np.ndarray:
        """
        Detect watermark regions in a BGR numpy frame.
        Returns a binary mask (255=watermark, 0=background).
        """
        image = Image.fromarray(frame[:, :, ::-1])  # BGR → RGB
        h, w = frame.shape[:2]

        task = "<OPEN_VOCABULARY_DETECTION>"
        prompt = f"{task}watermark, logo, text overlay, brand mark"

        inputs = self.processor(text=prompt, images=image, return_tensors="pt").to(self.device)

        with torch.no_grad():
            outputs = self.model.generate(
                input_ids=inputs["input_ids"],
                pixel_values=inputs["pixel_values"],
                max_new_tokens=1024,
                do_sample=False,
            )

        result = self.processor.batch_decode(outputs, skip_special_tokens=False)[0]
        parsed = self.processor.post_process_generation(result, task=task, image_size=(w, h))

        mask = np.zeros((h, w), dtype=np.uint8)
        detections = parsed.get(task, {})
        for bbox in detections.get("bboxes", []):
            x1, y1, x2, y2 = [int(c) for c in bbox]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            mask[y1:y2, x1:x2] = 255

        return mask
