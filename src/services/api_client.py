import os
import requests
from dotenv import load_dotenv

# Tải các biến môi trường từ tệp .env một lần khi module được import
load_dotenv()

class APIGatewayError(Exception):
    """Ngoại lệ tùy chỉnh cho các lỗi được trả về từ API Gateway hoặc lỗi kết nối."""
    def __init__(self, message, status_code=500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class APIGatewayClient:
    """Một client chung để gửi yêu cầu đến API Gateway, hỗ trợ GET, POST, PUT, DELETE."""
    def __init__(self):
        """Khởi tạo client bằng cách lấy URL cơ sở từ các biến môi trường."""
        self.base_url = os.environ.get('APIGW_BASE_URL')
        if not self.base_url:
            raise APIGatewayError("Lỗi cấu hình: APIGW_BASE_URL chưa được thiết lập trong tệp .env.", 500)
         # Thiết lập header mặc định cho tất cả các yêu cầu
        self.headers = {
            'Authorization': os.environ.get('AUTHORIZATION'),
            'Content-Type': 'application/json'
        }

    def _request(self, method, endpoint, params=None, data=None):
        """
        Gửi yêu cầu đến API Gateway và xử lý phản hồi.

        Args:
            method (str): Phương thức HTTP (GET, POST, PUT, DELETE).
            endpoint (str): Đường dẫn API (ví dụ: '/tasks').
            params (dict, optional): Các tham số query string.
            data (dict, optional): Dữ liệu body cho các yêu cầu POST/PUT.

        Returns:
            dict: Dữ liệu JSON từ phản hồi.

        Raises:
            APIGatewayError: Nếu yêu cầu thất bại hoặc trả về mã lỗi.
        """
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        try:
            response = requests.request(
                method,
                url,
                headers=self.headers,
                params=params,
                json=data # Sử dụng json=data để tự động serialize và đặt Content-Type
            )
            # Ném ngoại lệ nếu phản hồi là một mã lỗi HTTP (4xx hoặc 5xx)
            response.raise_for_status()
            # Trả về JSON nếu có nội dung, ngược lại trả về một dict rỗng
            return response.json() if response.content else {}
        except requests.exceptions.HTTPError as e:
            # Cố gắng lấy thông điệp lỗi từ JSON của phản hồi nếu có
            try:
                error_data = e.response.json()
                message = error_data.get('message', str(e))
            except ValueError:
                message = str(e)
            raise APIGatewayError(message, e.response.status_code)
        except requests.exceptions.RequestException as e:
            # Xử lý các lỗi kết nối mạng
            raise APIGatewayError(f"Lỗi kết nối đến API Gateway: {e}", 503)

    def get(self, endpoint, params=None):
        """Gửi yêu cầu GET."""
        return self._request('GET', endpoint, params=params)

    def post(self, endpoint, data):
        """Gửi yêu cầu POST."""
        return self._request('POST', endpoint, data=data)

    def put(self, endpoint, data):
        """Gửi yêu cầu PUT."""
        return self._request('PUT', endpoint, data=data)

    def delete(self, endpoint):
        """Gửi yêu cầu DELETE."""
        return self._request('DELETE', endpoint)

