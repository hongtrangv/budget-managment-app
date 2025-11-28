import uuid
from flask import Blueprint, jsonify, request
from src.database.firestore_queries import Loan
from src.database.firebase_config import db
from google.cloud import firestore
from datetime import datetime

# Create a Blueprint for the loan APIs
loan_bp = Blueprint('loan_api', __name__)

@loan_bp.route("/api/dashboard/loan")
def get_list_loan():
    """Fetches a paginated list of loans."""
    try:
        page_size = request.args.get('pageSize', default=5, type=int)
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

        # Create a transaction
        transaction = db.transaction()
        
        # Run the transactional function
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
            # The transaction function in firestore_queries.py should raise an exception on failure,
            # which will be caught by the outer try...except block.
            # This path might not even be reachable.
            return jsonify({"message": "Failed to save payment due to an unknown error."}), 500

    except ValueError as ve:
        # Catch specific, expected errors (like loan not found)
        return jsonify({"message": str(ve)}), 404
    except TypeError as te:
        # Catch data consistency errors (like 'outstanding' not being a number)
        return jsonify({"message": f"Data consistency error: {str(te)}"}), 500
    except Exception as e:
        # General error handler
        print(f"Error adding loan payment: {e}")
        return jsonify({"message": f"An internal error occurred: {str(e)}"}), 500
