from flask import Blueprint, jsonify
from src.database.firestore_queries import ManagementTree

# Tạo một Blueprint cho các API của trang quản lý
management_bp = Blueprint('management_api', __name__)

@management_bp.route("/api/management/tree")
def get_management_tree():
    """Lấy dữ liệu cây Năm -> Tháng cho trang quản lý."""
    try:
        tree = ManagementTree.get_data_tree()
        return jsonify(tree)
    except Exception as e:
        print(f"Lỗi khi lấy cây quản lý: {e}")
        return jsonify({"error": "Failed to get data tree"}), 500

@management_bp.route("/api/management/items/<string:year>/<string:month>")
def get_items(year, month):
    """Lấy tất cả các mục chi tiêu cho một tháng cụ thể."""
    try:
        items = ManagementTree.get_items_for_month(year, month)
        return jsonify(items)
    except Exception as e:
        print(f"Lỗi khi lấy các mục chi cho {year}-{month}: {e}")
        return jsonify({"error": "Failed to fetch items"}), 500

@management_bp.route("/api/management/items/<string:year>/<string:month>/<string:type>")
def get_items_type(year, month, type):
    """Lấy tất cả các mục chi tiêu cho một tháng cụ thể."""
    try:
        items = ManagementTree.get_items_for_type(year, month,type)
        return jsonify(items)
    except Exception as e:
        print(f"Lỗi khi lấy các mục chi cho {year}-{month}: {e}")
        return jsonify({"error": "Failed to fetch items"}), 500