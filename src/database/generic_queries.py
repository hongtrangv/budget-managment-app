from flask import jsonify, request
from .firebase_config import db

class CRUDApi:
    """
    Một lớp generic để xử lý các thao tác CRUD (Create, Read, Update, Delete)
    cho bất kỳ collection nào trong Firestore.
    """
    def __init__(self, collection_name):
        """Khởi tạo với tên của collection."""
        self.collection = db.collection(collection_name)

    def get_all(self):
        """Lấy tất cả các tài liệu từ collection."""
        try:
            docs = self.collection.stream()
            all_docs = [{**doc.to_dict(), 'id': doc.id} for doc in docs]
            return jsonify(all_docs), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def create(self):
        """Tạo một tài liệu mới dựa trên dữ liệu JSON từ request."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Dữ liệu không hợp lệ"}), 400
            
            # Thêm tài liệu mới, Firestore sẽ tự động tạo ID
            update_time, doc_ref = self.collection.add(data)
            return jsonify({"success": True, "id": doc_ref.id}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def get_one(self, doc_id):
        """Lấy một tài liệu cụ thể bằng ID."""
        try:
            doc = self.collection.document(doc_id).get()
            if not doc.exists:
                return jsonify({"error": "Tài liệu không tồn tại"}), 404
            return jsonify({**doc.to_dict(), 'id': doc.id}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def update(self, doc_id):
        """Cập nhật một tài liệu đã có bằng ID."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Dữ liệu không hợp lệ"}), 400
            
            doc_ref = self.collection.document(doc_id)
            doc_ref.update(data)
            return jsonify({"success": True, "id": doc_id}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def delete(self, doc_id):
        """Xóa một tài liệu bằng ID."""
        try:
            self.collection.document(doc_id).delete()
            return jsonify({"success": True}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
