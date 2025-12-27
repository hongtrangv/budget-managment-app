# src/api/excel_upload_api.py

from flask import Blueprint, request, jsonify
import pandas as pd

excel_upload_bp = Blueprint('excel_upload_bp', __name__)

@excel_upload_bp.route('/api/excel/upload', methods=['POST'])
def upload_excel():
    """Xử lý việc tải lên và đọc tệp Excel."""
    if 'file' not in request.files:
        return jsonify({'error': 'Không tìm thấy tệp trong yêu cầu'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Chưa có tệp nào được chọn'}), 400

    # Kiểm tra phần mở rộng của tệp
    if file and (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        try:
            # Đọc tệp excel vào một DataFrame của pandas
            df = pd.read_excel(file)
            
            # Thay thế các giá trị NaN (Not a Number) bằng chuỗi rỗng để hiển thị tốt hơn
            df = df.fillna('')

            # Lấy danh sách các tên cột
            columns = df.columns.tolist()
            
            # Chuyển đổi DataFrame thành danh sách các dictionary
            data = df.to_dict(orient='records')
            
            # Trả về cả cột và dữ liệu dưới dạng JSON
            return jsonify({
                'columns': columns,
                'data': data
            })
            
        except Exception as e:
            # Bắt các lỗi có thể xảy ra trong quá trình đọc tệp
            return jsonify({'error': f'Lỗi khi xử lý tệp: {str(e)}'}), 500
    else:
        return jsonify({'error': 'Loại tệp không hợp lệ. Vui lòng tải lên tệp Excel (.xls, .xlsx)'}), 400
