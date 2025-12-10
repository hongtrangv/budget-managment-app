from flask import Blueprint, jsonify, request
from src.database.firestore_queries import DocumentHandler
from src.database.generic_queries import CRUDApi
from src.api.auth import require_api_key, require_action # Import decorators

# Create a Blueprint for the collections API
collections_bp = Blueprint('collections_api', __name__)

# --- Read Operations (GET) ---

@collections_bp.route("/api/collections/<string:collection_name>/documents", methods=['GET'])
def get_documents(collection_name):
    """Fetches a paginated list of documents from a collection."""
    try:
        page_size = request.args.get('pageSize', default=10, type=int)
        start_after = request.args.get('startAfter', default=None, type=str)
        
        result = DocumentHandler.get_paginated_documents(
            collection_name=collection_name,
            page_size=page_size,
            start_after_doc_id=start_after
        )
        return jsonify(result)
    except Exception as e:
        print(f"Error getting paginated documents: {e}")
        return jsonify({"error": "Failed to retrieve documents"}), 500

@collections_bp.route("/api/items", methods=['GET'])
def get_items_for_dropdown():
    """API endpoint to get all items from the 'items' collection for dropdowns."""
    try:
        #items = DocumentHandler.get_all_documents_from_collection('items')
        return CRUDApi('items').get_all()
        #return jsonify(items)
    except Exception as e:
        print(f"Error fetching items: {e}")
        return jsonify({"error": str(e)}), 500

# --- Write Operations (POST, PUT, DELETE) ---

@collections_bp.route("/api/collections/<string:collection_name>/documents", methods=['POST'])
@require_api_key
@require_action
def add_document(collection_name):
    """Adds a new document to a collection."""
    try:
        return CRUDApi(collection_name).create();        
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 409 # 409 Conflict for existing doc
    except Exception as e:
        print(f"Error adding document: {e}")
        return jsonify({"error": "Failed to add document"}), 500

@collections_bp.route("/api/collections/<string:collection_name>/<string:document_id>", methods=['PUT'])
@require_api_key
@require_action
def update_document(collection_name, document_id):
    """Updates a document."""
    try:
        return CRUDApi(collection_name).update(document_id)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 409 # Conflict
    except Exception as e:
        print(f"Error updating document: {e}")
        return jsonify({"error": "Failed to update document"}), 500

@collections_bp.route("/api/collections/<string:collection_name>/<string:document_id>", methods=['DELETE'])
@require_api_key
@require_action
def delete_document(collection_name, document_id):
    """Deletes a document."""
    try:
        return CRUDApi(collection_name).delete(document_id)
    except Exception as e:
        print(f"Error deleting document: {e}")
        return jsonify({"error": "Failed to delete document"}), 500
