import os

API_URL = os.getenv("API_URL", "http://localhost:8000")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
STORAGE_PATH = os.getenv("STORAGE_PATH", "/tmp/watermark_remover/videos")
QUEUE_KEY = "watermark_jobs"
JOB_KEY_PREFIX = "job:"
JOB_TTL_DAYS = 7
