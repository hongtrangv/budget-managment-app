from flask import Blueprint, jsonify, request
from src.database.firestore_queries import DocumentHandler

# Tạo một Blueprint. 'collections_api' là tên của blueprint,
# __name__ giúp blueprint biết nó được định nghĩa ở đâu.
collections_bp = Blueprint('collections_api', __name__)

@collections_bp.route("/api/collections")
def get_collections_route():
    collection_ids = DocumentHandler.get_all_collections()
    return jsonify(collection_ids)

@collections_bp.route("/api/collections/<string:collection_name>/documents", methods=['GET', 'POST'])
def documents_route(collection_name):
    if request.method == 'GET':
        documents = DocumentHandler.get_all_documents_from_collection(collection_name)
        return jsonify(documents)
    elif request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid data"}), 400
        if DocumentHandler.add_document_to_collection(collection_name, data):
            return jsonify({"success": True}), 201
        else:
            return jsonify({"error": "Failed to add document"}), 500

@collections_bp.route("/api/collections/<string:collection_name>/<string:document_id>", methods=['GET', 'PUT', 'DELETE'])
def document_route(collection_name, document_id):
    if request.method == 'GET':
        document = DocumentHandler.get_document_from_collection(collection_name, document_id)
        if document:
            return jsonify(document)
        else:
            return jsonify({"error": "Document not found"}), 404
    elif request.method == 'PUT':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid data"}), 400
        if DocumentHandler.update_document_in_collection(collection_name, document_id, data):
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Failed to update document"}), 500
    elif request.method == 'DELETE':
        if DocumentHandler.delete_document_from_collection(collection_name, document_id):
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Failed to delete document"}), 500
