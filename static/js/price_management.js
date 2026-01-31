import { authenticatedFetch, formatCurrency, showAlert, createTable, formatDate, formatDateNew } from './utils.js';

// --- STATE AND CONFIGURATION ---
let currentPage = 1;
let currentFilters = {};
const pageSize = 10; // Match collections page

const tableHeaders = {
    product_name: 'Sản phẩm',
    price: 'Giá',
    effective_date: 'Ngày áp dụng',
    supplier: 'Nhà cung cấp',
    notes: 'Ghi chú'
};

// --- INITIALIZATION ---

export async function loadPriceManagementPage() {
    try {
        setupTabNavigation();
        setupFormHandlers();
        setupSearchHandlers();
        setupModalHandlers();

        const today = new Date().toString("dd/MM/yyyy").split('T')[0];
        document.getElementById('effective-date').value = today;

        await Promise.all([
            loadSuppliersFilter(),
            loadProductsFilter(),
            loadPrices()
        ]);
    } catch (error) {
        showAlert('error', 'Lỗi khởi tạo trang quản lý giá');
    }
}

// --- DATA FETCHING AND RENDERING ---

async function loadPrices() {
    const tableContainer = document.getElementById('prices-table-container');
    showLoading(true);
    
    const params = new URLSearchParams({ page: currentPage, limit: pageSize, ...currentFilters });

    try {
        const response = await authenticatedFetch(`/api/prices?${params}`, {
            headers: { 'X-Action-Identifier': 'READ_PRICE' }
        });
        const result = await response.json();

        if (result.success) {
            showLoading(false);

            // Pre-format data for display purposes
            const displayData = result.data.map(p => ({
                ...p,
                price: formatCurrency(p.price)
                //effective_date: formatDateNew(p.effective_date)
            }));

            const table = createTable(
                displayData, 
                tableHeaders,
                currentPage,
                pageSize,
                handlePriceAction
            );
            tableContainer.innerHTML = '';
            tableContainer.appendChild(table);

            // Backend needs to return total_records for accurate pagination
            updatePagination(result.page, result.limit, result.data.length, result.total_records || 0);
        } else {
            showLoading(false, true, result.error || 'Không thể tải danh sách giá');
        }
    } catch (error) {
        showLoading(false, true, 'Lỗi khi tải danh sách giá');
    } 
}

async function loadSuppliersFilter() {
    try {
        const response = await authenticatedFetch('/api/prices/suppliers', {
            headers: { 'X-Action-Identifier': 'READ_PRICE' }
        });
        const result = await response.json();
        if (result.success) {
            const supplierSelect = document.getElementById('search-supplier');
            supplierSelect.innerHTML = '<option value="">Tất cả nhà cung cấp</option>';
            result.data.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.name;
                option.textContent = supplier.name;
                supplierSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

async function loadProductsFilter() {
    try {
        const response = await authenticatedFetch('/api/prices/products', {
            headers: { 'X-Action-Identifier': 'READ_PRICE' }
        });
        const result = await response.json();
        if (result.success) {
            const productSelect = document.getElementById('search-products');
            productSelect.innerHTML = '<option value="">Tất cả sản phẩm</option>';
            result.data.forEach(product => {
                const option = document.createElement('option');
                option.value = product.name;
                option.textContent = product.name;
                productSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// --- UI SETUP AND EVENT HANDLERS ---

function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.id.replace('tab-', '');
            tabButtons.forEach(btn => btn.classList.remove('active', 'border-blue-500', 'text-blue-600'));
            button.classList.add('active', 'border-blue-500', 'text-blue-600');
            tabContents.forEach(content => content.classList.add('hidden'));
            document.getElementById(`content-${tabId}`).classList.remove('hidden');
            if (tabId === 'manage') loadPrices();
        });
    });
}

function setupFormHandlers() {
    document.getElementById('price-form').addEventListener('submit', handleAddPrice);
    document.getElementById('reset-form').addEventListener('click', () => {
        document.getElementById('price-form').reset();
        document.getElementById('effective-date').value = new Date().toString("dd/MM/yyyy").split('T')[0];
    });
    document.getElementById('edit-price-form').addEventListener('submit', handleEditPrice);
}

function setupSearchHandlers() {
    document.getElementById('search-prices').addEventListener('click', handleSearch);
    document.getElementById('clear-search').addEventListener('click', handleClearSearch);
    ['search-products', 'search-supplier', 'min-price', 'max-price'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', e => e.key === 'Enter' && handleSearch());
    });
    document.getElementById('prev-page').addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadPrices(); } });
    document.getElementById('next-page').addEventListener('click', () => { currentPage++; loadPrices(); });
}

function setupModalHandlers() {
    const modal = document.getElementById('edit-modal');
    const closeBtn = document.getElementById('close-edit-modal');
    const cancelBtn = document.getElementById('cancel-edit');
    [closeBtn, cancelBtn].forEach(btn => btn.addEventListener('click', () => modal.classList.add('hidden')));
    modal.addEventListener('click', e => e.target === modal && modal.classList.add('hidden'));
}

