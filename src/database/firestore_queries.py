from src.database.firebase_config import db
from collections import defaultdict

def get_all_collections():
    collections = db.collections()
    collection_ids = [collection.id for collection in collections]
    return collection_ids

def get_document_from_collection(collection_name, document_id):
    """Lấy một tài liệu duy nhất từ một bộ sưu tập được chỉ định."""
    try:
        doc_ref = db.collection(collection_name).document(document_id)
        doc = doc_ref.get()
        if doc.exists:
            doc_data = doc.to_dict()
            doc_data['Danh mục thu chi'] = doc.id
            return doc_data
        else:
            return None
    except Exception as e:
        print(f"An error occurred while fetching a document: {e}")
        return None

def get_all_documents_from_collection(collection_name):
    """Lấy tất cả tài liệu từ một bộ sưu tập được chỉ định."""
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

def get_management_data_tree():
    """
    Lấy dữ liệu từ Firestore theo cấu trúc lồng nhau: Year -> Months.
    Trả về một dict với các năm là key và danh sách tháng là value.
    """
    try:        
        tree = defaultdict(list)
        year_docs = db.collection('Year').stream()
        
        for year_doc in year_docs:
            year_id = year_doc.id           
            month_docs = year_doc.reference.collection('Months').stream()
            
            months_list = []
            for month_doc in month_docs:
                month_id = month_doc.id                
                months_list.append(month_id)
            
            tree[year_id] = sorted(months_list)
        return dict(tree)

    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu cây quản lý từ Firestore: {e}")
        return {}

def get_items_for_month(year, month):
    """Lấy tất cả các mục chi tiêu cho một tháng và năm cụ thể."""
    try:
        items_ref = db.collection('Year').document(str(year)).collection('Months').document(str(month)).collection('Types')
        docs = items_ref.stream()
        results = []
        for doc in docs:
            doc_data = doc.to_dict()
            if doc_data is None: doc_data = {}
            doc_data['id'] = doc.id
            results.append(doc_data)
        return results
    except Exception as e:
        print(f"An error occurred while fetching items for {year}-{month}: {e}")
        return []

def add_document_to_collection(collection_name, data):
    """
    Thêm một tài liệu mới sử dụng 'Danh mục thu chi' từ dữ liệu làm ID.
    """
    try:
        doc_id = data.get('Danh mục thu chi')
        if not doc_id:
            print("Error: Document ID ('Danh mục thu chi') is required for creation.")
            return False

        doc_ref = db.collection(collection_name).document(doc_id)
        if doc_ref.get().exists:
            print(f"Error: A document with ID '{doc_id}' already exists.")
            return False

        document_content = data.copy()
        document_content.pop('Danh mục thu chi', None)

        doc_ref.set(document_content)
        return True
    except Exception as e:
        print(f"An error occurred while adding a document: {e}")
        return False

def delete_document_from_collection(collection_name, document_id):
    """Xóa một tài liệu khỏi một bộ sưu tập được chỉ định."""
    try:
        db.collection(collection_name).document(document_id).delete()
        return True
    except Exception as e:
        print(f"An error occurred while deleting a document: {e}")
        return False

def update_document_in_collection(collection_name, original_doc_id, data_from_form):
    """
    Cập nhật một tài liệu. Nếu ID tài liệu ('Danh mục thu chi') trong `data_from_form`
    khác với `original_doc_id`, nó sẽ tạo một tài liệu mới và xóa tài liệu cũ.
    """
    try:
        new_doc_id = data_from_form.get('Danh mục thu chi')
        original_doc_ref = db.collection(collection_name).document(original_doc_id)

        if not new_doc_id or new_doc_id == original_doc_id:
            update_data = data_from_form.copy()
            update_data.pop('Danh mục thu chi', None)
            original_doc_ref.update(update_data)
            return True
        else:
            new_doc_ref = db.collection(collection_name).document(new_doc_id)
            if new_doc_ref.get().exists:
                print(f"Error: A document with the new ID '{new_doc_id}' already exists.")
                return False

            new_data_content = data_from_form.copy()
            new_data_content.pop('Danh mục thu chi', None)
            new_doc_ref.set(new_data_content)
            original_doc_ref.delete()
            return True

    except Exception as e:
        print(f"An error occurred while updating a document: {e}")
        return False
