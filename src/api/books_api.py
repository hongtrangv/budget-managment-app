from flask import Blueprint, jsonify
from src.database.generic_queries import CRUDApi
from src.database.firebase_config import db
from src.api.auth import require_api_key, require_action # Import the decorators

# Create a Blueprint for book and shelf management
books_bp = Blueprint('books_bp', __name__)

# Initialize the generic CRUD API for the 'books' collection
books_crud = CRUDApi('books')

# --- Layout API Endpoint ---

@books_bp.route('/api/shelves', methods=['GET'])
def get_shelves_layout():
    """
    API endpoint to get the library layout from the 'shelves' collection in Firestore.
    """
    try:
        shelves_query = db.collection('shelves').order_by('row').order_by('order').stream()
        rows = {}
        for shelf_doc in shelves_query:
            shelf_data = shelf_doc.to_dict()
            row_num = shelf_data.get('row', 1)
            unit = {
                'type': shelf_data.get('orientation', 'vertical'),
                'compartments': shelf_data.get('compartments', 1)
            }
            if row_num not in rows:
                rows[row_num] = []
            rows[row_num].append(unit)
        layout = [{'units': rows[row_num]} for row_num in sorted(rows.keys())]
        if not layout:
             layout = [
                {'units': [{'type': 'vertical', 'compartments': 5}]},
                {'units': [{'type': 'horizontal', 'compartments': 5}]}
             ]
        return jsonify(layout), 200
    except Exception as e:
        print(f"ERROR in /api/shelves: {e}")
        return jsonify({"error": "Failed to fetch shelf layout."}), 500


# --- Book API Endpoints (Protected by Action) ---

@books_bp.route('/api/books', methods=['GET'])
def get_all_books():
    return books_crud.get_all()

@books_bp.route('/api/books', methods=['POST'])
@require_api_key
@require_action
def add_new_book():
    return books_crud.create()

@books_bp.route('/api/books/<string:doc_id>', methods=['GET'])
def get_one_book(doc_id):
    return books_crud.get_one(doc_id)

@books_bp.route('/api/books/<string:doc_id>', methods=['PUT'])
@require_api_key
@require_action
def update_existing_book(doc_id):
    return books_crud.update(doc_id)

@books_bp.route('/api/books/<string:doc_id>', methods=['DELETE'])
@require_api_key
@require_action
def delete_existing_book(doc_id):
    return books_crud.delete(doc_id)
