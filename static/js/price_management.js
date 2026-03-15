import { authenticatedFetch, formatCurrency, showAlert } from './utils.js';

// --- STATE ---
let currentPage = 1;
let currentFilters = {};
let productCurrentPage = 1;
const PAGE_SIZE = 10;

// --- INIT ---

export async function loadPriceManagementPage() {
    try {
        setupTabNavigation();
        setupProductFormHandlers();
        setupPriceFormHandlers();
        setupManageHandlers();
        setupModalHandlers();

        document.getElementById('effective-date').value = new Date().toISOString().split('T')[0];

        // Load tab mặc định: khai báo sản phẩm
        await loadProducts();
    } catch (error) {
        console.error('Init error:', error);
        showAlert('error', 'Lỗi khởi tạo trang quản lý giá');
    }
}

// ============================================================
// TAB NAVIGATION
// ============================================================

function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const tabId = button.id.replace('tab-', '');

            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            });
            button.classList.add('active', 'border-blue-500', 'text-blue-600');
            button.classList.remove('border-transparent', 'text-gray-500');

            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(`content-${tabId}`).classList.remove('hidden');

            if (tabId === 'add') {
                await loadProductsDropdown();
            } else if (tabId === 'manage') {
                await Promise.all([loadProductsFilter(), loadSuppliersFilter()]);
                await loadLatestPrices();
            }
        });
    });
}

// ============================================================
// TAB 1: KHAI BÁO SẢN PHẨM
// ============================================================

async function loadProducts() {
    const container = document.getElementById('products-table-container');
    container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p class="mt-2 text-gray-600">Đang tải...</p></div>';

    try {
        const params = new URLSearchParams({ page: productCurrentPage, limit: PAGE_SIZE });
        const response = await authenticatedFetch(`/api/price-products?${params}`, {
            headers: { 'X-Action-Identifier': 'READ_PRICE' }
        });
        const result = await response.json();

        if (result.success) {
            renderProductsTable(result.data || []);
            updateProductPagination(result);
        } else {
            container.innerHTML = `<div class="text-center py-8 text-red-500">${result.error || 'Không thể tải danh sách'}</div>`;
        }
    } catch (error) {
        container.innerHTML = '<div class="text-center py-8 text-red-500">Lỗi khi tải danh sách sản phẩm</div>';
    }
}

