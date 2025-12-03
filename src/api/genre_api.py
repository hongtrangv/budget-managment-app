
from flask import Blueprint, jsonify
from src.database.firestore_queries import DocumentHandler 
from src.api.auth import require_api_key, require_action

genre_api_blueprint = Blueprint('genre_api', __name__)

@genre_api_blueprint.route('/', methods=['GET'])
@require_api_key
def get_genres():
    """
    Fetches all genre documents. The underlying data layer returns a tuple
    (data, status_code), which is what the security decorators expect.
    """
    # The data layer and the security decorators now both expect a tuple.
    # We can just pass the result through directly.
    return DocumentHandler.get_all_documents_from_collection('genre')
