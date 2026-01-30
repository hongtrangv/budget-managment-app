from flask import Blueprint, jsonify, session

menu_bp = Blueprint('menu_bp', __name__)

@menu_bp.route('/api/menu')
def get_menu():
    """
    Returns the menu structure based on the user's login status.
    """
    menu_from_session = session.get('menus', [])
    if 'username' in session:
        # Menu for logged-in users
        # 1. Retrieve the raw menu data stored in the session during login.
        #menu_from_session = session.get('menus', [])

        # Handle cases where the menu might be missing or not a list.
        if not isinstance(menu_from_session, list):
            menu_from_session = []

        # 2. Transform the data structure.
        # We map the session data keys (path, name) to the keys expected by the frontend (url, text).
        transformed_items = [
            {
                "url": item.get('path'),      # Map 'path' to 'url'
                "icon": item.get('icon'),     # 'icon' key is the same
                "text": item.get('name')      # Map 'name' to 'text'
            }
            for item in menu_from_session
        ]

        # 3. Wrap the transformed list in the final dictionary structure.
        menu = {"items": transformed_items}        
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
