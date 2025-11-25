from flask import Blueprint, jsonify, request
from src.database.firestore_queries import Dashboard

# Tạo một Blueprint cho các API của trang quản lý
report_bp = Blueprint('dashboard_api', __name__)

@report_bp.route("/api/dashboard/summary/<string:year>")
def get_report_summary(year):
    """Tính tổng thu và chi trên toàn bộ cơ sở dữ liệu."""
    try:
        # SỬA LỖI: Gọi đúng tên phương thức là get_total_income_and_expense
        summary = Dashboard.get_total_income_and_expense_year(year)
        return jsonify(summary)
    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu tổng quan: {e}")
        return jsonify({"error": "Failed to get summary data"}), 500

@report_bp.route("/api/dashboard/summary/<string:year>/<string:month>")
def get_report_summary_for_month(year,month):
    """Tính tổng thu và chi trên toàn bộ cơ sở dữ liệu."""
    try:
        # LƯU Ý: Phương thức này chưa được tạo. Tôi sẽ để lại đây để bạn phát triển sau.
         summary = Dashboard.get_total_income_and_expense_month(year,month)
         return jsonify(summary)
        # Tạm thời trả về lỗi để tránh nhầm lẫn
        #return jsonify({"error": "API endpoint này chưa được hoàn thiện."}), 501
    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu tổng quan: {e}")
        return jsonify({"error": "Failed to get summary data"}), 500

@report_bp.route("/api/dashboard/years")
def get_years():
    try:
        print(f"Lỗi khi lấy dữ liệu tổng quan")
        # LƯU Ý: Phương thức này chưa được tạo. Tôi sẽ để lại đây để bạn phát triển sau.
        summary = Dashboard.get_year()
        return jsonify(summary)
        # Tạm thời trả về lỗi để tránh nhầm lẫn
        #return jsonify({"error": "API endpoint này chưa được hoàn thiện."}), 501
    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu tổng quan: {e}")
        return jsonify({"error": "Failed to get summary data"}), 500