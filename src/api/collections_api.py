from flask import Blueprint, jsonify, request
from src.database.firestore_queries import DocumentHandler

# Tạo một Blueprint. 'collections_api' là tên của blueprint,
# __name__ giúp blueprint biết nó được định nghĩa ở đâu.
collections_bp = Blueprint('collections_api', __name__)

@collections_bp.route("/api/collections")
def get_collections_route():
    # Sửa lỗi: Tạo một thể hiện (instance) của DocumentHandler
    handler = DocumentHandler()
    collection_ids = handler.get_all_collections()
    return jsonify(collection_ids)

@collections_bp.route("/api/collections/<string:collection_name>/documents", methods=['GET', 'POST'])
def documents_route(collection_name):
    # Sửa lỗi: Tạo một thể hiện của DocumentHandler
    handler = DocumentHandler()
    if request.method == 'GET':
        documents = handler.get_all_documents_from_collection(collection_name)
        return jsonify(documents)
    elif request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid data"}), 400
        if handler.add_document_to_collection(collection_name, data):
            return jsonify({"success": True}), 201
        else:
            return jsonify({"error": "Failed to add document"}), 500

@collections_bp.route("/api/collections/<string:collection_name>/<string:document_id>", methods=['GET', 'PUT', 'DELETE'])
def document_route(collection_name, document_id):
    # Sửa lỗi: Tạo một thể hiện của DocumentHandler
    handler = DocumentHandler()
    if request.method == 'GET':
        document = handler.get_all_documents_from_collectiont(collection_name, document_id)
        if document:
            return jsonify(document)
        else:
            return jsonify({"error": "Document not found"}), 404
    elif request.method == 'PUT':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid data"}), 400
        if handler.update_document_in_collection(collection_name, document_id, data):
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Failed to update document"}), 500
    elif request.method == 'DELETE':
        if handler.delete_document_from_collection(collection_name, document_id):
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Failed to delete document"}), 500
@collections_bp.route("/api/items")
def get_items_for_dropdown():
    """
    API endpoint để lấy tất cả các mục từ collection 'items'
    để sử dụng cho dropdown trên trang Quản lý.
    """
    try:
        items = DocumentHandler.get_all_documents_from_collection('items')
        return jsonify(items)
    except Exception as e:
        print(f"Error fetching items: {e}")
        return jsonify({"error": str(e)}), 500