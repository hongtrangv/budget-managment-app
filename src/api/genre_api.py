
from flask import Blueprint
from src.database.generic_queries import CRUDApi
from src.api.auth import require_api_key, require_action

# Create a Blueprint for the genre API
genre_api_blueprint = Blueprint('genre_api', __name__)

# Initialize the generic CRUD API for the 'genre' collection.
# This automatically enables caching for get_all and metadata updates for other methods.
genre_crud = CRUDApi('genre')

# --- Genre API Endpoints ---

@genre_api_blueprint.route('/', methods=['GET'])
# @require_api_key # Commented out to allow frontend to fetch without key for now
def get_genres():
    """
    Fetches all genre documents, utilizing a Redis cache.
    The get_all() method is decorated with @cached_query.
    """
    return genre_crud.get_all()

@genre_api_blueprint.route('/', methods=['POST'])
@require_api_key
@require_action
def add_new_genre():
    """
    Adds a new genre. The @update_metadata_on_change decorator (inside CRUDApi)
    will invalidate the cache.
    """
    return genre_crud.create()

@genre_api_blueprint.route('/<string:doc_id>', methods=['PUT'])
@require_api_key
@require_action
def update_existing_genre(doc_id):
    """
    Updates a genre. The @update_metadata_on_change decorator (inside CRUDApi)
    will invalidate the cache.
    """
    return genre_crud.update(doc_id)

@genre_api_blueprint.route('/<string:doc_id>', methods=['DELETE'])
@require_api_key
@require_action
def delete_existing_genre(doc_id):
    """
    Deletes a genre. The @update_metadata_on_change decorator (inside CRUDApi)
    will invalidate the cache.
    """
    return genre_crud.delete(doc_id)
