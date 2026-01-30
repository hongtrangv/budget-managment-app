from flask import Blueprint, jsonify, request, session
from src.api.auth import require_api_key, require_action
from src.services.api_client import APIGatewayClient, APIGatewayError
from datetime import datetime
import uuid

# Tạo Blueprint cho price API
price_bp = Blueprint('price_api', __name__)

@price_bp.route("/api/prices", methods=['GET'])
@require_api_key
def get_prices():
    """Lấy danh sách giá với tìm kiếm và lọc"""
    try:
        # Kiểm tra đăng nhập
        if 'username' not in session:
            return jsonify({
                "success": False,
                "error": "Yêu cầu đăng nhập"
            }), 401
        
        # Lấy tham số tìm kiếm
        params = {}
        if request.args.get('product_name'):
            params['product_name'] = request.args.get('product_name').strip()
        if request.args.get('supplier'):
            params['supplier'] = request.args.get('supplier').strip()
        if request.args.get('min_price'):
            params['min_price'] = request.args.get('min_price')
        if request.args.get('max_price'):
            params['max_price'] = request.args.get('max_price')
        if request.args.get('page'):
            params['page'] = request.args.get('page')
        if request.args.get('limit'):
            params['limit'] = request.args.get('limit')
        
        # Gọi API Gateway
        client = APIGatewayClient()
        response = client.get('/api/prices', params=params)
        
        return jsonify({
            "success": True,
            "data": response.get('data', []),
            "page": int(params.get('page', 1)),
            "limit": int(params.get('limit', 20))
        })
        
    except APIGatewayError as e:
        print(f"API Gateway error: {e.message}")
        return jsonify({
            "success": False,
            "error": e.message
        }), e.status_code
        
    except Exception as e:
        print(f"Lỗi khi lấy danh sách giá: {e}")
        return jsonify({
            "success": False,
            "error": "Không thể lấy danh sách giá"
        }), 500

@price_bp.route("/api/prices", methods=['POST'])
@require_api_key
@require_action
def create_price():
    """Tạo mới thông tin giá"""
    try:
        # Kiểm tra đăng nhập
        if 'username' not in session:
            return jsonify({
                "success": False,
                "error": "Yêu cầu đăng nhập"
            }), 401
            
        data = request.get_json()
        
        # Validate dữ liệu đầu vào
        required_fields = ['product_name', 'price', 'effective_date', 'supplier']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "success": False,
                    "error": f"Thiếu trường bắt buộc: {field}"
                }), 400
        
        # Validate giá
        try:
            price = float(data['price'])
            if price < 0:
                return jsonify({
                    "success": False,
                    "error": "Giá không thể âm"
                }), 400
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Giá không hợp lệ"
            }), 400
        
        # Validate ngày
        try:
            datetime.strptime(data['effective_date'], '%Y-%m-%d')
        except ValueError:
            return jsonify({
                "success": False,
                "error": "Định dạng ngày không hợp lệ (YYYY-MM-DD)"
            }), 400
        
        # Chuẩn bị payload
        payload = {
            'product_name': data['product_name'].strip(),
            'price': price,
            'effective_date': data['effective_date'],
            'supplier': data['supplier'].strip(),
            'notes': data.get('notes', '').strip(),
            'created_by': session['username']
        }
        
        # Gọi API Gateway
        client = APIGatewayClient()
        response = client.post('/api/prices', data=payload)
        
        return jsonify({
            "success": True,
            "message": "Tạo thông tin giá thành công",
            "data": response
        }), 201
            
    except APIGatewayError as e:
        print(f"API Gateway error: {e.message}")
        return jsonify({
            "success": False,
            "error": e.message
        }), e.status_code
        
    except Exception as e:
        print(f"Lỗi khi tạo thông tin giá: {e}")
        return jsonify({
            "success": False,
            "error": "Lỗi server khi tạo thông tin giá"
        }), 500

