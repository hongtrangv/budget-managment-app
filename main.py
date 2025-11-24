import os
from flask import Flask, send_file, jsonify, request, send_from_directory
from src.database.firestore_queries import (
    get_all_collections, 
    get_all_documents_from_collection, 
    get_document_from_collection,
    add_document_to_collection,
    delete_document_from_collection,
    update_document_in_collection,
    get_management_data_tree,
    get_items_for_month # Import the new function
)

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# === STATIC FILE SERVING ===
@app.route('/src/<path:path>')
def send_src(path):
    return send_from_directory('src', path)

# === PAGE RENDERING ROUTES ===
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

# === NEW, EFFICIENT API ROUTES FOR MANAGEMENT PAGE ===

@app.route("/api/management/tree/structure")
def get_management_tree_structure():
    """Returns the tree structure of years and months."""
    try:
        # This function correctly returns a dict like {'2024': ['5', '6']}
        tree_structure = get_management_data_tree()
        return jsonify(tree_structure)
    except Exception as e:
        print(f"Error getting management tree structure: {e}")
        return jsonify({"error": "Failed to get tree structure"}), 500

@app.route("/api/management/items/<int:year>/<int:month>")
def get_management_items_for_month(year, month):
    """Returns the list of spending items for a specific year and month."""
    try:
        # Use the new, correct function to get items
        items = get_items_for_month(year, month)
        return jsonify(items)
    except Exception as e:
        print(f"Error getting items for {year}-{month}: {e}")
        return jsonify({"error": "Failed to get items"}), 500


# === API ROUTES FOR COLLECTIONS PAGE ===

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
        # Use the provided ID from the form if it exists, otherwise let Firestore generate one
        doc_id = data.pop('Danh mục thu chi', None)
        add_document_to_collection(collection_name, data, doc_id=doc_id)
        return jsonify({"success": True}), 201

@app.route("/api/collections/<string:collection_name>/documents/<string:document_id>", methods=['GET', 'PUT', 'DELETE'])
def document_route(collection_name, document_id):
    if request.method == 'GET':
        document = get_document_from_collection(collection_name, document_id)
        return jsonify(document) if document else (jsonify({"error": "Document not found"}), 404)
    elif request.method == 'PUT':
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid data"}), 400
        update_document_in_collection(collection_name, document_id, data)
        return jsonify({"success": True})
    elif request.method == 'DELETE':
        delete_document_from_collection(collection_name, document_id)
        return jsonify({"success": True})

def main():
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))

if __name__ == "__main__":
    main()
