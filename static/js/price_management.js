import { authenticatedFetch, formatCurrency, showAlert } from './utils.js';

// State management
let currentPage = 1;
let currentFilters = {};
const pageSize = 20;

/**
 * Initialize price management page
 */
export async function loadPriceManagementPage() {
    try {
        setupTabNavigation();
        setupFormHandlers();
        setupSearchHandlers();
        setupModalHandlers();
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('effective-date').value = today;
        
        // Load initial data for manage tab
        await loadPrices();
        
    } catch (error) {
        console.error('Error initializing price management page:', error);
        showAlert('error', 'Lỗi khởi tạo trang quản lý giá');
    }
}

/**
 * Setup tab navigation
 */
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.id.replace('tab-', '');
            
            // Update button states
            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            });
            
            button.classList.add('active', 'border-blue-500', 'text-blue-600');
            button.classList.remove('border-transparent', 'text-gray-500');
            
            // Update content visibility
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            document.getElementById(`content-${tabId}`).classList.remove('hidden');
            
            // Load data if switching to manage tab
            if (tabId === 'manage') {
                loadPrices();
            }
        });
    });
}

/**
 * Setup form handlers
 */
function setupFormHandlers() {
    // Add price form
    const priceForm = document.getElementById('price-form');
    priceForm.addEventListener('submit', handleAddPrice);
    
    // Reset form button
    document.getElementById('reset-form').addEventListener('click', () => {
        priceForm.reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('effective-date').value = today;
    });
    
    // Edit price form
    const editForm = document.getElementById('edit-price-form');
    editForm.addEventListener('submit', handleEditPrice);
}

/**
 * Setup search handlers
 */
function setupSearchHandlers() {
    document.getElementById('search-prices').addEventListener('click', handleSearch);
    document.getElementById('clear-search').addEventListener('click', handleClearSearch);
    
    // Enter key search
    const searchInputs = ['search-product', 'search-supplier', 'min-price', 'max-price'];
    searchInputs.forEach(inputId => {
        document.getElementById(inputId).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    });
    
    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadPrices();
        }
    });
    
    document.getElementById('next-page').addEventListener('click', () => {
        currentPage++;
        loadPrices();
    });
}

/**
 * Setup modal handlers
 */
