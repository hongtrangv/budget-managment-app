from flask import Blueprint, jsonify, request, render_template

# CORRECT: Import the API client instead of direct database queries
from src.services.api_client import APIGatewayClient, APIGatewayError
from src.api.auth import get_user_from_session, require_action

admin_bp = Blueprint('admin_bp', __name__)

# --- APIs FOR USER APPROVAL (Now using API Gateway) ---

@admin_bp.route('/api/admin/inactive-users', methods=['GET'])
def get_inactive_users():
    """API endpoint to fetch all users that are not yet active via the API Gateway."""
    user_context = get_user_from_session()
    print(f"User Context: {user_context.get('role')}")
    if user_context.get('role') != 'admin':
        return jsonify({"status": "error", "message": "Không có quyền truy cập"}), 403

    try:
        # 1. Initialize the API Gateway Client
        client = APIGatewayClient()
        
        # 2. Make the request to the API Gateway
        # We assume the gateway has an endpoint to filter users by status
        response_data = client.get('/api/users/active/false')
        
        # 3. Extract and return the data
        inactive_users = response_data.get('data', [])
        if not isinstance(inactive_users, list):
             return jsonify({"status": "error", "message": "Dữ liệu trả về từ API Gateway không hợp lệ."}), 500

        return jsonify({"status": "success", "users": inactive_users})

    except APIGatewayError as e:
        # Forward the error from the gateway to the frontend
        return jsonify({"status": "error", "message": e.message}), e.status_code
    except Exception as e:
        # Handle unexpected errors in the Flask app itself
        print(f"[Admin API] Unexpected error fetching inactive users: {e}")
        return jsonify({"status": "error", "message": "Lỗi hệ thống ngoài dự kiến."}), 500


@admin_bp.route('/api/admin/approve-user', methods=['PUT'])
def approve_user():
    """API endpoint to approve a user via the API Gateway."""
    user_context = get_user_from_session()
    if user_context.get('role') != 'admin':
        return jsonify({"status": "error", "message": "Không có quyền truy cập"}), 403

    data = request.get_json()
    user_id = data.get('user_id')
    role_id = data.get('role_id')

    if not user_id or not role_id:
        return jsonify({"status": "error", "message": "Thiếu thông tin User ID hoặc Role ID."}), 400

    try:
        # 1. Initialize the API Gateway Client
        client = APIGatewayClient()

        # 2. Define the payload to send to the gateway
        # We assume the gateway has an endpoint to handle user approval
        payload = {
            'username': user_id,
            'rolename': role_id
        }

        # 3. Make the request to the API Gateway
        response_data = client.put('/api/users/approve', payload)

        # 4. Return the success message from the gateway
        return jsonify({
            "status": "success", 
            "message": response_data.get('message', 'Người dùng đã được duyệt thành công!')
        })

    except APIGatewayError as e:
        # Forward the error from the gateway to the frontend
        return jsonify({"status": "error", "message": e.message}), e.status_code
    except Exception as e:
        # Handle unexpected errors
        print(f"[Admin API] Unexpected error approving user {user_id}: {e}")
        return jsonify({"status": "error", "message": "Lỗi hệ thống ngoài dự kiến."}), 500
