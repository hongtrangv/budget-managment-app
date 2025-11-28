import uuid
from flask import Blueprint, jsonify, request
from src.database.firestore_queries import Loan
from datetime import datetime

# Create a Blueprint for the management APIs
loan_bp = Blueprint('loan_api', __name__)

@loan_bp.route("/api/dashboard/loan")
def get_list_loan():
    """Lấy toàn bộ khoản vay"""
    try:
        tree = Loan.get_list_loan()
        return jsonify(tree)
    except Exception as e:
        print(f"Error getting management tree: {e}")
        return jsonify({"error": "Failed to get data tree"}), 500

@loan_bp.route("/api/dashboard/loan/<loan_id>/payments")
def get_loan_payments(loan_id):
    """Lấy lịch sử trả lãi cho một khoản vay cụ thể."""
    try:
        payments = Loan.get_loan_payments(loan_id)
        return jsonify(payments)
    except Exception as e:
        print(f"Error getting loan payments: {e}")
        return jsonify({"error": "Failed to get loan payments"}), 500
