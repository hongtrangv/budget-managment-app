from src.database.firebase_config import db
from collections import defaultdict
import datetime

def get_all_collections():
    """Lấy ID của tất cả các bộ sưu tập cấp cao nhất."""
    return [collection.id for collection in db.collections()]

def get_document_from_collection(collection_name, document_id):
    """Lấy một tài liệu duy nhất từ một bộ sưu tập cấp cao nhất."""
    try:
        doc_ref = db.collection(collection_name).document(document_id)
        doc = doc_ref.get()
        if doc.exists:
            doc_data = doc.to_dict()
            doc_data['Danh mục thu chi'] = doc.id
            return doc_data
        return None
    except Exception as e:
        print(f"An error occurred while fetching a document: {e}")
        return None

def get_all_documents_from_collection(collection_name):
    """Lấy tất cả tài liệu từ một bộ sưu tập cấp cao nhất."""
    try:
        docs = db.collection(collection_name).stream()
        results = []
        for doc in docs:
            doc_data = doc.to_dict()
            if doc_data is None: doc_data = {}
            doc_data['Danh mục thu chi'] = doc.id
            results.append(doc_data)
        return results
    except Exception as e:
        print(f"An error occurred while fetching all documents: {e}")
        return []

def add_document_to_collection(collection_name, data):
    """Thêm một tài liệu mới vào bộ sưu tập cấp cao nhất."""
    try:
        doc_id = data.get('Danh mục thu chi')
        if not doc_id:
            raise ValueError("Document ID ('Danh mục thu chi') is required.")
        doc_ref = db.collection(collection_name).document(doc_id)
        if doc_ref.get().exists:
            raise ValueError(f"Document with ID '{doc_id}' already exists.")
        
        document_content = data.copy()
        document_content.pop('Danh mục thu chi', None)
        doc_ref.set(document_content)
        return True
    except Exception as e:
        print(f"An error occurred while adding a document: {e}")
        return False

def delete_document_from_collection(collection_name, document_id):
    """Xóa một tài liệu khỏi một bộ sưu tập cấp cao nhất."""
    try:
        db.collection(collection_name).document(document_id).delete()
        return True
    except Exception as e:
        print(f"An error occurred: {e}")
        return False

def update_document_in_collection(collection_name, original_doc_id, data):
    """Cập nhật một tài liệu trong bộ sưu tập cấp cao nhất."""
    try:
        new_doc_id = data.get('Danh mục thu chi')
        if not new_doc_id or new_doc_id == original_doc_id:
            doc_ref = db.collection(collection_name).document(original_doc_id)
            update_data = data.copy()
            update_data.pop('Danh mục thu chi', None)
            doc_ref.update(update_data)
        else:
            # ID has changed, so create new and delete old
            new_doc_ref = db.collection(collection_name).document(new_doc_id)
            if new_doc_ref.get().exists:
                raise ValueError(f"New document ID '{new_doc_id}' already exists.")
            new_data_content = data.copy()
            new_data_content.pop('Danh mục thu chi', None)
            new_doc_ref.set(new_data_content)
            db.collection(collection_name).document(original_doc_id).delete()
        return True
    except Exception as e:
        print(f"An error occurred while updating: {e}")
        return False

def get_management_data_tree():
    """Lấy cấu trúc cây từ Firestore: Năm -> Tháng."""
    try:
        tree = defaultdict(list)
        for year_doc in db.collection('Year').stream():
            months = [month_doc.id for month_doc in year_doc.reference.collection('Months').stream()]
            tree[year_doc.id] = sorted(months, key=int, reverse=True)
        return dict(tree)
    except Exception as e:
        print(f"Error getting management tree: {e}")
        return {}

def get_items_for_month(year, month):
    """Lấy tất cả các mục chi tiêu cho một tháng và năm cụ thể."""
    try:
        items_ref = db.collection('Year').document(str(year)).collection('Months').document(str(month)).collection('Types').stream()
        results = []
        for doc in items_ref:
            doc_data = doc.to_dict()
            doc_data['id'] = doc.id
            # Convert timestamp to ISO 8601 date string (YYYY-MM-DD)
            if 'date' in doc_data and isinstance(doc_data['date'], datetime.datetime):
                doc_data['date'] = doc_data['date'].strftime('%Y-%m-%d')
            results.append(doc_data)
        return results
    except Exception as e:
        print(f"Error fetching items for {year}-{month}: {e}")
        return []

# --- NEW FUNCTIONS FOR CRUD OPERATIONS ON NESTED ITEMS ---

def add_item_for_month(year, month, data):
    """Thêm một mục mới vào một tháng/năm cụ thể và trả về ID của nó."""
    try:
        # Convert date string from YYYY-MM-DD to a datetime object
        if 'date' in data:
            data['date'] = datetime.datetime.strptime(data['date'], '%Y-%m-%d')
        # Convert amount to a number
        if 'Số tiền' in data:
            data['Số tiền'] = float(data['Số tiền'])

        # Firestore tự động tạo ID nếu .document() được để trống
        item_ref = db.collection('Year').document(str(year)).collection('Months').document(str(month)).collection('Types').document()
        item_ref.set(data)
        return item_ref.id
    except Exception as e:
        print(f"Lỗi khi thêm mục cho {year}-{month}: {e}")
        return None

def update_item_for_month(year, month, item_id, data):
    """Cập nhật một mục hiện có trong một tháng/năm cụ thể."""
    try:
        item_ref = db.collection('Year').document(str(year)).collection('Months').document(str(month)).collection('Types').document(item_id)
        
        # Convert date string from YYYY-MM-DD to a datetime object for storage
        if 'date' in data:
            data['date'] = datetime.datetime.strptime(data['date'], '%Y-%m-%d')
        # Convert amount to a number
        if 'Số tiền' in data:
            data['Số tiền'] = float(data['Số tiền'])

        item_ref.update(data)
        return True
    except Exception as e:
        print(f"Lỗi khi cập nhật mục {item_id} cho {year}-{month}: {e}")
        return False

def delete_item_for_month(year, month, item_id):
    """Xóa một mục khỏi một tháng/năm cụ thể."""
    try:
        db.collection('Year').document(str(year)).collection('Months').document(str(month)).collection('Types').document(item_id).delete()
        return True
    except Exception as e:
        print(f"Lỗi khi xóa mục {item_id} cho {year}-{month}: {e}")
        return False