function setupModalHandlers() {
    const modal = document.getElementById('edit-modal');
    const closeBtn = document.getElementById('close-edit-modal');
    const cancelBtn = document.getElementById('cancel-edit');
    
    [closeBtn, cancelBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

/**
 * Handle add price form submission
 */
async function handleAddPrice(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        const response = await authenticatedFetch('/api/prices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Action-Identifier': 'CREATE_PRICE'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('success', 'Thêm thông tin giá thành công');
            e.target.reset();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('effective-date').value = today;
            
            // Switch to manage tab and reload data
            document.getElementById('tab-manage').click();
            await loadPrices();
        } else {
            showAlert('error', result.error || 'Không thể thêm thông tin giá');
        }
        
    } catch (error) {
        console.error('Error adding price:', error);
        showAlert('error', 'Lỗi khi thêm thông tin giá');
    }
}

/**
 * Handle search
 */
async function handleSearch() {
    currentFilters = {
        product_name: document.getElementById('search-product').value.trim(),
        supplier: document.getElementById('search-supplier').value.trim(),
        min_price: document.getElementById('min-price').value,
        max_price: document.getElementById('max-price').value
    };
    
    currentPage = 1;
    await loadPrices();
}

/**
 * Handle clear search
 */
async function handleClearSearch() {
    document.getElementById('search-product').value = '';
    document.getElementById('search-supplier').value = '';
    document.getElementById('min-price').value = '';
    document.getElementById('max-price').value = '';
    
    currentFilters = {};
    currentPage = 1;
    await loadPrices();
}

/**
 * Load prices with current filters and pagination
 */
async function loadPrices() {
    try {
        showLoading(true);
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: pageSize,
            ...currentFilters
        });
        
        const response = await authenticatedFetch(`/api/prices?${params}`, {
            headers: {
                'X-Action-Identifier': 'READ_PRICE'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            renderPricesTable(result.data);
            updatePagination(result);
        } else {
            showAlert('error', result.error || 'Không thể tải danh sách giá');
        }
        
    } catch (error) {
        console.error('Error loading prices:', error);
        showAlert('error', 'Lỗi khi tải danh sách giá');
    } finally {
        showLoading(false);
    }
}

/**
 * Render prices table
 */
function renderPricesTable(prices) {
    const tbody = document.getElementById('prices-tbody');
    const noResults = document.getElementById('no-results');
    const tableContainer = document.getElementById('prices-table-container');
    
    if (!prices || prices.length === 0) {
        tableContainer.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }
    
    tableContainer.classList.remove('hidden');
    noResults.classList.add('hidden');
    
    tbody.innerHTML = prices.map(price => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${escapeHtml(price.product_name || '')}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 font-semibold">${formatCurrency(price.price || 0)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${formatDate(price.effective_date || '')}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${escapeHtml(price.supplier || '')}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-900 max-w-xs truncate" title="${escapeHtml(price.notes || '')}">
                    ${escapeHtml(price.notes || '-')}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="editPrice('${price.id}')" 
                        class="text-blue-600 hover:text-blue-900 mr-3">
                    Sửa
                </button>
                <button onclick="deletePrice('${price.id}', '${escapeHtml(price.product_name || '')}')" 
                        class="text-red-600 hover:text-red-900">
                    Xóa
                </button>
            </td>
        </tr>
    `).join('');
    
    // Update results count
    document.getElementById('results-count').textContent = `${prices.length} kết quả`;
}

/**
 * Update pagination
 */
function updatePagination(result) {
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const currentPageInfo = document.getElementById('current-page-info');
    
    if (result.data && result.data.length > 0) {
        pagination.classList.remove('hidden');
        
        // Update buttons
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = result.data.length < pageSize;
        
        // Update page info
        currentPageInfo.textContent = `Trang ${currentPage}`;
        
        // Update showing info
        const from = (currentPage - 1) * pageSize + 1;
        const to = Math.min(currentPage * pageSize, from + result.data.length - 1);
        
        document.getElementById('showing-from').textContent = from;
        document.getElementById('showing-to').textContent = to;
        document.getElementById('total-results').textContent = `${result.data.length}+`;
    } else {
        pagination.classList.add('hidden');
    }
}

/**
 * Show/hide loading
 */
function showLoading(show) {
    const loading = document.getElementById('loading');
    const tableContainer = document.getElementById('prices-table-container');
    const noResults = document.getElementById('no-results');
    
    if (show) {
        loading.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        noResults.classList.add('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

/**
 * Edit price
 */
window.editPrice = async function(priceId) {
    try {
        const response = await authenticatedFetch(`/api/prices?id=${priceId}`, {
            headers: {
                'X-Action-Identifier': 'READ_PRICE'
            }
        });
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            const price = result.data.find(p => p.id === priceId);
            if (price) {
                populateEditForm(price);
                document.getElementById('edit-modal').classList.remove('hidden');
            }
        } else {
            showAlert('error', 'Không tìm thấy thông tin giá');
        }
        
    } catch (error) {
        console.error('Error loading price for edit:', error);
        showAlert('error', 'Lỗi khi tải thông tin giá');
    }
};

/**
 * Populate edit form
 */
function populateEditForm(price) {
    document.getElementById('edit-price-id').value = price.id;
    document.getElementById('edit-product-name').value = price.product_name || '';
    document.getElementById('edit-price').value = price.price || '';
    document.getElementById('edit-effective-date').value = price.effective_date || '';
    document.getElementById('edit-supplier').value = price.supplier || '';
    document.getElementById('edit-notes').value = price.notes || '';
}

/**
 * Handle edit price form submission
 */
async function handleEditPrice(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const priceId = data.id;
        delete data.id;
        
        const response = await authenticatedFetch(`/api/prices/${priceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Action-Identifier': 'UPDATE_PRICE'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('success', 'Cập nhật thông tin giá thành công');
            document.getElementById('edit-modal').classList.add('hidden');
            await loadPrices();
        } else {
            showAlert('error', result.error || 'Không thể cập nhật thông tin giá');
        }
        
    } catch (error) {
        console.error('Error updating price:', error);
        showAlert('error', 'Lỗi khi cập nhật thông tin giá');
    }
}

/**
 * Delete price
 */
window.deletePrice = async function(priceId, productName) {
    if (!confirm(`Bạn có chắc chắn muốn xóa thông tin giá của "${productName}"?`)) {
        return;
    }
    
    try {
        const response = await authenticatedFetch(`/api/prices/${priceId}`, {
            method: 'DELETE',
            headers: {
                'X-Action-Identifier': 'DELETE_PRICE'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('success', 'Xóa thông tin giá thành công');
            await loadPrices();
        } else {
            showAlert('error', result.error || 'Không thể xóa thông tin giá');
        }
        
    } catch (error) {
        console.error('Error deleting price:', error);
        showAlert('error', 'Lỗi khi xóa thông tin giá');
    }
};

/**
 * Utility functions
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    } catch {
        return dateString;
    }
}