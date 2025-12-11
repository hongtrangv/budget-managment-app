from flask import Blueprint, jsonify, render_template, abort
from google.cloud.firestore_v1.base_query import FieldFilter
from src.database.generic_queries import CRUDApi
from src.database.firebase_config import db
from src.api.auth import require_api_key, require_action

# Update Blueprint to include template folder
books_bp = Blueprint('books_bp', __name__, template_folder='../../templates', static_folder='../../static')

books_crud = CRUDApi('books')

@books_bp.route('/api/shelves', methods=['GET'])
def get_shelves_layout():
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

# --- Routes for serving HTML content fragments ---

@books_bp.route('/shelf/<int:row_index>/<int:unit_index>/<int:comp_index>')
def shelf_books_content(row_index, unit_index, comp_index):
    """Serves the HTML fragment for the page that lists books on a specific shelf."""
    try:
        books_query = db.collection('books').where(filter=FieldFilter('rowIndex', '==', row_index)).where(filter=FieldFilter('unitIndex', '==', unit_index)).where(filter=FieldFilter('compIndex', '==', comp_index)).stream()
        books_list = []
        for book in books_query:
            book_data = book.to_dict()
            book_data['id'] = book.id
            books_list.append(book_data)
        return render_template('pages/shelf_books.html', books=books_list, row_index=row_index, unit_index=unit_index, comp_index=comp_index)
    except Exception as e:
        print(f"Error fetching books for shelf: {e}")
        abort(500)

@books_bp.route('/book/<string:book_id>')
def book_detail_content(book_id):
    """Serves the HTML fragment for the book detail page."""
    try:
        book_ref = db.collection('books').document(book_id)
        book = book_ref.get()
        if not book.exists:
            abort(404)
        book_data = book.to_dict()
        return render_template('pages/book_detail.html', book=book_data)
    except Exception as e:
        print(f"Error fetching book {book_id}: {e}")
        abort(500)
