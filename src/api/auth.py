import os
from functools import wraps
from flask import request, jsonify
from .action_config import ACTION_CONFIG # Nhập cấu hình action

# Lấy khóa API bí mật từ biến môi trường
API_SECRET_KEY = os.environ.get('API_SECRET_KEY')

def require_api_key(f):
    """
    Decorator để yêu cầu khóa API cho một route.
    Khóa API phải được gửi trong header 'X-API-KEY'.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not API_SECRET_KEY:
            return f(*args, **kwargs)
        provided_key = request.headers.get('X-API-KEY')
        if not provided_key or provided_key != API_SECRET_KEY:
            return jsonify({"error": "Unauthorized. Invalid or missing API Key."}), 401
        return f(*args, **kwargs)
    return decorated_function

def require_action(f):
    """
    Decorator để xác thực X-Action-Identifier dựa trên cấu hình tập trung.
    Nó sử dụng `request.endpoint` để tra cứu các action được phép trong ACTION_CONFIG.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # `request.endpoint` trả về 'blueprint_name.function_name'
        endpoint = request.endpoint
        allowed_actions = ACTION_CONFIG.get(endpoint)

        # Nếu endpoint không được cấu hình, từ chối quyền truy cập theo mặc định
        if allowed_actions is None:
            print(f"CẢNH BÁO BẢO MẬT: Endpoint '{endpoint}' được bảo vệ bởi @require_action nhưng không có trong ACTION_CONFIG.")
            return jsonify({"error": "Forbidden. Action configuration missing for this endpoint."}), 403

        # Lấy action được cung cấp từ header
        provided_action = request.headers.get('X-Action-Identifier')

        # Kiểm tra xem action được cung cấp có trong danh sách được phép không
        if not provided_action or provided_action not in allowed_actions:
            return jsonify({
                "error": "Forbidden. This action is not permitted for this endpoint.",
                "allowed_actions": allowed_actions,
                "provided_action": provided_action or "None"
            }), 403
        
        return f(*args, **kwargs)
    return decorated_function
