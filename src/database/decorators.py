
import functools
from firebase_admin import firestore
import time
import json
from src.api.redis_cache import get_redis_client

def _get_collection_name(func, args, kwargs):
    """Helper to intelligently find collection_name."""
    # 1. Check kwargs
    if 'collection_name' in kwargs:
        return kwargs['collection_name']

    # 2. Check instance attribute for class methods
    if args and hasattr(args[0], 'collection') and hasattr(args[0].collection, 'id'):
        return args[0].collection.id

    # 3. Check function signature for named argument
    try:
        arg_names = func.__code__.co_varnames[:func.__code__.co_argcount]
        if 'collection_name' in arg_names:
            collection_name_index = arg_names.index('collection_name')
            if len(args) > collection_name_index:
                return args[collection_name_index]
    except (ValueError, IndexError):
        pass
    
    return None

def update_metadata_on_change(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        
        collection_name = _get_collection_name(func, args, kwargs)

        if collection_name:
            db = firestore.client()
            metadata_ref = db.collection('metadata').document(collection_name)
            new_version = int(time.time() * 1000)
            metadata_ref.set({'version': new_version}, merge=True)
            print(f"Updated metadata for {collection_name} to version {new_version}")

        return result
    return wrapper

def cached_query(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        collection_name = _get_collection_name(func, args, kwargs)

        redis_client = get_redis_client()
        if not redis_client or not collection_name:
            return func(*args, **kwargs)

        db = firestore.client()
        cache_key = f"cache:{collection_name}"
        version_key = f"version:{collection_name}"

        try:
            metadata_ref = db.collection('metadata').document(collection_name)
            metadata_doc = metadata_ref.get()
            firestore_version = metadata_doc.to_dict().get('version') if metadata_doc.exists else None
        except Exception as e:
            print(f"Firestore metadata error: {e}")
            return func(*args, **kwargs)

        cached_version = redis_client.get(version_key)
        print(f"Firestore version: {firestore_version}, Cached version: {cached_version.decode('utf-8')}")
        if firestore_version and cached_version and str(firestore_version) == cached_version.decode('utf-8'):
            cached_data = redis_client.get(cache_key)
            if cached_data:
                print(f"Cache hit for '{collection_name}'. Serving from Redis.")
                # The CRUDApi.get_all method returns a Flask Response object.
                # The decorator should do the same to be transparent.
                return json.loads(cached_data)

        print(f"Cache miss for '{collection_name}'. Fetching from Firestore.")
        result = func(*args, **kwargs)

        if result is not None and firestore_version is not None:
            # Result is a tuple (response_data, status_code)
            # We only want to cache the response_data
            response_data, status_code = result
            if status_code == 200:
                try:
                    with redis_client.pipeline() as pipe:
                        pipe.set(cache_key, response_data.get_data(as_text=True)) #jsonify makes it a response object
                        pipe.set(version_key, str(firestore_version))
                        pipe.execute()
                    print(f"Updated Redis cache for '{collection_name}' with version {firestore_version}.")
                except Exception as e:
                    print(f"Error updating redis cache: {e}")


        return result
    return wrapper
