import uuid
from flask import Blueprint, jsonify, request
from src.database.firestore_queries import ManagementTree
from datetime import datetime

# Create a Blueprint for the management APIs
management_bp = Blueprint('management_api', __name__)

@management_bp.route("/api/management/tree")
def get_management_tree():
    """Fetches the Year -> Month tree data for the management page."""
    try:
        tree = ManagementTree.get_data_tree()
        return jsonify(tree)
    except Exception as e:
        print(f"Error getting management tree: {e}")
        return jsonify({"error": "Failed to get data tree"}), 500

@management_bp.route("/api/management/items/<string:year>/<string:month>")
def get_items(year, month):
    """Fetches all expense items for a specific month."""
    try:
        items = ManagementTree.get_items_for_month(year, month)
        return jsonify(items)
    except Exception as e:
        print(f"Error getting expense items for {year}-{month}: {e}")
        return jsonify({"error": "Failed to fetch items"}), 500

@management_bp.route("/api/management/items", methods=['POST'])
def add_new_item():
    """Creates a new expense item."""
    try:
        data = request.get_json()
        type_id = data.get('Loại')
        item_name = data.get('Tên')
        amount_str = data.get('Số tiền')
        date_str = data.get('date')
        rate_str = data.get('rate')
        term_str = data.get('term')

        if not amount_str or not date_str:
            return jsonify({"error": "Amount and Date are required."}), 400

        try:
            amount = int(amount_str)
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            year = str(date_obj.year)
            month = str(date_obj.month).zfill(2)
        except (ValueError, TypeError) as e:
            return jsonify({"error": f"Invalid amount or date format: {e}"}), 400

        if not all([year, month, type_id, item_name, amount, date_str]):
            return jsonify({"error": "Missing data: year, month, type, name, amount, or date"}), 400

        record_data = {
            'id': str(uuid.uuid4()), # Assign a unique ID
            'name': item_name,
            'amount': amount,
            'date': date_str
        }

        if type_id == 'Tiết kiệm':
            record_data.update({
                'rate': float(rate_str) if rate_str else 0,
                'term': int(term_str) if term_str else 0,
                'note': data.get('note', '')
            })

        new_item_id = ManagementTree.add_item(year, month, type_id, record_data)
        return jsonify({"success": True, "id": new_item_id}), 201

    except Exception as e:
        print(f"Error creating new item: {e}")
        return jsonify({"error": "Failed to create new item"}), 500

@management_bp.route("/api/management/record", methods=['DELETE'])
def delete_record():
    """Deletes a specific record from a type item."""
    try:
        data = request.get_json()
        year = data.get('year')
        month = data.get('month')
        type_id = data.get('typeId')
        record_id = data.get('recordId')
        
        if not all([year, month, type_id, record_id]):
            return jsonify({"error": "Missing required fields for deletion"}), 400

        ManagementTree.delete_record(year, month, type_id, record_id)
        return jsonify({"success": True}), 200

    except Exception as e:
        print(f"Error deleting record: {e}")
        return jsonify({"error": f"Failed to delete record: {e}"}), 500

@management_bp.route("/api/management/record", methods=['PUT'])
def update_record():
    """Updates a specific record."""
    try:
        data = request.get_json()
        year = data.get('year')
        month = data.get('month')
        type_id = data.get('typeId')
        record_id = data.get('recordId')
        record_data = data.get('recordData')

        if not all([year, month, type_id, record_id, record_data]):
            return jsonify({"error": "Missing required fields for update"}), 400

        # Ensure amount is an integer
        if 'amount' in record_data:
            record_data['amount'] = int(record_data['amount'])
        
        ManagementTree.update_record(year, month, type_id, record_id, record_data)
        return jsonify({"success": True}), 200

    except Exception as e:
        print(f"Error updating record: {e}")
        return jsonify({"error": f"Failed to update record: {e}"}), 500
