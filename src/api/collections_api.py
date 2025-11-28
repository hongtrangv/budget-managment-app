from flask import Blueprint, jsonify, request
from src.database.firestore_queries import DocumentHandler

# Create a Blueprint for the collections API
collections_bp = Blueprint('collections_api', __name__)

@collections_bp.route("/api/collections/<string:collection_name>/documents", methods=['GET', 'POST'])
def documents_route(collection_name):
    if request.method == 'GET':
        """Fetches a paginated list of documents from a collection."""
        try:
            page_size = request.args.get('pageSize', default=10, type=int)
            start_after = request.args.get('startAfter', default=None, type=str)
            
            # Use the generic paginated method. Sort by document ID by default.
            result = DocumentHandler.get_paginated_documents(
                collection_name=collection_name,
                page_size=page_size,
                start_after_doc_id=start_after
            )
            return jsonify(result)
        except Exception as e:
            print(f"Error getting paginated documents: {e}")
            return jsonify({"error": "Failed to retrieve documents"}), 500
            
    elif request.method == 'POST':
        """Adds a new document to a collection."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid JSON data"}), 400
            
            doc_id = DocumentHandler.add_document_to_collection(collection_name, data)
            return jsonify({"success": True, "id": doc_id}), 201
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 409 # 409 Conflict for existing doc
        except Exception as e:
            print(f"Error adding document: {e}")
            return jsonify({"error": "Failed to add document"}), 500

@collections_bp.route("/api/collections/<string:collection_name>/<string:document_id>", methods=['PUT', 'DELETE'])
def document_route(collection_name, document_id):
    if request.method == 'PUT':
        """Updates a document."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid data"}), 400
            
            result_id = DocumentHandler.update_document_in_collection(collection_name, document_id, data)
            return jsonify({"success": True, "id": result_id})
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 409 # Conflict
        except Exception as e:
            print(f"Error updating document: {e}")
            return jsonify({"error": "Failed to update document"}), 500
            
    elif request.method == 'DELETE':
        """Deletes a document."""
        try:
            if DocumentHandler.delete_document_from_collection(collection_name, document_id):
                return jsonify({"success": True})
            else:
                # This case might not be reached if exceptions are raised
                return jsonify({"error": "Failed to delete document"}), 500
        except Exception as e:
            print(f"Error deleting document: {e}")
            return jsonify({"error": "Failed to delete document"}), 500

@collections_bp.route("/api/items")
def get_items_for_dropdown():
    """API endpoint to get all items from the 'items' collection for dropdowns."""
    try:
        # Note: This is not paginated as dropdowns usually need all items.
        items = DocumentHandler.get_all_documents_from_collection('items')
        return jsonify(items)
    except Exception as e:
        print(f"Error fetching items: {e}")
        return jsonify({"error": str(e)}), 500