function handlePriceAction(action, docId, data) {
    if (action === 'edit') {
        editPrice(docId);
    } else if (action === 'delete') {
        deletePrice(docId, data.product_name);
    }
}

async function handleAddPrice(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    try {
        const response = await authenticatedFetch('/api/prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Action-Identifier': 'CREATE_PRICE' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            showAlert('success', 'Thêm giá thành công');
            e.target.reset();
            document.getElementById('effective-date').value = new Date().toString("dd/MM/yyyy").split('T')[0];
            document.getElementById('tab-manage').click();
        } else {
            showAlert('error', result.error || 'Không thể thêm giá');
        }
    } catch (error) {
        showAlert('error', 'Lỗi khi thêm giá');
    }
}

async function handleSearch() {
    currentFilters = {
        product_name: document.getElementById('search-products').value,
        supplier: document.getElementById('search-supplier').value,
        min_price: document.getElementById('min-price').value,
        max_price: document.getElementById('max-price').value
    };
    currentPage = 1;
    await loadPrices();
}

async function handleClearSearch() {
    document.getElementById('search-products').value = '';
    document.getElementById('search-supplier').value = '';
    document.getElementById('min-price').value = '';
    document.getElementById('max-price').value = '';
    currentFilters = {};
    currentPage = 1;
    await loadPrices();
}

// --- MODAL AND ACTIONS ---

async function editPrice(priceId) {
    try {
        const response = await authenticatedFetch(`/api/prices/${priceId}`, { 
            headers: { 'X-Action-Identifier': 'READ_PRICE' }
        });
        const result = await response.json();
        if (result.success) {
            populateEditForm(result.data);
            document.getElementById('edit-modal').classList.remove('hidden');
        } else {
            showAlert('error', 'Không tìm thấy thông tin giá.');
        }
    } catch (error) {
        showAlert('error', 'Lỗi khi tải thông tin giá');
    }
}

function populateEditForm(price) {
    document.getElementById('edit-price-id').value = price.id;
    document.getElementById('edit-product-name').value = price.product_name;
    document.getElementById('edit-price').value = price.price;
    document.getElementById('edit-effective-date').value = new Date(price.effective_date).toString("dd/MM/yyyy").split('T')[0];
    document.getElementById('edit-supplier').value = price.supplier;
    document.getElementById('edit-notes').value = price.notes;
}

async function handleEditPrice(e) {
    e.preventDefault();
    const priceId = document.getElementById('edit-price-id').value;
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    try {
        const response = await authenticatedFetch(`/api/prices/${priceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Action-Identifier': 'UPDATE_PRICE' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            showAlert('success', 'Cập nhật giá thành công');
            document.getElementById('edit-modal').classList.add('hidden');
            await loadPrices();
        } else {
            showAlert('error', result.error || 'Không thể cập nhật giá');
        }
    } catch (error) {
        showAlert('error', 'Lỗi khi cập nhật giá');
    }
}

async function deletePrice(priceId, productName) {
    if (!confirm(`Bạn có chắc chắn muốn xóa giá của "${productName}"?`)) return;
    try {
        const response = await authenticatedFetch(`/api/prices/${priceId}`, {
            method: 'DELETE',
            headers: { 'X-Action-Identifier': 'DELETE_PRICE' }
        });
        const result = await response.json();
        if (result.success) {
            showAlert('success', 'Xóa giá thành công');
            await loadPrices(); 
        } else {
            showAlert('error', result.error || 'Không thể xóa giá');
        }
    } catch (error) {
        showAlert('error', 'Lỗi khi xóa giá');
    }
}

// --- UTILITY FUNCTIONS ---

function showLoading(isLoading, isError = false, message = '') {
    const tableContainer = document.getElementById('prices-table-container');
    if (isLoading) {
        tableContainer.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p class="mt-2 text-gray-600">Đang tải...</p></div>';
    } else if (isError) {
        tableContainer.innerHTML = `<div class="text-center py-8 text-red-500">${message}</div>`;
    }
}

function updatePagination(page, limit, displayedResults, totalRecords) {
    const pagination = document.getElementById('pagination');
    if (!totalRecords || displayedResults === 0) {
        pagination.classList.add('hidden');
        return;
    }
    pagination.classList.remove('hidden');

    const totalPages = Math.ceil(totalRecords / limit);
    const from = (page - 1) * limit + 1;
    const to = from + displayedResults - 1;

    document.getElementById('showing-from').textContent = from;
    document.getElementById('showing-to').textContent = to;
    document.getElementById('total-results').textContent = totalRecords;

    document.getElementById('prev-page').disabled = page <= 1;
    document.getElementById('next-page').disabled = page >= totalPages;
    document.getElementById('current-page-info').textContent = `Trang ${page}`;
}
