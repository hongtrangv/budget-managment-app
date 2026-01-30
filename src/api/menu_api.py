from flask import Blueprint, jsonify, session

menu_bp = Blueprint('menu_bp', __name__)

# Cấu hình menu với thông tin đăng nhập
MENU_CONFIG = [
    {
        "id": "home",
        "name": "Trang chủ",
        "path": "/",
        "icon": "home",
        "require_login": False,  # Không cần đăng nhập
        "order": 1
    },
    {
        "id": "management", 
        "name": "Quản lý",
        "path": "/management",
        "icon": "management",
        "require_login": True,  # Cần đăng nhập
        "order": 2
    },
    {
        "id": "loan-payment",
        "name": "Trả nợ", 
        "path": "/loan-payment",
        "icon": "loan",
        "require_login": True,  # Cần đăng nhập
        "order": 3
    },
    {
        "id": "collections",
        "name": "Danh mục",
        "path": "/collections", 
        "icon": "collections",
        "require_login": False,  # Không cần đăng nhập
        "order": 4
    },
    {
        "id": "bookstore",
        "name": "Thư viện",
        "path": "/bookstore",
        "icon": "book",
        "require_login": False,  # Không cần đăng nhập
        "order": 5
    },
    {
        "id": "chatbot",
        "name": "Chat bot",
        "path": "#chatbot",
        "icon": "chat",
        "require_login": False,  # Không cần đăng nhập
        "order": 6,
        "is_button": True  # Đánh dấu là button thay vì link
    }
]

@menu_bp.route('/api/menu')
def get_menu():
    """
    Trả về cấu trúc menu dựa trên trạng thái đăng nhập của người dùng.
    Nếu đã đăng nhập: trả về tất cả menu
    Nếu chưa đăng nhập: chỉ trả về menu có require_login = False
    """
    is_logged_in = session.get('logged_in', False)
    
    if is_logged_in:
        # Nếu đã đăng nhập, có thể sử dụng menu từ session hoặc MENU_CONFIG
        menu_from_session = session.get('menus', [])
        
        if menu_from_session and isinstance(menu_from_session, list):
            # Sử dụng menu từ session (từ API Gateway)
            transformed_items = [
                {
                    "url": item.get('path'),      # Map 'path' to 'url'
                    "icon": item.get('icon'),     # 'icon' key is the same
                    "text": item.get('name')      # Map 'name' to 'text'
                }
                for item in menu_from_session
            ]
        else:
            # Fallback: sử dụng MENU_CONFIG và trả về tất cả menu
            transformed_items = [
                {
                    "url": item.get('path'),
                    "icon": item.get('icon'),
                    "text": item.get('name')
                }
                for item in sorted(MENU_CONFIG, key=lambda x: x.get('order', 999))
            ]
        
        menu = {"items": transformed_items}
    else:
        # Nếu chưa đăng nhập, chỉ trả về menu không cần đăng nhập
         # Menu for non-logged-in users
        transformed_items = [
                #{"url": "/", "icon": "home", "text": "Trang chủ"},
                {"url": "/bookstore", "icon": "book", "text": "Nhà sách"},
                #{"url": "/login", "icon": "login", "text": "Đăng nhập"},
                #{"url": "/register", "icon": "register", "text": "Đăng ký"},
                #{"url": "/calendar", "icon": "register", "text": "Lịch công việc"},
                # === CORRECTED MENU ITEM URL ===
                #{"url": "/dnd-list", "icon": "register", "text": "Sắp xếp Kéo-Thả"}
        ]
                
        # transformed_items = [
        #     {
        #         "url": item.get('path'),
        #         "icon": item.get('icon'),
        #         "text": item.get('name')
        #     }
        #     for item in menu_from_session 
        #     if not item.get('require_login', False)
        # ]
        
        menu = {"items": transformed_items}
    
    return jsonify(menu)
