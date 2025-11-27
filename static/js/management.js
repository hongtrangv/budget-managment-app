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
    const itemsHtml = mgmtState.expenseItems.map(item => `<option value="${item['id']}">${item['id']}</option>`).join('');
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
                 <button type="submit" class="btn-save">Lưu mới</button>
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
                <td class="py-2 px-4 text-center">${record['date'] || 'N/A'}</td>`;
        }
        tableHtml += `<td class="py-3 px-4 flex items-center justify-end space-x-2">
            <button class="p-1 hover:bg-gray-200 rounded-full edit-btn" data-id="${item.id}" title="Sửa"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button>
            <button class="p-1 hover:bg-gray-200 rounded-full delete-btn" data-id="${item.id}" title="Xóa"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button>
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
        const response = await fetch(`/api/management/items/${year}/${month}`);
        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        const items = await response.json();

        if(document.getElementById('viewer-placeholder')) document.getElementById('viewer-placeholder').style.display = 'none';

        let tabBarHtml = '';
        let contentHtml = '';
        const newTabId = 'new-item-tab';
        tabBarHtml += `<div class="special-tab" data-tab-id="${newTabId}"><span>+</span></div>`;
        contentHtml += `<div class="item-tab-content" id="${newTabId}" style="display: none;">${renderNewItemForm(newTabId)}</div>`;

        items.forEach(item => {
            const tabId = `tab-${item.id}`;
            tabBarHtml += `<div class="item-tab" data-tab-id="${tabId}"><span>${item['Tên'] || item.id}</span></div>`;
            contentHtml += `<div class="item-tab-content" id="${tabId}" style="display: none;">${renderRecordsTable(item)}</div>`;
        });

        tabBar.innerHTML = tabBarHtml;
        contentContainer.innerHTML = contentHtml;
        
        attachTabEventListeners();
        attachFormEventListeners(newTabId);

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
        alert("Vui lòng chọn một tháng từ menu.");
        return;
    }
    const data = Object.fromEntries(new FormData(event.target));
    data.year = mgmtState.activeYear;
    data.month = mgmtState.activeMonth;

    try {
        const response = await fetch('/api/management/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!response.ok) throw new Error((await response.json()).error || 'Không thể tạo mục mới.');
        alert('Tạo mục mới thành công!');
        await loadMonthData(mgmtState.activeYear, mgmtState.activeMonth, mgmtState.activeMonthLink);
    } catch (error) {
        console.error('New item form submission error:', error);
        alert(`Lỗi: ${error.message}`);
    }
}

export async function loadManagementPage() {
    const treeContainer = document.getElementById('management-tree');
    if (!treeContainer) return;
    try {
        await loadExpenseItems();
        const response = await fetch('/api/management/tree');
        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        const structure = await response.json();
        treeContainer.innerHTML = `<ul>${Object.keys(structure).sort((a,b) => b-a).map(year => `
            <li><span class="toggle caret-down">${year}</span><ul class="nested active">${structure[year].map(month => `
                <li><span class="month-link" data-year="${year}" data-month="${month}">Tháng ${month}</span></li>`).join('')}</ul></li>`).join('')}</ul>`;
        
        attachTreeEventListeners();

    } catch (e) {
        treeContainer.innerHTML = `<p class="text-red-500">Lỗi khi tải cây quản lý: ${e.message}</p>`;
    }
}
