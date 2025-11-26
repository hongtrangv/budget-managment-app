import os
from flask import Flask, send_file

# Import các blueprint từ thư mục api
from src.api.collections_api import collections_bp
from src.api.management_api import management_bp
from src.api.dashboard_api import report_bp

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# === ĐĂNG KÝ BLUEPRINTS ===
app.register_blueprint(collections_bp)
app.register_blueprint(management_bp)
app.register_blueprint(report_bp)


# === CÁC TUYẾN HIỂN THỊ TRANG (Views) ===

# Các route chính của ứng dụng single-page.
# Chúng đều trả về trang index.html, và JavaScript phía client sẽ xử lý việc hiển thị trang con phù hợp.
@app.route("/")
@app.route('/collections')
@app.route('/management')
def index():
    """Phục vụ file HTML chính của ứng dụng (Single Page Application shell)."""
    return send_file('src/index.html')

# Các route dưới đây hoạt động như một API, cung cấp các mảnh HTML (partials) cho client.
@app.route('/components/menu')
def menu():
    return send_file('src/components/menu.html')

@app.route('/pages/home')
def home():
    return send_file('src/pages/home.html')

@app.route('/pages/collections')
def collections_page():
    return send_file('src/pages/collections.html')

@app.route('/pages/management')
def management_page():
    return send_file('src/pages/management.html')

@app.route('/src/components/ui.js')
def ui_js():
    return send_file('src/components/ui.js')

@app.route('/src/components/chartjs-plugin-datalabels.js')
def chart_js():
    return send_file('src/components/chartjs-plugin-datalabels.js')

@app.route('/src/styles/tree-view.css')
def css():
    return send_file('src/styles/tree-view.css')

# === KHỞI CHẠY ỨNG DỤNG ===
def main():
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))

if __name__ == "__main__":
    main()
