import { showAlert, formatDate, authenticatedFetch } from './utils.js';
import { ICONS } from './icons.js';

let mgmtState = { 
    activeMonthLink: null,
    activeYear: null,
    activeMonth: null,
    expenseItems: [],
    typeItems: [],
};

// --- EVENT LISTENER ATTACHMENT FUNCTIONS ---

function attachTreeEventListeners() {
    document.querySelectorAll('.month-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const year = target.getAttribute('data-year');
            const month = target.getAttribute('data-month');
            loadMonthData(year, month, target);
        });
    });

    document.querySelectorAll('.toggle').forEach(toggler => {
        toggler.addEventListener('click', (e) => {
            e.currentTarget.parentElement.querySelector(".nested").classList.toggle("active");
            e.currentTarget.classList.toggle("caret-down");
        });
    });
}

function attachTabEventListeners() {
    document.querySelectorAll('[data-tab-id]').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabId = e.currentTarget.getAttribute('data-tab-id');
            switchTab(tabId);
        });
    });
}

function attachFormEventListeners(tabId) {
    const form = document.querySelector(`.item-form[data-tab-id='${tabId}']`);
    if (form) {
        form.addEventListener('submit', handleMgmtFormSubmit);
        const typeSelect = form.querySelector('select[name="Loại"]');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => toggleSavingsFields(e.currentTarget));
        }
    }
}

// --- RENDERING FUNCTIONS ---

function renderNewItemForm(tabId) {
    const today = new Date().toISOString().split('T')[0];
    const itemsHtml = mgmtState.expenseItems.map(item => `<option value="${item['name']}">${item['name']}</option>`).join('');
    return `
        <form class="item-form p-4 bg-gray-50 rounded" data-tab-id="${tabId}">
            <h3 class="text-lg font-bold mb-4">Tạo khoản thu/chi mới</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Loại (Thu/Chi)</label>
                    <select name="Loại" required class="modern-select input-field">
                        <option value="Thu">Thu</option>
                        <option value="Chi">Chi</option>
                        <option value="Tiết kiệm">Tiết kiệm</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Tên khoản</label>
                    <select name="Tên" required class="modern-select input-field"><option value="" disabled selected>Chọn mục</option>${itemsHtml}</select>
                </div>
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Số tiền (VND)</label>
                    <input type="number" name="Số tiền" required class="input-field">
                </div>
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Ngày</label>
                    <input type="date" name="date" value="${today}" required class="input-field">
                </div>
            </div>
            <div class="saving-fields mt-4 space-y-4" style="display:none">
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Lãi suất (%/năm)</label>
                    <input type="number" step="0.01" name="rate" value="" class="input-field">
                </div>
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Kỳ hạn (tháng)</label>
                    <input type="number" name="term" value="" class="input-field">
                </div>
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Ghi chú</label>
                    <input name="note" value="" class="input-field">
                </div>
            </div>
            <div class="form-actions mt-6 text-right">
                 <button type="submit" class="btn btn-primary btn-save">Lưu mới</button>
            </div>
        </form>`;
}

function toggleSavingsFields(selectElement) {
    const form = selectElement.closest('form');
    const savingFields = form.querySelector('.saving-fields');
    if (selectElement.value === 'Tiết kiệm') {
        savingFields.style.display = 'block';
    } else {
        savingFields.style.display = 'none';
    }
}

