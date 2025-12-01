import uuid
from flask import Blueprint, jsonify, request
from src.database.firestore_queries import Loan
from src.database.firebase_config import db
from google.cloud import firestore
from datetime import datetime
from src.api.auth import require_api_key, require_action # Import decorators

# Create a Blueprint for the loan APIs
loan_bp = Blueprint('loan_api', __name__)

@loan_bp.route("/api/loans/all")
def get_all_loans():
    """Fetches all loans without pagination."""
    try:
        all_loans = Loan.get_all_loans()
        return jsonify(all_loans)
    except Exception as e:
        print(f"Error getting all loans: {e}")
        return jsonify({"error": "Failed to get all loans"}), 500

@loan_bp.route("/api/dashboard/loan")
def get_list_loan():
    """Fetches a paginated list of loans."""
    try:
        page_size = request.args.get('pageSize', default=5, type=int)
        if page_size <= 0:
            return jsonify({"error": "pageSize must be a positive integer"}), 400

        start_after = request.args.get('startAfter', default=None, type=str)
        result = Loan.get_list_loan(page_size=page_size, start_after_doc_id=start_after)
        return jsonify(result)
    except Exception as e:
        print(f"Error getting paginated loan list: {e}")
        return jsonify({"error": "Failed to get paginated loan list"}), 500

@loan_bp.route("/api/dashboard/loan/<loan_id>/payments")
def get_loan_payments(loan_id):
    """Lấy lịch sử trả lãi cho một khoản vay cụ thể."""
    try:
        payments = Loan.get_loan_payments(loan_id)
        return jsonify(payments)
    except Exception as e:
        print(f"Error getting loan payments: {e}")
        return jsonify({"error": "Failed to get loan payments"}), 500

@loan_bp.route("/api/loans/payments", methods=['POST'])
@require_api_key
@require_action
def add_loan_payment():
    """API endpoint to add a new loan payment using a transaction."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Invalid JSON data."}), 400

        loan_id = data.get('loan_id')
        payment_date_str = data.get('payment_date')
        principal_paid = float(data.get('principal_paid', 0))
        interest_paid = float(data.get('interest_paid', 0))

        if not all([loan_id, payment_date_str]):
            return jsonify({"message": "Loan ID and payment date are required."}), 400
        
        if principal_paid <= 0 and interest_paid <= 0:
            return jsonify({"message": "Either principal or interest paid must be greater than zero."}), 400

        transaction = db.transaction()
        
        payment_id = Loan.add_payment(
            transaction,
            loan_id,
            payment_date_str, 
            principal_paid, 
            interest_paid
        )

        if payment_id:
            return jsonify({"success": True, "id": payment_id}), 201
        else:
            return jsonify({"message": "Failed to save payment due to an unknown error."}), 500

    except ValueError as ve:
        return jsonify({"message": str(ve)}), 404
    except TypeError as te:
        return jsonify({"message": f"Data consistency error: {str(te)}"}), 500
    except Exception as e:
        print(f"Error adding loan payment: {e}")
        return jsonify({"message": f"An internal error occurred: {str(e)}"}), 500
