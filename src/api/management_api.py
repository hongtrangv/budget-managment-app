from flask import Blueprint, jsonify, request
from src.database.firestore_queries import ManagementTree
from datetime import datetime

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

@management_bp.route("/api/management/items", methods=['POST'])
def add_new_item():
    """Tạo một mục chi tiêu mới."""
    try:
        data = request.get_json()
        # chuyển lại cách lấy year và month từ thông tin ngày
        # year = data.get('year')
        # month = data.get('month')
        type = data.get('Loại')
        item_name = data.get('Tên')
        amount_str = data.get('Số tiền')
        date_str = data.get('date')        
        # --- VALIDATION LOGIC ---
        if not amount_str:
            return jsonify({"error": "Vui lòng nhập số tiền."}), 400
        if not date_str:
            return jsonify({"error": "Vui lòng nhập ngày chi."})
        try:
            # Cố gắng chuyển đổi sang số. Nếu thành công, nó sẽ được lưu trữ dưới dạng số.
            amount = int(amount_str)
        except (ValueError, TypeError):
            # Nếu chuyển đổi thất bại, trả về lỗi.
            return jsonify({"error": f"'Số tiền' phải là một số. Giá trị '{amount_str}' không hợp lệ."}), 400
        
        try:
            # Cố gắng chuyển đổi sang ngày tháng. Nếu thành công, nó sẽ được lưu trữ dưới dạng date.
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            year = str(date_obj.year)
            month = str(date_obj.month).zfill(2) # Đảm bảo tháng có 2 chữ số (01, 02,...)
        except (ValueError, TypeError):
            # Nếu chuyển đổi thất bại, trả về lỗi.
            return jsonify({"error": f"'Ngày tháng' phải đúng định dạng. Giá trị '{date_str}' không hợp lệ."}), 400
        
        if not all([year, month, item_name, amount, date_str]):
            return jsonify({"error": "Dữ liệu thiếu: year, month, Tên, Số tiền, hoặc date"}), 400

        # Gọi hàm để thêm vào Firestore
        new_item_id = ManagementTree.add_item(year, month, type, {
            'name': item_name,
            'amount': amount,
            'date': date_str
        })
        
        return jsonify({"success": True, "id": new_item_id}), 201
    except Exception as e:
        print(f"Lỗi khi tạo mục mới: {e}")
        return jsonify({"error": "Failed to create new item"}), 500