function renderRecordsTable(item) {
    if (!item || !item.records || item.records.length === 0) return '<p class="text-center text-gray-500 p-4">Không có dữ liệu cho mục này.</p>';
    let tableHtml = '<div class="overflow-x-auto shadow-lg rounded-lg"><table class="min-w-full bg-white">';
    tableHtml += '<thead class="bg-green-600 text-white"><tr>';
    tableHtml += '<th class="py-3 px-4 text-center uppercase font-semibold text-sm">STT</th>';
    tableHtml += '<th class="py-3 px-4 text-left uppercase font-semibold text-sm">Tên</th>';
    tableHtml += '<th class="py-3 px-4 text-left uppercase font-semibold text-sm">Số tiền</th>';
    if (item.id === "Tiết kiệm") {
        tableHtml += '<th class="py-3 px-4 text-left uppercase font-semibold text-sm">Lãi suất (%/năm)</th>';
        tableHtml += '<th class="py-3 px-4 text-left uppercase font-semibold text-sm">Kỳ hạn (Tháng)</th>';
        tableHtml += '<th class="py-3 px-4 text-left uppercase font-semibold text-sm">LS tính đến hôm nay</th>';
        tableHtml += '<th class="py-3 px-4 text-left uppercase font-semibold text-sm">Ghi chú</th>';
    }
    tableHtml += '<th class="py-2 px-4 text-center uppercase font-semibold text-sm">Ngày</th>';
    tableHtml += '<th class="py-2 px-4 text-center uppercase font-semibold text-sm">hành động</th>';
    tableHtml += '</tr></thead><tbody class="text-gray-700">';
    item.records.forEach((record, i) => {
        const rowClass = i % 2 === 0 ? 'bg-white' : 'bg-green-50';
        const amount = typeof record['amount'] === 'number' ? record['amount'].toLocaleString('vi-VN') + ' VND' : record['amount'];
        tableHtml += `<tr class="${rowClass}">`
        if (item.id === "Tiết kiệm") {
            const rate = record['rate'];
            const today = new Date();
            const recordDate = new Date(record['date']);
            const days = Math.ceil((today - recordDate) / (1000 * 60 * 60 * 24));
            const interestYield = Math.round(record['amount'] * rate * days / 36500,0).toLocaleString('vi-VN') + ' VND';
            tableHtml += `
            <td class="py-2 px-4 text-center">${i + 1}</td>
            <td class="py-2 px-4">${record['name'] || 'N/A'}</td>
            <td class="py-2 px-4">${amount || 'N/A'}</td>
            <td class="py-2 px-4">${rate || 'N/A'} </td>
            <td class="py-2 px-4">${record['term'] || 'N/A'}</td>
            <td class="py-2 px-4">${interestYield || 'N/A'}</td>
            <td class="py-2 px-4">${record['note']|| 'N/A'}</td>
            <td class="py-2 px-4 text-center">${record['date'] || 'N/A'}</td>`;
        } else {
            tableHtml += `
                <td class="py-2 px-4 text-center">${i + 1}</td>
                <td class="py-2 px-4">${record['name'] || 'N/A'}</td>
                <td class="py-2 px-4">${amount || 'N/A'}</td>
                <td class="py-2 px-4 text-center">${formatDate(record['date']) || 'N/A'}</td>`;
        }
        tableHtml += `<td class="py-3 px-4 flex items-center justify-end space-x-2">
            <button class="p-1 hover:bg-gray-200 rounded-full edit-record-btn" data-type-id="${item.id}" data-record-id="${record.id}" title="Sửa">${ICONS.EDIT}</button>
            <button class="p-1 hover:bg-gray-200 rounded-full delete-record-btn" data-type-id="${item.id}" data-record-id="${record.id}" title="Xóa">${ICONS.DELETE}</button>
            </td></tr>`;
    });
    tableHtml += '</tbody></table></div>';
    return tableHtml;
}

// --- CORE LOGIC FUNCTIONS ---

function switchTab(tabId) {
    document.querySelectorAll('[data-tab-id]').forEach(tab => tab.classList.remove('active-tab'));
    document.querySelectorAll('.item-tab-content').forEach(content => content.style.display = 'none');
    const selectedTab = document.querySelector(`[data-tab-id='${tabId}']`);
    const selectedContent = document.getElementById(tabId);
    if (selectedTab) selectedTab.classList.add('active-tab');
    if (selectedContent) selectedContent.style.display = 'block';
}

