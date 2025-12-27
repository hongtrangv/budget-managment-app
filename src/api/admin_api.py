import json
import uuid
from functools import wraps
from flask import Blueprint, jsonify, request, render_template, session, redirect

admin_bp = Blueprint('admin_bp', __name__)

# --- Decorators ---



MENU_FILE_PATH = 'data/menu.json'

# --- Helper Functions ---

def read_menu_data():
    """Reads the entire menu data from the JSON file."""
    try:
        with open(MENU_FILE_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def write_menu_data(data):
    """Writes the entire menu data to the JSON file."""
    with open(MENU_FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# --- API Routes for Menu Administration ---

@admin_bp.route('/api/admin/menu', methods=['GET'])
def get_all_menu_items():
    """API endpoint to get the full list of menu items for admin purposes."""
    user_roles = session.get('roles', [])
    if 'admin' not in user_roles:
        return jsonify({"error": "Permission denied. Administrator access required."}), 403
        
    menu_data = read_menu_data()
    return jsonify(menu_data)

@admin_bp.route('/api/admin/menu', methods=['POST'])
def create_menu_item():
    """API endpoint to create a new menu item."""
    user_roles = session.get('roles', [])
    if 'admin' not in user_roles:
        return jsonify({"error": "Permission denied."}), 403

    data = request.json
    if not data or 'text' not in data or 'url' not in data:
        return jsonify({"error": "Missing required fields: text, url"}), 400

    menu_items = read_menu_data()
    
    new_item = {
        "id": str(uuid.uuid4()),
        "text": data.get('text'),
        "url": data.get('url'),
        "icon": data.get('icon', ''),
        "roles": data.get('roles', [])
    }
    
    menu_items.append(new_item)
    write_menu_data(menu_items)
    
    return jsonify(new_item), 201

@admin_bp.route('/api/admin/menu/<item_id>', methods=['PUT'])
def update_menu_item(item_id):
    """API endpoint to update an existing menu item."""
    user_roles = session.get('roles', [])
    if 'admin' not in user_roles:
        return jsonify({"error": "Permission denied."}), 403

    data = request.json
    menu_items = read_menu_data()
    
    item_found = False
    for i, item in enumerate(menu_items):
        if item.get('id') == item_id:
            menu_items[i]['text'] = data.get('text', item['text'])
            menu_items[i]['url'] = data.get('url', item['url'])
            menu_items[i]['icon'] = data.get('icon', item.get('icon'))
            menu_items[i]['roles'] = data.get('roles', item.get('roles'))
            item_found = True
            break
            
    if not item_found:
        return jsonify({"error": "Menu item not found"}), 404

    write_menu_data(menu_items)
    return jsonify({"message": "Menu item updated successfully"})

@admin_bp.route('/api/admin/menu/<item_id>', methods=['DELETE'])
def delete_menu_item(item_id):
    """API endpoint to delete a menu item."""
    user_roles = session.get('roles', [])
    if 'admin' not in user_roles:
        return jsonify({"error": "Permission denied."}), 403

    menu_items = read_menu_data()
    original_length = len(menu_items)
    
    menu_items = [item for item in menu_items if item.get('id') != item_id]
    
    if len(menu_items) == original_length:
        return jsonify({"error": "Menu item not found"}), 404

    write_menu_data(menu_items)
    return jsonify({"message": "Menu item deleted"}), 200


# --- View Route for the Admin Page ---

@admin_bp.route('/admin/menu')
def menu_admin_page():
    """Serves the menu administration page."""
    user_roles = session.get('roles', [])    
    
    return render_template('pages/admin_menu.html')
