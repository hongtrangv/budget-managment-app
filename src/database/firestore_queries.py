from src.database.firebase_config import db
from collections import defaultdict

class DocumentHandler:
    """Lớp xử lý các hoạt động CRUD chung cho tài liệu và bộ sưu tập Firestore."""

    @staticmethod
    def get_all_collections():
        """Lấy ID của tất cả các bộ sưu tập cấp cao nhất."""
        collections = db.collections()
        return [collection.id for collection in collections]

    @staticmethod
    def get_document_from_collection(collection_name, document_id):
        """Lấy một tài liệu duy nhất từ một bộ sưu tập."""
        try:
            doc_ref = db.collection(collection_name).document(document_id)
            doc = doc_ref.get()
            if doc.exists:
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id # Thêm ID để dễ dùng ở frontend
                return doc_data
            return None
        except Exception as e:
            print(f"Lỗi khi lấy tài liệu: {e}")
            return None

    @staticmethod
    def get_all_documents_from_collection(collection_name):
        """Lấy tất cả tài liệu từ một bộ sưu tập."""
        try:
            docs = db.collection(collection_name).stream()
            results = []
            for doc in docs:
                doc_data = doc.to_dict()
                if doc_data is None: doc_data = {}
                doc_data['id'] = doc.id # Thêm ID để dễ dùng ở frontend
                # Đảm bảo trường 'Danh mục thu chi' luôn tồn tại
                if 'Danh mục thu chi' not in doc_data:
                    doc_data['Danh mục thu chi'] = doc.id
                results.append(doc_data)
            return results
        except Exception as e:
            print(f"Lỗi khi lấy tất cả tài liệu: {e}")
            return []

    @staticmethod
    def add_document_to_collection(collection_name, data):
        """Thêm một tài liệu mới với ID được chỉ định."""
        try:
            doc_id = data.get('Danh mục thu chi')
            if not doc_id:
                print("Lỗi: Cần có ID tài liệu ('Danh mục thu chi').")
                return False
            doc_ref = db.collection(collection_name).document(doc_id)
            if doc_ref.get().exists:
                print(f"Lỗi: Tài liệu với ID '{doc_id}' đã tồn tại.")
                return False
            document_content = {k: v for k, v in data.items() if k != 'Danh mục thu chi'}
            doc_ref.set(document_content)
            return True
        except Exception as e:
            print(f"Lỗi khi thêm tài liệu: {e}")
            return False

    @staticmethod
    def delete_document_from_collection(collection_name, document_id):
        """Xóa một tài liệu."""
        try:
            db.collection(collection_name).document(document_id).delete()
            return True
        except Exception as e:
            print(f"Lỗi khi xóa tài liệu: {e}")
            return False

    @staticmethod
    def update_document_in_collection(collection_name, original_doc_id, data_from_form):
        """Cập nhật một tài liệu, xử lý cả việc thay đổi ID."""
        try:
            new_doc_id = data_from_form.get('Danh mục thu chi')
            original_doc_ref = db.collection(collection_name).document(original_doc_id)

            if not new_doc_id or new_doc_id == original_doc_id:
                update_data = {k: v for k, v in data_from_form.items() if k != 'Danh mục thu chi'}
                original_doc_ref.update(update_data)
                return True
            else:
                new_doc_ref = db.collection(collection_name).document(new_doc_id)
                if new_doc_ref.get().exists:
                    print(f"Lỗi: Tài liệu với ID mới '{new_doc_id}' đã tồn tại.")
                    return False
                new_data_content = {k: v for k, v in data_from_form.items() if k != 'Danh mục thu chi'}
                new_doc_ref.set(new_data_content)
                original_doc_ref.delete()
                return True
        except Exception as e:
            print(f"Lỗi khi cập nhật tài liệu: {e}")
            return False

class ManagementTree:
    """Lớp xử lý logic để lấy dữ liệu cho cây quản lý."""

    @staticmethod
    def get_data_tree():
        """
        Lấy dữ liệu từ Firestore theo cấu trúc: Year -> Months.
        """
        try:
            tree = defaultdict(list)
            year_docs = db.collection('Year').stream()
            for year_doc in year_docs:
                year_id = year_doc.id
                month_docs = year_doc.reference.collection('Months').stream()
                months_list = sorted([month.id for month in month_docs], key=int)
                if months_list:
                    tree[year_id] = months_list
            return dict(tree)
        except Exception as e:
            print(f"Lỗi khi lấy dữ liệu cây quản lý: {e}")
            return {}

    @staticmethod
    def get_items_for_month(year, month):
        """Lấy tất cả các mục 'Chi' cho một tháng và năm cụ thể."""
        try:
            # Phải đảm bảo "month" có dạng "Tháng X" để khớp với ID trong Firestore
            month_id = month
            items_ref = db.collection('Year').document(year).collection('Months').document(month_id).collection('Types')
            docs = items_ref.stream()
           
            results = []
            for doc in docs:                 
                print(f"Lấy các mục chi cho {doc.id}")
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id # Gán ID của tài liệu vào dữ liệu trả về
                results.append(doc_data)
            
            print(f"Tìm thấy {len(results)} mục chi cho {month_id}, {year}")
            return results
        except Exception as e:
            print(f"Lỗi khi lấy các mục chi cho {year}-{month}: {e}")
            return []

    @staticmethod
    def get_items_for_type(year, month,type):
        """Lấy tất cả các mục 'Chi' cho một tháng và năm cụ thể."""
        try:
            # Phải đảm bảo "month" có dạng "Tháng X" để khớp với ID trong Firestore
            month_id = month
            items_ref = db.collection('Year').document(year).collection('Months').document(month_id).collection('Types').document(type)
            docs = items_ref.stream()
           
            results = []
            for doc in docs:                 
                print(f"Lấy các mục chi cho {doc.id}")
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id # Gán ID của tài liệu vào dữ liệu trả về
                results.append(doc_data)
            
            print(f"Tìm thấy {len(results)} mục chi cho {month_id}, {year}")
            return results
        except Exception as e:
            print(f"Lỗi khi lấy các mục chi cho {year}-{month}: {e}")
            return []
     