@price_bp.route("/api/prices/<string:price_id>", methods=['PUT'])
@require_api_key
@require_action
def update_price(price_id):
    """Cập nhật thông tin giá"""
    try:
        # Kiểm tra đăng nhập
        if 'username' not in session:
            return jsonify({
                "success": False,
                "error": "Yêu cầu đăng nhập"
            }), 401
            
        data = request.get_json()
        
        # Validate giá nếu có
        if 'price' in data:
            try:
                price = float(data['price'])
                if price < 0:
                    return jsonify({
                        "success": False,
                        "error": "Giá không thể âm"
                    }), 400
                data['price'] = price
            except ValueError:
                return jsonify({
                    "success": False,
                    "error": "Giá không hợp lệ"
                }), 400
        
        # Validate ngày nếu có
        if 'effective_date' in data:
            try:
                datetime.strptime(data['effective_date'], '%Y-%m-%d')
            except ValueError:
                return jsonify({
                    "success": False,
                    "error": "Định dạng ngày không hợp lệ (YYYY-MM-DD)"
                }), 400
        
        # Chuẩn bị payload
        payload = {}
        allowed_fields = ['product_name', 'price', 'effective_date', 'supplier', 'notes']
        
        for field in allowed_fields:
            if field in data:
                if field in ['product_name', 'supplier', 'notes']:
                    payload[field] = data[field].strip()
                else:
                    payload[field] = data[field]
        
        payload['updated_by'] = session['username']
        
        # Gọi API Gateway
        client = APIGatewayClient()
        response = client.put(f'/api/prices/{price_id}', data=payload)
        
        return jsonify({
            "success": True,
            "message": "Cập nhật thông tin giá thành công"
        })
            
    except APIGatewayError as e:
        print(f"API Gateway error: {e.message}")
        return jsonify({
            "success": False,
            "error": e.message
        }), e.status_code
        
    except Exception as e:
        print(f"Lỗi khi cập nhật thông tin giá: {e}")
        return jsonify({
            "success": False,
            "error": "Lỗi server khi cập nhật thông tin giá"
        }), 500

@price_bp.route("/api/prices/<string:price_id>", methods=['DELETE'])
@require_api_key
@require_action
def delete_price(price_id):
    """Xóa thông tin giá"""
    try:
        # Kiểm tra đăng nhập
        if 'username' not in session:
            return jsonify({
                "success": False,
                "error": "Yêu cầu đăng nhập"
            }), 401
        
        # Gọi API Gateway
        client = APIGatewayClient()
        response = client.delete(f'/api/prices/{price_id}')
        
        return jsonify({
            "success": True,
            "message": "Xóa thông tin giá thành công"
        })
            
    except APIGatewayError as e:
        print(f"API Gateway error: {e.message}")
        return jsonify({
            "success": False,
            "error": e.message
        }), e.status_code
        
    except Exception as e:
        print(f"Lỗi khi xóa thông tin giá: {e}")
        return jsonify({
            "success": False,
            "error": "Lỗi server khi xóa thông tin giá"
        }), 500

@price_bp.route("/api/prices/suppliers", methods=['GET'])
@require_api_key
def get_suppliers():
    """Lấy danh sách nhà cung cấp duy nhất từ tất cả các bản ghi giá."""
    try:
        if 'username' not in session:
            return jsonify({"success": False, "error": "Yêu cầu đăng nhập"}), 401

        client = APIGatewayClient()
        
        # Tham số để lấy tất cả các bản ghi, có thể cần điều chỉnh dựa trên API của bạn
        params = {'limit': 1000, 'page': 1} 
        all_prices = []
        
        # Lặp để lấy tất cả các trang
        while True:
            response = client.get('/api/prices/suppliers')
            data = response.get('data', [])
            all_prices.extend(data)            
          
        # Trích xuất và lọc các nhà cung cấp duy nhất
        suppliers = sorted(list(set(item['supplier'] for item in all_prices if 'supplier' in item)))
        
        return jsonify({"success": True, "data": data})

    except APIGatewayError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"success": False, "error": "Không thể lấy danh sách nhà cung cấp"}), 500


@price_bp.route("/api/prices/products", methods=['GET'])
@require_api_key
def get_products():
    """Lấy danh sách sản phẩm duy nhất từ tất cả các bản ghi giá."""
    try:
        if 'username' not in session:
            return jsonify({"success": False, "error": "Yêu cầu đăng nhập"}), 401

        client = APIGatewayClient()
        params = {'limit': 1000, 'page': 1}
        all_prices = []

        while True:
            response = client.get('/api/prices/products')
            data = response.get('data', [])
            
        return jsonify({"success": True, "data": data})

    except APIGatewayError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        return jsonify({"success": False, "error": "Không thể lấy danh sách sản phẩm"}), 500
