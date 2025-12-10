from flask import Blueprint, jsonify, request
from src.database.firestore_queries import Dashboard

# Tạo một Blueprint cho các API của trang quản lý
report_bp = Blueprint('dashboard_api', __name__)

@report_bp.route("/api/dashboard/summary/<string:year>")
def get_report_summary(year):
    """Tính tổng thu và chi trên toàn bộ cơ sở dữ liệu."""
    try:
        db = Dashboard()
        summary = db.get_total_income_and_expense_year(year)
        return jsonify(summary)
    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu tổng quan: {e}")
        return jsonify({"error": "Failed to get summary data"}), 500

@report_bp.route("/api/dashboard/summary/<string:year>/<string:month>")
def get_report_summary_for_month(year,month):
    """Tính tổng thu và chi trên toàn bộ cơ sở dữ liệu."""
    try:
        db = Dashboard()
        summary = db.get_total_income_and_expense_month(year,month)
        return jsonify(summary)
    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu tổng quan: {e}")
        return jsonify({"error": "Failed to get summary data"}), 500

@report_bp.route("/api/dashboard/years")
def get_years():
    try:
        db = Dashboard()
        summary = db.get_year_list()
        return jsonify(summary)
    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu tổng quan: {e}")
        return jsonify({"error": "Failed to get summary data"}), 500

@report_bp.route("/api/dashboard/pie/<string:year>/<string:month>")
def get_report_piechart_for_month(year,month):
    try:        
        db = Dashboard()
        summary = db.get_piechart_for_month(year,month)
        return jsonify(summary)       
    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu tổng quan: {e}")
        return jsonify({"error": "Failed to get summary data"}), 500

@report_bp.route("/api/dashboard/save")
def get_total_saving():
    try:
        db = Dashboard()
        summary = db.get_total_saving()
        return jsonify(summary)  
    except Exception as e:
        print(f"d",{e})
        return jsonify({"error": "Failed to get_total_saving"}), 500
