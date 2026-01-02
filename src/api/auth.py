from flask import Blueprint, render_template, request, url_for, session, jsonify
from functools import wraps
from src.services.api_client import APIGatewayClient, APIGatewayError

auth_bp = Blueprint('auth_bp', __name__, template_folder='../../templates', static_folder='../../static')

# --- Decorators ---

def require_api_key(f):
    """Decorator to require an API key for a route."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated_function

def require_action(f):
    """Placeholder decorator for action-based authorization."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        print(f"Action required for endpoint {request.endpoint}. (Placeholder)")
        return f(*args, **kwargs)
    return wrapper

# --- API Endpoint for Auth Status ---

@auth_bp.route('/api/auth/status')
def auth_status():
    """Returns the current authentication status from the session."""
    logged_in = session.get('logged_in', False)
    username = session.get('username', None) if logged_in else None
    fullname = session.get('fullname', None) if logged_in else None

    return jsonify({
        'logged_in': logged_in,
        'username': username,
        'fullname': fullname
    })

# --- API Endpoint for User Groups ---
@auth_bp.route('/api/auth/groups')
def get_user_groups():
    """Fetches the list of user groups from the API Gateway."""
    try:
        client = APIGatewayClient()
        response_data = client.get('/api/users/roles')
        groups = response_data.get('data', [])
        return jsonify({'status': 'success', 'groups': groups})
    except APIGatewayError as e:
        return jsonify({'status': 'error', 'message': f'Không thể tải danh sách nhóm quyền: {e.message}'}), e.status_code

# --- API Endpoint for All Users ---
@auth_bp.route('/api/users')
def get_all_users():
    """Fetches the list of all users from the API Gateway for assignee dropdowns."""
    if not session.get('logged_in'):
        return jsonify({'status': 'error', 'message': 'Yêu cầu đăng nhập.'}), 401
    
    try:
        client = APIGatewayClient()
        response_data = client.get('/api/users') 
        users = response_data.get('data', [])
        if not isinstance(users, list):
            raise APIGatewayError("Định dạng dữ liệu người dùng không hợp lệ từ cổng API.", status_code=500)

        return jsonify({'status': 'success', 'users': users})

    except APIGatewayError as e:
        return jsonify({'status': 'error', 'message': f'Không thể tải danh sách người dùng: {e.message}'}), e.status_code

# --- Auth Routes --- 

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Handles user login by calling the APIGatewayClient."""
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        try:
            client = APIGatewayClient()
            response_data = client.post('/api/auth/login', {'username': username, 'password': password})
            
            # Standardize role handling
            roles_from_api = response_data.get("data").get('rolename')
            if roles_from_api is None:
                roles_to_store = []
            elif isinstance(roles_from_api, str):
                roles_to_store = [roles_from_api]
            else:
                roles_to_store = roles_from_api # Assume it's a list

            session['logged_in'] = True
            session['username'] = username
            session['fullname'] = response_data.get("data").get('fullname')
            session['roles'] = roles_to_store
            session['menus'] = response_data.get("data").get('menus')

            return jsonify({'status': 'success', 'message': 'Đăng nhập thành công!', 'redirect': '/'})

        except APIGatewayError as e:
            return jsonify({'status': 'error', 'message': e.message}), e.status_code

    return render_template('pages/login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Handles user registration by calling the APIGatewayClient."""
    if request.method == 'POST':
        data = request.get_json()
        
        if not all(k in data for k in ['username', 'fullname', 'group_id', 'password']):
             return jsonify({'status': 'error', 'message': 'Thiếu thông tin, vui lòng điền đầy đủ các trường.'}), 400

        payload = {
            'username': data.get('username'),
            'fullname': data.get('fullname'),
            'password': data.get('password'),
            'group_id': data.get('group_id')
        }

        try:
            client = APIGatewayClient()
            client.post('/api/users/register', payload)

            return jsonify({'status': 'success', 'message': 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.', 'redirect': '/login'})

        except APIGatewayError as e:
            if 'already exists' in e.message:
                 return jsonify({'status': 'error', 'message': f"Tên đăng nhập '{payload['username']}' đã tồn tại. Vui lòng chọn tên khác."}), e.status_code
            return jsonify({'status': 'error', 'message': e.message}), e.status_code

    return render_template('pages/register.html')

@auth_bp.route('/logout')
def logout():
    """Logs the user out."""
    session.pop('logged_in', None)
    session.pop('username', None)
    session.pop('fullname', None)
    session.pop('roles', None) # Use 'roles'
    return jsonify({'status': 'success', 'redirect': '/login'})

@auth_bp.route('/admin')
def admin():
    """Serves the admin page (for logged-in users)."""
    if not session.get('logged_in'):
        return jsonify({'status': 'error', 'redirect': '/login'}), 401
    return render_template('pages/admin.html')
