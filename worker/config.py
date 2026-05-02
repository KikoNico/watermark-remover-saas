import os

API_URL = os.getenv("API_URL", "http://localhost:8000")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
STORAGE_PATH = os.getenv("STORAGE_PATH", "/tmp/watermark_remover/videos")
MODELS_CACHE = os.path.expanduser(os.getenv("MODELS_CACHE", "~/.cache/watermark_remover"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "4"))
USE_FP16 = os.getenv("USE_FP16", "true").lower() == "true"
QUEUE_KEY = "watermark_jobs"
JOB_KEY_PREFIX = "job:"
POLL_INTERVAL = 5  # seconds
