import os
from functools import wraps
from flask import request, jsonify

# Lấy khóa API bí mật từ biến môi trường
API_SECRET_KEY = os.environ.get('API_SECRET_KEY')

def require_api_key(f):
    """
    Decorator để yêu cầu khóa API cho một route.
    Khóa API phải được gửi trong header 'X-API-KEY'.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Bỏ qua kiểm tra nếu không có khóa nào được cấu hình (cho môi trường dev/test)
        if not API_SECRET_KEY:
            return f(*args, **kwargs)

        # Lấy khóa từ header của request
        provided_key = request.headers.get('X-API-KEY')

        # So sánh khóa được cung cấp với khóa bí mật
        if not provided_key or provided_key != API_SECRET_KEY:
            return jsonify({"error": "Unauthorized. Invalid or missing API Key."}), 401

        return f(*args, **kwargs)
    return decorated_function