function renderProductsTable(products) {
    const container = document.getElementById('products-table-container');

    if (!products.length) {
        container.innerHTML = '<div class="text-center py-8 text-gray-500">Chưa có sản phẩm nào được khai báo</div>';
        return;
    }

    container.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn vị</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mô tả</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${products.map(p => `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 text-sm font-medium text-gray-900">${escapeHtml(p.name || '')}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${escapeHtml(p.unit || '-')}</td>
                        <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title="${escapeHtml(p.description || '')}">${escapeHtml(p.description || '-')}</td>
                        <td class="px-6 py-4 text-sm font-medium space-x-3">
                            <button onclick="editProduct('${p.id}', ${JSON.stringify(p).replace(/"/g, '&quot;')})" class="text-blue-600 hover:text-blue-900">Sửa</button>
                            <button onclick="deleteProduct('${p.id}', '${escapeHtml(p.name || '')}')" class="text-red-600 hover:text-red-900">Xóa</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updateProductPagination(result) {
    const pagination = document.getElementById('products-pagination');
    const total = result.total_records || 0;
    if (!total) { pagination.classList.add('hidden'); return; }

    pagination.classList.remove('hidden');
    const from = (productCurrentPage - 1) * PAGE_SIZE + 1;
    const to = Math.min(productCurrentPage * PAGE_SIZE, total);
    document.getElementById('prod-showing-from').textContent = from;
    document.getElementById('prod-showing-to').textContent = to;
    document.getElementById('prod-total').textContent = total;
    document.getElementById('prod-page-info').textContent = `Trang ${productCurrentPage}`;
    document.getElementById('prod-prev-page').disabled = productCurrentPage <= 1;
    document.getElementById('prod-next-page').disabled = to >= total;
}

function setupProductFormHandlers() {
    document.getElementById('product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            const response = await authenticatedFetch('/api/price-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Action-Identifier': 'CREATE_PRICE' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.success) {
                showAlert('success', 'Thêm sản phẩm thành công');
                e.target.reset();
                await loadProducts();
            } else {
                showAlert('error', result.error || 'Không thể thêm sản phẩm');
            }
        } catch {
            showAlert('error', 'Lỗi khi thêm sản phẩm');
        }
    });

    document.getElementById('reset-product-form').addEventListener('click', () => {
        document.getElementById('product-form').reset();
    });

    document.getElementById('refresh-products').addEventListener('click', loadProducts);

    document.getElementById('prod-prev-page').addEventListener('click', () => {
        if (productCurrentPage > 1) { productCurrentPage--; loadProducts(); }
    });
    document.getElementById('prod-next-page').addEventListener('click', () => {
        productCurrentPage++; loadProducts();
    });
}

window.editProduct = function(productId, data) {
    document.getElementById('edit-product-id').value = productId;
    document.getElementById('edit-product-name').value = data.name || '';
    document.getElementById('edit-product-unit').value = data.unit || '';
    document.getElementById('edit-product-description').value = data.description || '';
    document.getElementById('edit-product-modal').classList.remove('hidden');
};

window.deleteProduct = async function(productId, name) {
    if (!confirm(`Xóa sản phẩm "${name}"?`)) return;
    try {
        const response = await authenticatedFetch(`/api/price-products/${productId}`, {
            method: 'DELETE',
            headers: { 'X-Action-Identifier': 'DELETE_PRICE' }
        });
        const result = await response.json();
        if (result.success) {
            showAlert('success', 'Xóa sản phẩm thành công');
            await loadProducts();
        } else {
            showAlert('error', result.error || 'Không thể xóa sản phẩm');
        }
    } catch {
        showAlert('error', 'Lỗi khi xóa sản phẩm');
    }
};

// ============================================================
// TAB 2: NHẬP GIÁ
// ============================================================

async function loadProductsDropdown() {
    try {
        const response = await authenticatedFetch('/api/price-products?limit=200', {
            headers: { 'X-Action-Identifier': 'READ_PRICE' }
        });
        const result = await response.json();
        const select = document.getElementById('price-product-select');
        select.innerHTML = '<option value="">-- Chọn sản phẩm --</option>';
        if (result.success && result.data) {
            result.data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.name;
                opt.textContent = p.unit ? `${p.name} (${p.unit})` : p.name;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Error loading products dropdown:', error);
    }
}

function setupPriceFormHandlers() {
    document.getElementById('price-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            const response = await authenticatedFetch('/api/prices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Action-Identifier': 'CREATE_PRICE' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.success) {
                showAlert('success', 'Lưu giá thành công');
                e.target.reset();
                document.getElementById('effective-date').value = new Date().toISOString().split('T')[0];
                // Chuyển sang tab quản lý
                document.getElementById('tab-manage').click();
            } else {
                showAlert('error', result.error || 'Không thể lưu giá');
            }
        } catch {
            showAlert('error', 'Lỗi khi lưu giá');
        }
    });

    document.getElementById('reset-form').addEventListener('click', () => {
        document.getElementById('price-form').reset();
        document.getElementById('effective-date').value = new Date().toISOString().split('T')[0];
    });
}

// ============================================================
// TAB 3: QUẢN LÝ GIÁ (giá mới nhất + lịch sử)
// ============================================================

async function loadProductsFilter() {
    try {
        const response = await authenticatedFetch('/api/price-products?limit=200', {
            headers: { 'X-Action-Identifier': 'READ_PRICE' }
        });
        const result = await response.json();
        const select = document.getElementById('search-products');
        select.innerHTML = '<option value="">Tất cả sản phẩm</option>';
        if (result.success && result.data) {
            result.data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.name;
                opt.textContent = p.name;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Error loading products filter:', error);
    }
}

async function loadSuppliersFilter() {
    try {
        const response = await authenticatedFetch('/api/prices/suppliers', {
            headers: { 'X-Action-Identifier': 'READ_PRICE' }
        });
        const result = await response.json();
        const select = document.getElementById('search-supplier');
        select.innerHTML = '<option value="">Tất cả nhà cung cấp</option>';
        if (result.success && result.data) {
            result.data.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.name || s;
                opt.textContent = s.name || s;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Error loading suppliers filter:', error);
    }
}

async function loadLatestPrices() {
    const container = document.getElementById('prices-table-container');
    container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p class="mt-2 text-gray-600">Đang tải...</p></div>';

    try {
        const params = new URLSearchParams({ page: currentPage, limit: PAGE_SIZE, ...currentFilters });
        const response = await authenticatedFetch(`/api/prices/latest?${params}`, {
            headers: { 'X-Action-Identifier': 'READ_PRICE' }
        });
        const result = await response.json();

        if (result.success) {
            renderLatestPricesTable(result.data || []);
            updatePagination(result);
        } else {
            container.innerHTML = `<div class="text-center py-8 text-red-500">${result.error || 'Không thể tải dữ liệu'}</div>`;
        }
    } catch (error) {
        container.innerHTML = '<div class="text-center py-8 text-red-500">Lỗi khi tải danh sách giá</div>';
    }
}

function renderLatestPricesTable(prices) {
    const container = document.getElementById('prices-table-container');

    if (!prices.length) {
        container.innerHTML = '<div class="text-center py-8 text-gray-500">Không tìm thấy kết quả nào</div>';
        return;
    }

    container.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá mới nhất</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày áp dụng</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhà cung cấp</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${prices.map(p => `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 text-sm font-medium text-gray-900">${escapeHtml(p.product_name || '')}</td>
                        <td class="px-6 py-4 text-sm font-semibold text-gray-900">${formatCurrency(p.price || 0)}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${formatDate(p.effective_date)}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${escapeHtml(p.supplier || '')}</td>
                        <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title="${escapeHtml(p.notes || '')}">${escapeHtml(p.notes || '-')}</td>
                        <td class="px-6 py-4 text-sm font-medium space-x-3">
                            <button onclick="viewPriceHistory('${escapeHtml(p.product_name || '')}')" class="text-green-600 hover:text-green-900">Lịch sử</button>
                            <button onclick="editPrice('${p.id}', ${JSON.stringify(p).replace(/"/g, '&quot;')})" class="text-blue-600 hover:text-blue-900">Sửa</button>
                            <button onclick="deletePrice('${p.id}', '${escapeHtml(p.product_name || '')}')" class="text-red-600 hover:text-red-900">Xóa</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updatePagination(result) {
    const pagination = document.getElementById('pagination');
    const total = result.total_records || 0;
    if (!total) { pagination.classList.add('hidden'); return; }

    pagination.classList.remove('hidden');
    const from = (currentPage - 1) * PAGE_SIZE + 1;
    const to = Math.min(currentPage * PAGE_SIZE, total);
    document.getElementById('showing-from').textContent = from;
    document.getElementById('showing-to').textContent = to;
    document.getElementById('total-results').textContent = total;
    document.getElementById('current-page-info').textContent = `Trang ${currentPage}`;
    document.getElementById('prev-page').disabled = currentPage <= 1;
    document.getElementById('next-page').disabled = to >= total;
}

