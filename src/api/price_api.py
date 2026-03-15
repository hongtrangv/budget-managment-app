from flask import Blueprint, jsonify, request, session
from src.api.auth import require_api_key, require_action
from src.services.api_client import APIGatewayClient, APIGatewayError
from datetime import datetime
import uuid

# Tạo Blueprint cho price API
price_bp = Blueprint('price_api', __name__)

# ============================================================
# PRODUCTS (Khai báo sản phẩm)
# ============================================================

@price_bp.route("/api/price-products", methods=['GET'])
@require_api_key
def get_price_products():
    """Lấy danh sách sản phẩm đã khai báo"""
    try:
        params = {}
        if request.args.get('name'):
            params['name'] = request.args.get('name').strip()
        if request.args.get('page'):
            params['page'] = request.args.get('page')
        if request.args.get('limit'):
            params['limit'] = request.args.get('limit')

        client = APIGatewayClient()
        response = client.get('/api/price-products', params=params)
        return jsonify(response)

    except APIGatewayError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"Lỗi khi lấy danh sách sản phẩm: {e}")
        return jsonify({"success": False, "error": "Không thể lấy danh sách sản phẩm"}), 500


@price_bp.route("/api/price-products", methods=['POST'])
@require_api_key
def create_price_product():
    """Khai báo sản phẩm mới"""
    try:
        data = request.get_json()

        if not data.get('name'):
            return jsonify({"success": False, "error": "Tên sản phẩm là bắt buộc"}), 400

        payload = {
            'name': data['name'].strip(),
            'unit': data.get('unit', '').strip(),
            'description': data.get('description', '').strip(),
        }

        client = APIGatewayClient()
        response = client.post('/api/price-products', data=payload)
        return jsonify({"success": True, "message": "Khai báo sản phẩm thành công", "data": response}), 201

    except APIGatewayError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"Lỗi khi khai báo sản phẩm: {e}")
        return jsonify({"success": False, "error": "Lỗi server khi khai báo sản phẩm"}), 500


@price_bp.route("/api/price-products/<string:product_id>", methods=['PUT'])
@require_api_key
def update_price_product(product_id):
    """Cập nhật thông tin sản phẩm"""
    try:
        data = request.get_json()

        payload = {}
        for field in ['name', 'unit', 'description']:
            if field in data:
                payload[field] = data[field].strip()

        client = APIGatewayClient()
        client.put(f'/api/price-products/{product_id}', data=payload)
        return jsonify({"success": True, "message": "Cập nhật sản phẩm thành công"})

    except APIGatewayError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"Lỗi khi cập nhật sản phẩm: {e}")
        return jsonify({"success": False, "error": "Lỗi server khi cập nhật sản phẩm"}), 500


@price_bp.route("/api/price-products/<string:product_id>", methods=['DELETE'])
@require_api_key
def delete_price_product(product_id):
    """Xóa sản phẩm"""
    try:
        client = APIGatewayClient()
        client.delete(f'/api/price-products/{product_id}')
        return jsonify({"success": True, "message": "Xóa sản phẩm thành công"})

    except APIGatewayError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"Lỗi khi xóa sản phẩm: {e}")
        return jsonify({"success": False, "error": "Lỗi server khi xóa sản phẩm"}), 500


# ============================================================
# PRICES (Nhập giá & Quản lý giá)
# ============================================================

@price_bp.route("/api/prices/latest", methods=['GET'])
@require_api_key
def get_latest_prices():
    """Lấy giá mới nhất của từng sản phẩm"""
    try:
        params = {}
        if request.args.get('product_name'):
            params['product_name'] = request.args.get('product_name').strip()
        if request.args.get('supplier'):
            params['supplier'] = request.args.get('supplier').strip()
        if request.args.get('page'):
            params['page'] = request.args.get('page')
        if request.args.get('limit'):
            params['limit'] = request.args.get('limit')

        client = APIGatewayClient()
        response = client.get('/api/prices/latest', params=params)
        return jsonify(response)

    except APIGatewayError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"Lỗi khi lấy giá mới nhất: {e}")
        return jsonify({"success": False, "error": "Không thể lấy giá mới nhất"}), 500


@price_bp.route("/api/prices/history/<string:product_name>", methods=['GET'])
@require_api_key
def get_price_history(product_name):
    """Lấy lịch sử thay đổi giá của một sản phẩm"""
    try:
        params = {}
        if request.args.get('supplier'):
            params['supplier'] = request.args.get('supplier').strip()
        if request.args.get('page'):
            params['page'] = request.args.get('page')
        if request.args.get('limit'):
            params['limit'] = request.args.get('limit')

        client = APIGatewayClient()
        response = client.get(f'/api/prices/history/{product_name}', params=params)
        return jsonify(response)

    except APIGatewayError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    except Exception as e:
        print(f"Lỗi khi lấy lịch sử giá: {e}")
        return jsonify({"success": False, "error": "Không thể lấy lịch sử giá"}), 500

@price_bp.route("/api/prices", methods=['GET'])
@require_api_key
def get_prices():
    """Lấy danh sách giá với tìm kiếm và lọc"""
    try:
        # Kiểm tra đăng nhập
        # if 'username' not in session:
        #     return jsonify({
        #         "success": False,
        #         "error": "Yêu cầu đăng nhập"
        #     }), 401
        
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
def create_price():
    """Tạo mới thông tin giá"""
    try:
        # Kiểm tra đăng nhập
        # if 'username' not in session:
        #     return jsonify({
        #         "success": False,
        #         "error": "Yêu cầu đăng nhập"
        #     }), 401
            
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
            'notes': data.get('notes', '').strip()            
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
def update_price(price_id):
    """Cập nhật thông tin giá"""
    try:
        # Kiểm tra đăng nhập
        
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
def delete_price(price_id):
    """Xóa thông tin giá"""
    try:
        # Kiểm tra đăng nhập
        
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
       
        client = APIGatewayClient()      
        response = client.get('/api/prices/suppliers')           
        return jsonify(response)

    except APIGatewayError as e:
        return jsonify({"message": e.message}), e.status_code
    except Exception as e:
        return jsonify({"message": f"Lỗi hệ thống không xác định: {e}"}), 500


@price_bp.route("/api/prices/products", methods=['GET'])
@require_api_key
def get_products():
    """Lấy danh sách sản phẩm duy nhất từ tất cả các bản ghi giá."""
    try:
        
        client = APIGatewayClient()       
        response = client.get('/api/prices/products')
        return jsonify(response)

    except APIGatewayError as e:
        return jsonify({"message": e.message}), e.status_code
    except Exception as e:
        return jsonify({"message": f"Lỗi hệ thống không xác định: {e}"}), 500
