import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

db = None

try:
    # --- Cấu hình Firebase Admin SDK ---
    cred = None
    # Ưu tiên lấy chuỗi JSON từ biến môi trường (cho môi trường production/deploy)
    firebase_creds_json = os.environ.get('FIREBASE_CREDENTIALS_JSON')

    if firebase_creds_json:
        print("Khởi tạo Firebase từ biến môi trường...")
        # Chuyển đổi chuỗi JSON thành dictionary
        firebase_creds_dict = json.loads(firebase_creds_json)
        cred = credentials.Certificate(firebase_creds_dict)
    else:
        # Chế độ fallback cho môi trường phát triển cục bộ (local development)
        print("Cảnh báo: Không tìm thấy biến môi trường FIREBASE_CREDENTIALS_JSON. Sử dụng tệp serviceAccountKey.json.")
        try:
            # Xây dựng đường dẫn tuyệt đối đến tệp khóa
            # __file__ là đường dẫn đến tệp hiện tại (firebase_config.py)
            # os.path.dirname lấy thư mục chứa tệp đó
            # os.path.join kết hợp thư mục đó với tên tệp khóa
            script_dir = os.path.dirname(os.path.abspath(__file__))
            key_path = os.path.join(script_dir, 'serviceAccountKey.json')
            
            print(f"Đang thử tải tệp khóa từ: {key_path}")
            cred = credentials.Certificate(key_path)

        except FileNotFoundError:
            print(f"LỖI NGHIÊM TRỌNG: Không tìm thấy tệp 'serviceAccountKey.json' tại đường dẫn mong đợi.")
            print("Để chạy local, hãy đảm bảo tệp 'serviceAccountKey.json' của bạn nằm trong thư mục 'src/database'.")
            print("Để deploy, hãy đặt biến môi trường FIREBASE_CREDENTIALS_JSON.")
        except Exception as e:
            print(f"Lỗi không xác định khi khởi tạo Firebase từ tệp: {e}")

    # Khởi tạo ứng dụng Firebase chỉ khi `cred` đã được tạo thành công
    if cred and not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Kết nối Firebase thành công.")
    elif not cred:
        print("Không thể khởi tạo Firebase do thiếu thông tin xác thực.")

except Exception as e:
    print(f"Lỗi tổng thể trong quá trình cấu hình Firebase: {e}")
