
from flask import Blueprint, request, jsonify, session
from ..services.api_client import APIGatewayClient, APIGatewayError

task_bp = Blueprint('task_bp', __name__, template_folder='../../templates', static_folder='../../static')

@task_bp.route('/api/tasks', methods=['GET'])
def get_tasks():
    """
    Lấy công việc cho người dùng đã đăng nhập vào một ngày cụ thể.
    """   
    if 'username' not in session:
        return jsonify({"message": "Người dùng chưa đăng nhập."}), 401

    user_id = session['username']
    task_date = request.args.get('date')

    if not task_date:
        return jsonify({"message": "Thiếu tham số ngày tháng."}), 400

    try:
        client = APIGatewayClient()
        # Endpoint giả định là 'tasks' và chúng ta lọc theo user_id và date
        # API Gateway sẽ chịu trách nhiệm chuyển tiếp yêu cầu này đến Lambda function phù hợp
        tasks_response= client.get('/api/tasks', params={'assignee': user_id, 'date': task_date})       
        tasks = tasks_response.get('data', []);        
        return jsonify(tasks)
    except APIGatewayError as e:
        return jsonify({"message": e.message}), e.status_code
    except Exception as e:
        # Ghi log lỗi ở đây nếu cần
        return jsonify({"message": f"Lỗi hệ thống không xác định: {e}"}), 500

@task_bp.route('/api/tasks', methods=['POST'])
def create_task():
    """
    Tạo một công việc mới cho người dùng đã đăng nhập.
    """
    # if 'username' not in session:
    #     return jsonify({"message": "Người dùng chưa đăng nhập."}), 401

    
    data = request.get_json()
    data['isView']=''
    data['complete']=''
    print(f"data: {data}")
    # Thêm user_id vào dữ liệu công việc trước khi gửi đi
    

    if not all(k in data for k in ['description', 'assignee', 'date']):
        return jsonify({"message": "Dữ liệu đầu vào không hợp lệ. Thiếu các trường bắt buộc."}), 400

    try:
        client = APIGatewayClient()
        # Gửi toàn bộ dữ liệu (bao gồm cả user_id) đến API Gateway
        response = client.post('/api/tasks', data=data)
        return jsonify(response), 201
    except APIGatewayError as e:
        return jsonify({"message": e.message}), e.status_code
    except Exception as e:
        # Ghi log lỗi ở đây nếu cần
        return jsonify({"message": f"Lỗi hệ thống không xác định: {e}"}), 500

