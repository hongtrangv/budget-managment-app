import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

# --- Cấu hình Firebase Admin SDK ---
# Lấy chuỗi JSON từ biến môi trường
firebase_creds_json = os.environ.get('FIREBASE_CREDENTIALS_JSON')

if firebase_creds_json:
    # Chuyển đổi chuỗi JSON thành dictionary
    firebase_creds_dict = json.loads(firebase_creds_json)
    cred = credentials.Certificate(firebase_creds_dict)
else:
    # Chế độ fallback cho môi trường phát triển cục bộ (local development)
    print("Cảnh báo: Không tìm thấy biến môi trường FIREBASE_CREDENTIALS_JSON. Sử dụng tệp serviceAccountKey.json.")
    try:
        cred = credentials.Certificate('serviceAccountKey.json')
    except FileNotFoundError:
        print("Lỗi nghiêm trọng: Không tìm thấy tệp serviceAccountKey.json và biến môi trường cũng không được đặt.")
        print("Để deploy, hãy đặt biến môi trường FIREBASE_CREDENTIALS_JSON.")
        # Thoát hoặc xử lý lỗi một cách thích hợp nếu bạn không muốn ứng dụng chạy mà không có kết nối DB
        db = None
    except Exception as e:
        print(f"Lỗi khi khởi tạo Firebase từ tệp: {e}")
        db = None

# Khởi tạo ứng dụng Firebase chỉ khi `cred` đã được tạo thành công
try:
    if 'cred' in locals() and cred:
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Kết nối Firebase thành công.")
except Exception as e:
    print(f"Lỗi khi khởi tạo Firebase App: {e}")
    db = None
