import os
from flask import Flask, send_file, jsonify, request
from collections import defaultdict
from src.database.firestore_queries import (
    get_all_collections, 
    get_all_documents_from_collection, 
    get_document_from_collection,
    add_document_to_collection,
    delete_document_from_collection,
    update_document_in_collection
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
    """Lấy dữ liệu chi tiêu và cấu trúc nó theo dạng cây Năm -> Tháng -> Mục."""
    try:
        items = get_all_documents_from_collection('items')
        
        # Sử dụng defaultdict để dễ dàng nhóm dữ liệu
        tree = defaultdict(lambda: defaultdict(list))

        for item in items:
            date_str = item.get('Ngày') # Lấy trường ngày
            if date_str and isinstance(date_str, str) and '-' in date_str:
                try:
                    parts = date_str.split('-')
                    if len(parts) >= 2:
                        year, month = parts[0], parts[1]
                        # Thêm mục vào đúng nhánh Năm -> Tháng
                        tree[year][month].append(item)
                except (ValueError, IndexError):
                    # Bỏ qua các mục có định dạng ngày không hợp lệ
                    continue
        
        # Chuyển đổi defaultdict thành dict thường để jsonify hoạt động tốt
        dict_tree = {year: dict(months) for year, months in tree.items()}
        
        return jsonify(dict_tree)

    except Exception as e:
        print(f"Error creating management tree: {e}")
        return jsonify({"error": "Failed to create data tree"}), 500

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
