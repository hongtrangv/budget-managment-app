import os
from flask import Flask, send_file, jsonify, request
from collections import defaultdict
from src.database.firestore_queries import (
    get_all_collections, 
    get_all_documents_from_collection, 
    get_document_from_collection,
    add_document_to_collection,
    delete_document_from_collection,
    update_document_in_collection,
    get_management_data_tree  # Import hàm mới
)

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# === CÁC TUYẾN HIỂN THỊ TRANG ===
@app.route("/")
def index():
    return send_file('src/index.html')

@app.route('/components/menu')
def menu():
    return send_file('src/components/menu.html')

@app.route('/pages/home')
def home():
    return send_file('src/pages/home.html')

@app.route('/pages/collections')
def collections_page():
    return send_file('src/pages/collections.html')

@app.route('/pages/management')
def management_page():
    return send_file('src/pages/management.html')

@app.route('/src/components/ui.js')
def ui_js():
    return send_file('src/components/ui.js')

# === CÁC TUYẾN API ===

@app.route("/api/management/tree")
def get_management_tree():
    """Lấy dữ liệu chi tiêu đã được cấu trúc sẵn từ Firestore."""
    try:
        # Gọi hàm mới để lấy cây dữ liệu đã được xử lý
        tree = get_management_data_tree()
        return jsonify(tree)

    except Exception as e:
        print(f"Error getting management tree: {e}")
        return jsonify({"error": "Failed to get data tree"}), 500

@app.route("/api/collections")
def get_collections_route():
    collection_ids = get_all_collections()
    return jsonify(collection_ids)

@app.route("/api/collections/<string:collection_name>/documents", methods=['GET', 'POST'])
def documents_route(collection_name):
    if request.method == 'GET':
        documents = get_all_documents_from_collection(collection_name)
        return jsonify(documents)
    elif request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid data"}), 400
        if add_document_to_collection(collection_name, data):
            return jsonify({"success": True}), 201
        else:
            return jsonify({"error": "Failed to add document"}), 500

@app.route("/api/collections/<string:collection_name>/<string:document_id>", methods=['GET', 'PUT', 'DELETE'])
def document_route(collection_name, document_id):
    if request.method == 'GET':
        document = get_document_from_collection(collection_name, document_id)
        if document:
            return jsonify(document)
        else:
            return jsonify({"error": "Document not found"}), 404
    elif request.method == 'PUT':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid data"}), 400
        if update_document_in_collection(collection_name, document_id, data):
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Failed to update document"}), 500
    elif request.method == 'DELETE':
        if delete_document_from_collection(collection_name, document_id):
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Failed to delete document"}), 500

def main():
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))

if __name__ == "__main__":
    main()
