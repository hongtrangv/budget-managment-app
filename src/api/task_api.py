
from flask import Blueprint, request, jsonify, session
from ..services.api_client import APIGatewayClient, APIGatewayError

task_bp = Blueprint('task_bp', __name__, template_folder='../../templates', static_folder='../../static')

@task_bp.route('/api/tasks', methods=['GET'])
def get_tasks():
    """
    Lấy công việc cho người dùng đã đăng nhập hoặc tất cả công việc nếu là admin.
    Lọc theo ngày nếu có.
    """   
    if 'username' not in session:
        return jsonify({"message": "Người dùng chưa đăng nhập."}), 401

    task_date = request.args.get('date')
    current_user = session['username']
    # Safely get user roles, default to an empty list to prevent TypeErrors
    user_roles = session.get('roles', []) 
    is_admin = 'admin' in user_roles

    params = {'date': task_date}
    # If the user is not an admin, they can only see tasks assigned to them.
    # This check is now safe because user_roles is guaranteed to be a list.
    if not is_admin:
        params['assignee'] = current_user
    else:
        params['assignee'] = ''

    # Admins can see all tasks for the given date, so we don't add the assignee filter.

    try:
        client = APIGatewayClient()
        tasks_response = client.get('/api/tasks', params=params)       
        tasks = tasks_response.get('data', [])
         # Security Enhancement: If the user is not an admin, remove the 'assignee' field
        # from the data before sending it to the client.
        if not is_admin:
            for task in tasks:
                if 'assignee' in task:
                    del task['assignee'] # Remove sensitive field for non-admins
      
        return jsonify(tasks)
    except APIGatewayError as e:
        return jsonify({"message": e.message}), e.status_code
    except Exception as e:
        return jsonify({"message": f"Lỗi hệ thống không xác định: {e}"}), 500

@task_bp.route('/api/tasks', methods=['POST'])
def create_task():
    """
    Tạo một công việc mới.
    Thông tin người tạo sẽ được lấy từ session.
    """
    if 'username' not in session:
        return jsonify({"message": "Yêu cầu đăng nhập để tạo công việc."}), 401

    data = request.get_json()
    
    # --- Validation ---
    required_fields = ['description', 'assignee', 'date', 'dueDate']
    if not all(k in data for k in required_fields):
        return jsonify({"message": "Dữ liệu thiếu các trường bắt buộc: description, assignee, date, dueDate."}), 400

    # --- Prepare Payload ---
    payload = {
        'description': data.get('description'),
        'assignee': data.get('assignee'), # Username of the person responsible for the task
        'date': data.get('date'),         # The date the task is scheduled for (e.g., on a calendar)
        'dueDate': data.get('dueDate'),   # The actual deadline for the task
        'createdBy': session['username'],  # The user who created the task
        'isView': '',                   # Default value
        'complete': ''                  # Default value
    }
    print(f'Payload:', payload)
    try:
        client = APIGatewayClient()
        # Gửi payload đã được chuẩn hóa đến API Gateway
        response = client.post('/api/tasks', data=payload)
        return jsonify(response), 201
    except APIGatewayError as e:
        return jsonify({"message": e.message}), e.status_code
    except Exception as e:
        return jsonify({"message": f"Lỗi hệ thống không xác định: {e}"}), 500

@task_bp.route('/api/tasks/createdBy', methods=['GET'])
def get_task_by_me():
    """
    Lấy dữ liệu task được tạo bới user đăng nhập
    """
    if 'username' not in session:
        return jsonify({"message": "Yêu cầu đăng nhập để tạo công việc."}),
    createdBy = session['username']    
    try:
        client = APIGatewayClient()
        tasks_response = client.get(f'/api/tasks/created-by/{createdBy}')

        return jsonify(tasks_response)
    except APIGatewayError as e:
        return jsonify({"message": e.message}), e.status_code
    except Exception as e:
        return jsonify({"message": f"Lỗi hệ thống không xác định: {e}"}), 500
    