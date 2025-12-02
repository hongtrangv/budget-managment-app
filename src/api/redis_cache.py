import redis
import os
from urllib.parse import urlparse

# Singleton instance to hold the Redis connection
redis_client = None

def get_redis_client():
    """
    Establishes and returns a Redis client instance.
    It uses a singleton pattern to avoid creating multiple connections.
    """
    global redis_client
    if redis_client:
        return redis_client

    # Get the Redis URL from the environment variable provided by Render
    redis_url = os.getenv('REDIS_URL')

    if not redis_url:
        print("REDIS_URL environment variable not set. Redis cache is disabled.")
        return None

    try:
        # Parse the Redis URL
        url = urlparse(redis_url)
        print(f"Connecting to Redis on Render url... {redis_url}")
        print(f"Connecting to Redis on Render host... {url.hostname}")
        print(f"Connecting to Redis on Render port... {url.port}")
        print(f"Connecting to Redis on Render pass... {url.password}")
        # Create a Redis client instance. Render provides SSL-enabled Redis.
        redis_client = redis.Redis(
            host=url.hostname,
            port=url.port,
            password=url.password,
            ssl=True,
            ssl_cert_reqs=None  # tránh lỗi cert
        )
        success = redis_client.set('foo', 'bar')
        # True

        result = redis_client.get('foo')
        print(result)       

        # Ping the Redis server to check the connection
        redis_client.ping()
        print("Successfully connected to Redis on Render!")
        return redis_client

    except redis.exceptions.ConnectionError as e:
        print(f"Failed to connect to Redis: {e}")
        redis_client = None
        return None
    except Exception as e:
        print(f"An unexpected error occurred when connecting to Redis: {e}")
        redis_client = None
        return None

# Example of how to use the client:
#
# from .redis_cache import get_redis_client
#
# def my_function():
#     r = get_redis_client()
#     if r:
#         r.set('mykey', 'Hello Redis!')
#         value = r.get('mykey')
#         print(value)

