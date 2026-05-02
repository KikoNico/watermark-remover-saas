import redis
from shared.constants import REDIS_URL


def get_redis_client() -> redis.Redis:
    return redis.from_url(REDIS_URL, decode_responses=True)
