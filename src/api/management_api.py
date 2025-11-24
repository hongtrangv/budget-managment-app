from flask import Blueprint, jsonify, request
from src.database import firestore_queries

# Create a Blueprint. This is a way to organize a group of related routes and views.
management_api = Blueprint('management_api', __name__, url_prefix='/api/management')

@management_api.route('/tree/structure', methods=['GET'])
def get_tree_structure():
    """API endpoint to get the year/month tree structure for the management page."""
    try:
        tree_data = firestore_queries.get_management_data_tree()
        return jsonify(tree_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@management_api.route('/items/<year>/<month>', methods=['GET', 'POST'])
def handle_items(year, month):
    """Handles fetching all items for a month (GET) and adding a new item (POST)."""
    if request.method == 'POST':
        try:
            data = request.json
            if not data or 'Tên' not in data or 'Số tiền' not in data or 'date' not in data:
                return jsonify({'error': 'Missing required fields'}), 400
            
            new_item_id = firestore_queries.add_item_for_month(year, month, data)
            
            if new_item_id:
                # After creating, fetch the specific item to return to the client
                # This is more efficient than fetching all items again.
                items = firestore_queries.get_items_for_month(year, month)
                created_item = next((item for item in items if item['id'] == new_item_id), None)
                if created_item:
                    return jsonify(created_item), 201
                else:
                    # This case is unlikely but handled for robustness
                    return jsonify({'error': 'Failed to retrieve newly created item'}), 500
            else:
                return jsonify({'error': 'Failed to create new item in database'}), 500

        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    else: # GET Request
        try:
            items = firestore_queries.get_items_for_month(year, month)
            return jsonify(items), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@management_api.route('/items/<year>/<month>/<item_id>', methods=['PUT', 'DELETE'])
def handle_item_by_id(year, month, item_id):
    """Handles updating (PUT) and deleting (DELETE) a specific item."""
    if request.method == 'PUT':
        try:
            data = request.json
            if not data:
                return jsonify({'error': 'No data provided for update'}), 400

            if firestore_queries.update_item_for_month(year, month, item_id, data):
                # Fetch and return the updated item to confirm changes
                items = firestore_queries.get_items_for_month(year, month)
                updated_item = next((item for item in items if item['id'] == item_id), None)
                if updated_item:
                    return jsonify(updated_item), 200
                else:
                    return jsonify({"message": "Update successful, but failed to retrieve item."}), 200
            else:
                return jsonify({'error': 'Update failed in database'}), 500

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            if firestore_queries.delete_item_for_month(year, month, item_id):
                return jsonify({'message': 'Item deleted successfully'}), 200
            else:
                return jsonify({'error': 'Delete failed in database'}), 500
        except Exception as e:
            return jsonify({'error': str(e)}), 500
