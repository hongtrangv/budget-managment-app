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
    return jsonify({
        'logged_in': logged_in,
        'username': username
    })

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
            # Assuming the login endpoint on the APIGW is '/auth/login'
            response_data = client.post('/api/auth/login', {'username': username, 'password': password})

            session['logged_in'] = True
            session['username'] = username
            session['rolename'] = response_data.get('rolename')
            
            
            # You could also store a token from response_data in the session if needed
            # session['jwt_token'] = response_data.get('token')
            
            return jsonify({'status': 'success', 'message': 'Đăng nhập thành công!', 'redirect': '/'})

        except APIGatewayError as e:
            return jsonify({'status': 'error', 'message': e.message}), e.status_code

    # For GET request, render the login page
    return render_template('pages/login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Handles user registration by calling the APIGatewayClient."""
    if request.method == 'POST':
        data = request.get_json()
        
        if data.get('password') != data.get('confirm-password'):
            return jsonify({'status': 'error', 'message': 'Mật khẩu không khớp!'}), 400

        payload = {
            'username': data.get('username'),
            'email': data.get('email'),
            'password': data.get('password')
        }

        try:
            client = APIGatewayClient()
            # Assuming the register endpoint on the APIGW is '/auth/register'
            client.post('/api/users/register', payload)

            return jsonify({'status': 'success', 'message': 'Đăng ký thành công! Vui lòng đăng nhập.', 'redirect': '/'})

        except APIGatewayError as e:
            return jsonify({'status': 'error', 'message': e.message}), e.status_code

    return render_template('pages/register.html')

@auth_bp.route('/logout')
def logout():
    """Logs the user out."""
    session.pop('logged_in', None)
    session.pop('username', None)
    return jsonify({'status': 'success', 'redirect': '/login'})

@auth_bp.route('/admin')
def admin():
    """Serves the admin page (for logged-in users)."""
    if not session.get('logged_in'):
        return jsonify({'status': 'error', 'redirect': '/login'}), 401
    return render_template('pages/admin.html')
