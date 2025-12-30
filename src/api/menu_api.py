from flask import Blueprint, jsonify, session

menu_bp = Blueprint('menu_bp', __name__)

@menu_bp.route('/api/menu')
def get_menu():
    """
    Returns the menu structure based on the user's login status.
    """
    if 'username' in session:
        # Menu for logged-in users
        menu = {
            "items": [
                {"url": "/", "icon": "home", "text": "Trang chủ"},
                {"url": "/saving", "icon": "saving", "text": "Tiết kiệm"},
                {"url": "/collections", "icon": "collections", "text": "Sưu tập"},
                {"url": "/management", "icon": "management", "text": "Quản lý"},
                {"url": "/loan-payment", "icon": "loan", "text": "Thanh toán khoản vay"},
                {"url": "/bookstore", "icon": "book", "text": "Nhà sách"},
                {"url": "/calendar", "icon": "register", "text": "Lịch công việc"},
                {"url": "/excel-upload", "icon": "register", "text": "Excel Upload"},
                {"url": "/admin/menu", "icon": "home", "text": "Đăng ký menu"},
                # === CORRECTED MENU ITEM URL ===
                {"url": "/dnd-list", "icon": "register", "text": "Sắp xếp Kéo-Thả"}
            ]
        }
    else:
        # Menu for non-logged-in users
        menu = {
            "items": [
                {"url": "/", "icon": "home", "text": "Trang chủ"},
                {"url": "/bookstore", "icon": "book", "text": "Nhà sách"},
                {"url": "/login", "icon": "login", "text": "Đăng nhập"},
                {"url": "/register", "icon": "register", "text": "Đăng ký"},
                {"url": "/calendar", "icon": "register", "text": "Lịch công việc"},
                # === CORRECTED MENU ITEM URL ===
                {"url": "/dnd-list", "icon": "register", "text": "Sắp xếp Kéo-Thả"}
            ]
        }
    return jsonify(menu)