async function loadExpenseItems() {
    if (mgmtState.expenseItems.length > 0) return;
    try {
        const response = await fetch('/api/items');
        if (!response.ok) throw new Error('Failed to fetch expense items.');
        mgmtState.expenseItems = await response.json();
    } catch (e) {
        console.error("Error loading expense items:", e);
    }
}

async function loadTypeItems() {
    try {
        const response = await fetch(`/api/management/items/${mgmtState.activeYear}/${mgmtState.activeMonth}`);
        if (!response.ok) throw new Error('Failed to fetch type items.');
        mgmtState.typeItems = await response.json();
    } catch (e) {
        console.error("Error loading type items:", e);
        mgmtState.typeItems = [];
    }
}

async function loadMonthData(year, month, monthElement) {
    if (mgmtState.activeMonthLink) mgmtState.activeMonthLink.classList.remove('active-month');
    monthElement.classList.add('active-month');
    mgmtState.activeYear = year; mgmtState.activeMonth = month; mgmtState.activeMonthLink = monthElement;

    const tabBar = document.getElementById('item-tab-bar');
    const contentContainer = document.getElementById('item-tab-content-container');
    tabBar.innerHTML = '';
    contentContainer.innerHTML = '<p id="viewer-placeholder">Đang tải dữ liệu...</p>';

    try {
        await loadTypeItems();
        await loadExpenseItems();
        const response = await fetch(`/api/management/items/${year}/${month}`);
        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        const items = await response.json();

        if(document.getElementById('viewer-placeholder')) document.getElementById('viewer-placeholder').style.display = 'none';

        let tabBarHtml = '';
        let contentHtml = '';
        const newTabId = 'new-item-tab';
         // --- REDESIGNED "ADD NEW" BUTTON ---
         
        //tabBarHtml += `<div class="special-tab" data-tab-id="${newTabId}"><span></span></div>`;
        contentHtml += `<div class="item-tab-content" id="${newTabId}" style="display: none;">${renderNewItemForm(newTabId)}</div>`;

        items.forEach(item => {
            const tabId = `tab-${item.id}`;
            const itemTypeClass = item.type === 'thu' ? 'tab-thu' : 'tab-chi';
            tabBarHtml += `<div class="item-tab ${itemTypeClass}" data-tab-id="${tabId}"><span>${item['Tên'] || item.id}</span></div>`;
            contentHtml += `<div class="item-tab-content" id="${tabId}" style="display: none;">${renderRecordsTable(item)}</div>`;
        });
        tabBarHtml += `
                    <div class="flex-shrink-0 p-2 border-r border-gray-200">
                        <button class="btn btn-primary" data-tab-id="${newTabId}">
                            ${ICONS.ADD}
                            Thêm khoản mục
                        </button>
                    </div>
                    `;     
        tabBar.innerHTML = tabBarHtml;
        contentContainer.innerHTML = contentHtml;
        
        attachTabEventListeners();
        attachFormEventListeners(newTabId);
        attachRecordActionListeners();

        if (items && items.length > 0) {
            switchTab(`tab-${items[0].id}`);
        } else {
            if(document.getElementById('viewer-placeholder')) {
                document.getElementById('viewer-placeholder').textContent = "Không có khoản chi nào trong tháng này.";
                document.getElementById('viewer-placeholder').style.display = 'block';
            }
            switchTab(newTabId);
        }
    } catch (e) {
        if(document.getElementById('viewer-placeholder')) document.getElementById('viewer-placeholder').textContent = `Lỗi khi tải dữ liệu: ${e.message}`;
        console.error('Error in loadMonthData:', e);
    }
}

async function handleMgmtFormSubmit(event) {
    event.preventDefault();
    if (!mgmtState.activeYear || !mgmtState.activeMonth) {
        showAlert('error', "Vui lòng chọn một tháng từ menu.");
        return;
    }
    const data = Object.fromEntries(new FormData(event.target));
    data.year = mgmtState.activeYear;
    data.month = mgmtState.activeMonth;

    try {
        const uri = `/api/management/items`;        
        await authenticatedFetch(uri, {
            method: 'POST',
            headers: { 'X-Action-Identifier': 'ADD_MANAGEMENT_ITEM' },
            body: JSON.stringify(data)
        });
        showAlert('success', 'Tạo mục mới thành công!');
        await loadMonthData(mgmtState.activeYear, mgmtState.activeMonth, mgmtState.activeMonthLink);
    } catch (error) {
        console.error('New item form submission error:', error);
        showAlert('error', `Lỗi: ${error.message}`);
    }
}