function setupManageHandlers() {
    document.getElementById('search-prices').addEventListener('click', async () => {
        currentFilters = {
            product_name: document.getElementById('search-products').value,
            supplier: document.getElementById('search-supplier').value,
        };
        currentPage = 1;
        await loadLatestPrices();
    });

    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; loadLatestPrices(); }
    });
    document.getElementById('next-page').addEventListener('click', () => {
        currentPage++; loadLatestPrices();
    });
}

// ============================================================
// LỊCH SỬ GIÁ
// ============================================================

window.viewPriceHistory = async function(productName) {
    const modal = document.getElementById('history-modal');
    const container = document.getElementById('history-table-container');
    document.getElementById('history-product-name').textContent = `Sản phẩm: ${productName}`;
    container.innerHTML = '<div class="text-center py-6"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>';
    modal.classList.remove('hidden');

    try {
        const response = await authenticatedFetch(`/api/prices/history/${encodeURIComponent(productName)}`, {
            headers: { 'X-Action-Identifier': 'READ_PRICE' }
        });
        const result = await response.json();

        if (result.success && result.data?.length) {
            container.innerHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày áp dụng</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nhà cung cấp</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${result.data.map((h, i) => `
                            <tr class="${i === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}">
                                <td class="px-4 py-3 text-sm text-gray-900">${formatDate(h.effective_date)}</td>
                                <td class="px-4 py-3 text-sm font-semibold text-gray-900">${formatCurrency(h.price || 0)}</td>
                                <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(h.supplier || '')}</td>
                                <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(h.notes || '-')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p class="text-xs text-gray-400 px-4 py-2">* Hàng xanh là giá mới nhất</p>
            `;
        } else {
            container.innerHTML = '<div class="text-center py-6 text-gray-500">Không có lịch sử giá</div>';
        }
    } catch {
        container.innerHTML = '<div class="text-center py-6 text-red-500">Lỗi khi tải lịch sử giá</div>';
    }
};

// ============================================================
// EDIT / DELETE GIÁ
// ============================================================

window.editPrice = function(priceId, data) {
    document.getElementById('edit-price-id').value = priceId;
    document.getElementById('edit-product-name').value = data.product_name || '';
    document.getElementById('edit-price').value = data.price || '';
    document.getElementById('edit-effective-date').value = formatDateForInput(data.effective_date);
    document.getElementById('edit-supplier').value = data.supplier || '';
    document.getElementById('edit-notes').value = data.notes || '';
    document.getElementById('edit-modal').classList.remove('hidden');
};

window.deletePrice = async function(priceId, productName) {
    if (!confirm(`Xóa bản ghi giá của "${productName}"?`)) return;
    try {
        const response = await authenticatedFetch(`/api/prices/${priceId}`, {
            method: 'DELETE',
            headers: { 'X-Action-Identifier': 'DELETE_PRICE' }
        });
        const result = await response.json();
        if (result.success) {
            showAlert('success', 'Xóa giá thành công');
            await loadLatestPrices();
        } else {
            showAlert('error', result.error || 'Không thể xóa giá');
        }
    } catch {
        showAlert('error', 'Lỗi khi xóa giá');
    }
};

// ============================================================
// MODAL HANDLERS
// ============================================================

function setupModalHandlers() {
    // Edit product modal
    const editProductModal = document.getElementById('edit-product-modal');
    document.getElementById('close-edit-product-modal').addEventListener('click', () => editProductModal.classList.add('hidden'));
    document.getElementById('cancel-edit-product').addEventListener('click', () => editProductModal.classList.add('hidden'));
    editProductModal.addEventListener('click', e => e.target === editProductModal && editProductModal.classList.add('hidden'));

    document.getElementById('edit-product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const productId = document.getElementById('edit-product-id').value;
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            const response = await authenticatedFetch(`/api/price-products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Action-Identifier': 'UPDATE_PRICE' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.success) {
                showAlert('success', 'Cập nhật sản phẩm thành công');
                editProductModal.classList.add('hidden');
                await loadProducts();
            } else {
                showAlert('error', result.error || 'Không thể cập nhật sản phẩm');
            }
        } catch {
            showAlert('error', 'Lỗi khi cập nhật sản phẩm');
        }
    });

    // Edit price modal
    const editModal = document.getElementById('edit-modal');
    document.getElementById('close-edit-modal').addEventListener('click', () => editModal.classList.add('hidden'));
    document.getElementById('cancel-edit').addEventListener('click', () => editModal.classList.add('hidden'));
    editModal.addEventListener('click', e => e.target === editModal && editModal.classList.add('hidden'));

    document.getElementById('edit-price-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const priceId = document.getElementById('edit-price-id').value;
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            const response = await authenticatedFetch(`/api/prices/${priceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Action-Identifier': 'UPDATE_PRICE' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.success) {
                showAlert('success', 'Cập nhật giá thành công');
                editModal.classList.add('hidden');
                await loadLatestPrices();
            } else {
                showAlert('error', result.error || 'Không thể cập nhật giá');
            }
        } catch {
            showAlert('error', 'Lỗi khi cập nhật giá');
        }
    });

    // History modal
    const historyModal = document.getElementById('history-modal');
    document.getElementById('close-history-modal').addEventListener('click', () => historyModal.classList.add('hidden'));
    historyModal.addEventListener('click', e => e.target === historyModal && historyModal.classList.add('hidden'));
}

// ============================================================
// UTILITIES
// ============================================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateValue) {
    if (!dateValue) return '';
    try {
        let date;
        if (typeof dateValue === 'number') {
            date = new Date(dateValue);
        } else if (typeof dateValue === 'string') {
            date = new Date(dateValue.includes('T') ? dateValue : dateValue + 'T00:00:00');
        } else {
            date = new Date(dateValue);
        }
        if (isNaN(date.getTime())) return dateValue.toString();
        return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
        return dateValue ? dateValue.toString() : '';
    }
}

function formatDateForInput(dateValue) {
    if (!dateValue) return '';
    try {
        const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(dateValue);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    } catch {
        return '';
    }
}
