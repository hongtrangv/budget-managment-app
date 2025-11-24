from flask import Blueprint, jsonify, request

# Database Query Functions
from src.database.firestore_queries import (
    get_all_collections,
    get_all_documents_from_collection,
    get_document_from_collection,
    add_document_to_collection,
    delete_document_from_collection,
    update_document_in_collection
)

# Define the blueprint
# The first argument, 'collections_api', is the name of the blueprint.
# The second argument, __name__, helps Flask locate the blueprint.
# The url_prefix will be added to all routes defined in this blueprint.
collections_api = Blueprint('collections_api', __name__, url_prefix='/api')


@collections_api.route("/collections")
def get_collections_route():
    """Returns a list of all available collection IDs."""
    collection_ids = get_all_collections()
    return jsonify(collection_ids)


@collections_api.route("/collections/<string:collection_name>/documents", methods=['GET', 'POST'])
def documents_route(collection_name):
    """Handles getting all documents or creating a new one in a collection."""
    if request.method == 'GET':
        documents = get_all_documents_from_collection(collection_name)
        return jsonify(documents)
    
    elif request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Dữ liệu không hợp lệ"}), 400
        
        # The unique ID for a document is expected to be in the payload.
        # Based on the frontend logic, this field is 'Danh mục thu chi'
        document_id = data.get('Danh mục thu chi')
        if not document_id:
             return jsonify({"error": "Trường ID định danh 'Danh mục thu chi' là bắt buộc."}), 400

        if add_document_to_collection(collection_name, document_id, data):
            return jsonify({"success": True, "id": document_id}), 201
        else:
            # 409 Conflict is appropriate if the ID already exists
            return jsonify({"error": "Không thể tạo mục, ID có thể đã tồn tại."}), 409


@collections_api.route("/collections/<string:collection_name>/documents/<string:document_id>", methods=['GET', 'PUT', 'DELETE'])
def document_route(collection_name, document_id):
    """Handles read, update, and delete for a single document."""
    if request.method == 'GET':
        document = get_document_from_collection(collection_name, document_id)
        if document:
            return jsonify(document)
        else:
            return jsonify({"error": "Không tìm thấy mục"}), 404
    
    elif request.method == 'PUT':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Dữ liệu không hợp lệ"}), 400
        if update_document_in_collection(collection_name, document_id, data):
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Cập nhật thất bại, không tìm thấy mục."}), 404
            
    elif request.method == 'DELETE':
        if delete_document_from_collection(collection_name, document_id):
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Xóa thất bại, không tìm thấy mục."}), 404