/**
 * Attaches event listeners to edit and delete buttons in record tables
 */
function attachRecordActionListeners() {
    // Edit buttons
    document.querySelectorAll('.edit-record-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const typeId = e.currentTarget.dataset.typeId;
            const recordId = e.currentTarget.dataset.recordId;
            await showEditRecordModal(typeId, recordId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-record-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const typeId = e.currentTarget.dataset.typeId;
            const recordId = e.currentTarget.dataset.recordId;
            await handleDeleteRecord(typeId, recordId);
        });
    });
}

/**
 * Shows modal to edit a record
 */
async function showEditRecordModal(typeId, recordId) {
    if (!mgmtState.activeYear || !mgmtState.activeMonth) {
        showAlert('error', 'Không thể xác định năm/tháng hiện tại');
        return;
    }

    // Find the record in current state
    const typeItem = mgmtState.typeItems.find(item => item.id === typeId);
    if (!typeItem || !typeItem.records) {
        showAlert('error', 'Không tìm thấy dữ liệu');
        return;
    }

    const record = typeItem.records.find(r => r.id === recordId);
    if (!record) {
        showAlert('error', 'Không tìm thấy bản ghi');
        return;
    }

    // Build edit form - Allow editing amount (and rate/term/note for savings)
    const modal = document.getElementById('edit-modal');
    const formContainer = document.getElementById('edit-form-container');

    let formHtml = `
        <form id="edit-record-form" class="text-left space-y-4">
            <input type="hidden" name="typeId" value="${typeId}">
            <input type="hidden" name="recordId" value="${recordId}">
            <input type="hidden" name="name" value="${record.name || ''}">
            <input type="hidden" name="date" value="${record.date || ''}">
            
            <div class="bg-gray-50 p-4 rounded-lg space-y-3">
                <div class="flex justify-between">
                    <span class="text-gray-600 font-medium">Tên khoản:</span>
                    <span class="text-gray-900 font-semibold">${record.name || 'N/A'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600 font-medium">Ngày:</span>
                    <span class="text-gray-900 font-semibold">${formatDate(record.date) || 'N/A'}</span>
                </div>
            </div>
            
            <div class="mt-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">
                    Số tiền (VND) <span class="text-red-500">*</span>
                </label>
                <input type="number" name="amount" value="${record.amount || ''}" required 
                       class="input-field w-full text-lg font-semibold text-green-600 focus:ring-2 focus:ring-green-500"
                       placeholder="Nhập số tiền mới">
                <p class="text-sm text-gray-500 mt-1">Số tiền hiện tại: ${(record.amount || 0).toLocaleString('vi-VN')} VND</p>
            </div>`;

    if (typeId === 'Tiết kiệm') {
        formHtml += `
            <div class="border-t pt-4 mt-4">
                <h4 class="text-md font-semibold text-gray-700 mb-3">Thông tin tiết kiệm</h4>
                <div class="space-y-3">
                    <div>
                        <label class="block text-gray-700 text-sm font-bold mb-2">
                            Lãi suất (%/năm) <span class="text-red-500">*</span>
                        </label>
                        <input type="number" step="0.01" name="rate" value="${record.rate || ''}" required
                               class="input-field w-full focus:ring-2 focus:ring-blue-500"
                               placeholder="Ví dụ: 6.5">
                    </div>
                    <div>
                        <label class="block text-gray-700 text-sm font-bold mb-2">
                            Kỳ hạn (tháng) <span class="text-red-500">*</span>
                        </label>
                        <input type="number" name="term" value="${record.term || ''}" required
                               class="input-field w-full focus:ring-2 focus:ring-blue-500"
                               placeholder="Ví dụ: 12">
                    </div>
                    <div>
                        <label class="block text-gray-700 text-sm font-bold mb-2">Ghi chú</label>
                        <textarea name="note" rows="2" class="input-field w-full focus:ring-2 focus:ring-blue-500"
                                  placeholder="Ghi chú thêm (tùy chọn)">${record.note || ''}</textarea>
                    </div>
                </div>
            </div>`;
    }

    formHtml += `
            <div class="flex justify-end space-x-3 pt-4">
                <button type="button" id="cancel-edit-btn-form" class="btn btn-secondary">Hủy</button>
                <button type="submit" class="btn btn-primary">Lưu thay đổi</button>
            </div>
        </form>`;

    formContainer.innerHTML = formHtml;
    modal.style.display = 'flex';

    // Attach event listeners
    const closeModal = () => {
        modal.style.display = 'none';
    };

    document.getElementById('cancel-edit-btn-form').addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.getElementById('edit-record-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleUpdateRecord(e);
    });
}

