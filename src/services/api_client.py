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

    def _request(self, method, endpoint, **kwargs):
        """Phương thức private để xử lý tất cả các yêu cầu đến API Gateway."""
        full_url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"

        try:
            response = requests.request(method, full_url, **kwargs)
            response.raise_for_status()
            return response.json() if response.content else {}
        except requests.exceptions.HTTPError as err:
            try:
                error_details = err.response.json()
                message = error_details.get('message', 'Lỗi không xác định từ gateway.')
            except ValueError:
                message = f'Gateway đã trả về lỗi không phải JSON: {err.response.status_code}'
            raise APIGatewayError(message, err.response.status_code) from err
        except requests.exceptions.RequestException as e:
            raise APIGatewayError(f"Không thể kết nối đến dịch vụ: {e}", 503) from e

    def get(self, endpoint, params=None):
        """Gửi một yêu cầu GET đến một điểm cuối cụ thể."""
        return self._request('GET', endpoint, params=params)

    def post(self, endpoint, data):
        """Gửi một yêu cầu POST đến một điểm cuối cụ thể."""
        return self._request('POST', endpoint, json=data)

    def put(self, endpoint, data):
        """Gửi một yêu cầu PUT đến một điểm cuối cụ thể."""
        return self._request('PUT', endpoint, json=data)

    def delete(self, endpoint):
        """Gửi một yêu cầu DELETE đến một điểm cuối cụ thể."""
        return self._request('DELETE', endpoint)