/**
 * Handles updating a record
 */
async function handleUpdateRecord(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const typeId = formData.get('typeId');
    const recordId = formData.get('recordId');
    
    const recordData = {
        name: formData.get('name'),
        amount: parseInt(formData.get('amount')),
        date: formData.get('date')
    };

    if (typeId === 'Tiết kiệm') {
        recordData.rate = parseFloat(formData.get('rate')) || 0;
        recordData.term = parseInt(formData.get('term')) || 0;
        recordData.note = formData.get('note') || '';
    }

    try {
        await authenticatedFetch('/api/management/record', {
            method: 'PUT',
            headers: { 'X-Action-Identifier': 'UPDATE_MANAGEMENT_RECORD' },
            body: JSON.stringify({
                year: mgmtState.activeYear,
                month: mgmtState.activeMonth,
                typeId,
                recordId,
                recordData
            })
        });

        showAlert('success', 'Cập nhật thành công!');
        document.getElementById('edit-modal').style.display = 'none';
        await loadMonthData(mgmtState.activeYear, mgmtState.activeMonth, mgmtState.activeMonthLink);
    } catch (error) {
        console.error('Error updating record:', error);
        showAlert('error', `Lỗi: ${error.message}`);
    }
}

/**
 * Handles deleting a record
 */
async function handleDeleteRecord(typeId, recordId) {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) {
        return;
    }

    try {
        await authenticatedFetch('/api/management/record', {
            method: 'DELETE',
            headers: { 'X-Action-Identifier': 'DELETE_MANAGEMENT_RECORD' },
            body: JSON.stringify({
                year: mgmtState.activeYear,
                month: mgmtState.activeMonth,
                typeId,
                recordId
            })
        });

        showAlert('success', 'Xóa thành công!');
        await loadMonthData(mgmtState.activeYear, mgmtState.activeMonth, mgmtState.activeMonthLink);
    } catch (error) {
        console.error('Error deleting record:', error);
        showAlert('error', `Lỗi: ${error.message}`);
    }
}

export async function loadManagementPage() {
    const treeContainer = document.getElementById('management-tree');
    if (!treeContainer) return;
    try {
        //await loadExpenseItems();
        const response = await fetch('/api/management/tree');
        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        const structure = await response.json();
        treeContainer.innerHTML = `<ul>${Object.keys(structure).sort((a,b) => b-a).map(year => `
            <li><span class="toggle">${year}</span><ul class="nested">${structure[year].map(month => `
                <li><span class="month-link" data-year="${year}" data-month="${month}">Tháng ${month}</span></li>`).join('')}</ul></li>`).join('')}</ul>`;
        
        attachTreeEventListeners();

    } catch (e) {
        treeContainer.innerHTML = `<p class="text-red-500">Lỗi khi tải cây quản lý: ${e.message}</p>`;
    }
}
