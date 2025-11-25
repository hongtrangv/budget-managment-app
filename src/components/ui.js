const content = document.getElementById('content');
const menuContainer = document.getElementById('menu-container');

// --- State variables ---
let currentCollection = 'Items';
let currentDocuments = [];
let currentHeaders = [];
let isEditMode = false;
let currentDocId = null;
let mgmtState = { // State specifically for the Management page
    activeMonthLink: null,
    activeYear: null,
    activeMonth: null,
    expenseItems: [],
    typeItems: [],
};
let homeChart = null;
// ==================================================
//  LOGIC FOR THE "HOME" PAGE
// ==================================================
async function updateHomeChart () {
    try {
        const yearSelect = document.getElementById('home-year-select').value;
        const monthSelect = document.getElementById('home-month-select').value;
        console.error("Error rendering summary chart:", yearSelect,monthSelect);
        const response = await fetch(`/api/dashboard/summary/${yearSelect}/${monthSelect}`);
        if (!response.ok) throw new Error(`API call failed with status ${response.status}`);
        const data = await response.json();
        const ctx = document.getElementById('summary-chart')?.getContext('2d');
        if (!ctx) return; // Canvas not found, do nothing
        // Nếu chart đã tồn tại → hủy chart cũ
        if (homeChart) {
            homeChart.destroy();
        }

        homeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Tổng Thu', 'Tổng Chi'],
                datasets: [{
                    label: 'Số tiền (VND)',
                    data: [data.income, data.expense],
                    backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)'],
                    borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { callback: value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value) } } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: context => {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) label += new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(context.parsed.y);
                                return label;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error rendering summary chart:", error);
        const chartContainer = document.getElementById('summary-chart')?.parentElement;
        if (chartContainer) chartContainer.innerHTML = `<p class="text-center text-red-500">Không thể tải dữ liệu biểu đồ. Lỗi: ${error.message}</p>`;
    }
}
async function loadHomePage() {   
        const yearSelect = document.getElementById('home-year-select');
        const monthSelect = document.getElementById('home-month-select');
        try {
            const response = await fetch(`/api/dashboard/years`);
            if (!response.ok) throw new Error('Could not fetch years');
            const years = await response.json();           
            const currentYear = new Date().getFullYear().toString();
            console.error(years);
            yearSelect.innerHTML = years.map(y => `<option value="${y.id}" ${y.id === currentYear ? 'selected' : ''}>Năm ${y.id}</option>`).join('');
            let monthOptions = ''
            for (let i = 1; i <= 12; i++) {
                monthOptions += `<option value="${i}">Tháng ${i}</option>`;
            }
            monthSelect.innerHTML = monthOptions;

            yearSelect.addEventListener('change', updateHomeChart);
            monthSelect.addEventListener('change', updateHomeChart);

            // Initial chart load
            await updateHomeChart();

        } catch (error) {
            console.error('Failed to load home page filters:', error);
            yearSelect.innerHTML = '<option>Lỗi tải năm</option>';
        }
        
}

// ==================================================
//  LOGIC FOR THE "COLLECTIONS" PAGE
// ==================================================
function createTable(documents, headers) {
    if (!documents || documents.length === 0) return '<p class="text-center text-gray-500">Không tìm thấy mục nào.</p>';
    let html = '<div class="overflow-x-auto shadow-lg rounded-lg"><table class="min-w-full bg-white">';
    html += '<thead class="bg-green-600 text-white"><tr>';
    headers.forEach(key => { if (key !== 'id') html += `<th class="py-3 px-4 text-left uppercase font-semibold text-sm">${key}</th>`; });
    html += '<th class="py-3 px-4 text-right uppercase font-semibold text-sm">Hành động</th></tr></thead><tbody class="text-gray-700">';
    documents.forEach((doc, index) => {
        const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-green-50';
        html += `<tr class="${rowClass}" data-id="${doc['id']}">`;
        headers.forEach(header => { if (header !== 'id') html += `<td class="py-3 px-4">${doc[header] || ''}</td>`; });
        html += `<td class="py-3 px-4 flex items-center justify-end space-x-2">
                   <button class="p-1 hover:bg-gray-200 rounded-full edit-btn" data-id="${doc['id']}" title="Sửa"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button>
                   <button class="p-1 hover:bg-gray-200 rounded-full delete-btn" data-id="${doc['id']}" title="Xóa"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button>
                 </td></tr>`;
    });
    html += '</tbody></table></div>';
    return html;
}

function createFormFields(doc, headers) {
    let html = '';
    headers.forEach(key => {
        if (key === 'id') return;
        html += `
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="form-${key}">${key}</label>
                <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                       id="form-${key}" type="text" name="${key}" value="${doc[key] || ''}">
            </div>`;
    });
    return html;
}

function openModal(mode, docId = null) {
    const modal = document.getElementById('form-modal');
    const form = document.getElementById('item-form');
    form.reset();
    isEditMode = mode === 'edit';
    currentDocId = docId;
    const doc = isEditMode ? currentDocuments.find(d => d['id'] == docId) : {};
    document.getElementById('form-title').textContent = isEditMode ? 'Chỉnh sửa Mục' : 'Thêm Mục Mới';
    document.getElementById('form-fields').innerHTML = createFormFields(doc, currentHeaders);
    modal.classList.remove('hidden');
}

function closeModal() { document.getElementById('form-modal').classList.add('hidden'); }

async function loadDocuments(collectionName) {
    currentCollection = collectionName;
    const contentDiv = document.getElementById('collections-content');
    contentDiv.innerHTML = '<p>Đang tải ...</p>';
    try {
        const response = await fetch(`/api/collections/${collectionName}/documents`);
        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        currentDocuments = await response.json();
        currentHeaders = currentDocuments.length > 0 ? Object.keys(currentDocuments[0]) : ['Danh mục thu chi', 'Tên', 'Mô tả'];
        contentDiv.innerHTML = createTable(currentDocuments, currentHeaders);
    } catch (error) {
        console.error('Error loading documents:', error);
        contentDiv.innerHTML = `<p class="text-red-500">Lỗi tải dữ liệu: ${error.message}</p>`;
    }
}

async function loadCollectionData() {
    try { await loadDocuments("items"); } catch (error) {
        console.error("Error loading collection data:", error);
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const url = isEditMode ? `/api/collections/${currentCollection}/${currentDocId}` : `/api/collections/${currentCollection}/documents`;
    const method = isEditMode ? 'PUT' : 'POST';
    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!response.ok) throw new Error((await response.json()).error || 'Thao tác thất bại');
        closeModal();
        await loadDocuments(currentCollection);
        alert('Thao tác thành công!');
    } catch (error) {
        console.error('Form submission error:', error);
        alert(`Lỗi: ${error.message}`);
    }
}

async function handleDelete(docId) {
    if (!confirm(`Bạn có chắc muốn xóa mục: ${docId}?`)) return;
    try {
        const response = await fetch(`/api/collections/${currentCollection}/${docId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error((await response.json()).error || 'Xóa thất bại.');
        await loadDocuments(currentCollection);
        alert('Xóa thành công!');
    } catch (error) {
        console.error('Delete error:', error);
        alert(`Lỗi: ${error.message}`);
    }
}

// ==================================================
//  LOGIC FOR "MANAGEMENT" PAGE (REWRITTEN & FIXED)
// ==================================================

function renderNewItemForm(tabId) {
    const today = new Date().toISOString().split('T')[0];
    const itemsHtml = mgmtState.expenseItems.map(item => `<option value="${item['id']}">${item['id']}</option>`).join('');
    const typesHtml = mgmtState.typeItems.map(item => `<option value="${item['id']}">${item['id']}</option>`).join('');
    return `
        <form class="item-form p-4 bg-gray-50 rounded" data-tab-id="${tabId}" onsubmit="handleMgmtFormSubmit(event)">
            <h3 class="text-lg font-bold mb-4">Tạo khoản thu/chi mới</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Loại (Thu/Chi)</label>
                    <select name="Loại" required class="input-field">${typesHtml}</select>
                </div>
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Tên khoản</label>
                    <select name="Tên" required class="input-field"><option value="" disabled selected>Chọn mục</option>${itemsHtml}</select>
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
            <div class="form-actions mt-6 text-right">
                <button type="submit" class="btn-save-item">Lưu mới</button>
            </div>
        </form>`;
}

function renderRecordsTable(item) {
    if (!item || !item.records || item.records.length === 0) return '<p class="text-center text-gray-500 p-4">Không có dữ liệu cho mục này.</p>';
    let tableHtml = '<div class="overflow-x-auto shadow-lg rounded-lg"><table class="min-w-full bg-white">';
    tableHtml += '<thead class="bg-green-600 text-white"><tr>';
    // FIXED: Corrected headers
    tableHtml += '<th class="py-3 px-4 text-center uppercase font-semibold text-sm">STT</th>';
    tableHtml += '<th class="py-3 px-4 text-left uppercase font-semibold text-sm">Tên</th>';
    tableHtml += '<th class="py-3 px-4 text-left uppercase font-semibold text-sm">Số tiền</th>';
    tableHtml += '<th class="py-2 px-4 text-center uppercase font-semibold text-sm">Ngày</th>';
    tableHtml += '</tr></thead><tbody class="text-gray-700">';
    item.records.forEach((record, i) => {
        const rowClass = i % 2 === 0 ? 'bg-white' : 'bg-green-50';
        const amount = typeof record['amount'] === 'number' ? record['amount'].toLocaleString('vi-VN') + ' VND' : record['amount'];
        // FIXED: Corrected data fields
        tableHtml += `<tr class="${rowClass}">
            <td class="py-2 px-4 text-center">${i + 1}</td>
            <td class="py-2 px-4">${record['name'] || 'N/A'}</td>
            <td class="py-2 px-4">${amount || 'N/A'}</td>
            <td class="py-2 px-4 text-center">${record['date'] || 'N/A'}</td>
        </tr>`;
    });
    tableHtml += '</tbody></table></div>';
    return tableHtml;
}

function switchTab(tabId) {
    document.querySelectorAll('[data-tab-id]').forEach(tab => tab.classList.remove('active-tab'));
    document.querySelectorAll('.item-tab-content').forEach(content => content.style.display = 'none');
    const selectedTab = document.querySelector(`[data-tab-id='${tabId}']`);
    const selectedContent = document.getElementById(tabId);
    if (selectedTab) selectedTab.classList.add('active-tab');
    if (selectedContent) selectedContent.style.display = 'block';
}

async function loadExpenseItems() {
    if (mgmtState.expenseItems.length > 0) return; // Load only once
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

async function loadManagementPage() {
    const treeContainer = document.getElementById('management-tree');
    if (!treeContainer) return;
    try {
        await loadExpenseItems();
        const response = await fetch('/api/management/tree');
        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        const structure = await response.json();
        treeContainer.innerHTML = `<ul>${Object.keys(structure).sort((a,b) => b-a).map(year => `
            <li><span class="toggle">${year}</span><ul class="nested">${structure[year].map(month => `
                <li><span class="month-link" data-year="${year}" data-month="${month}">Tháng ${month}</span></li>`).join('')}</ul></li>`).join('')}</ul>`;
    } catch (e) {
        treeContainer.innerHTML = `<p class="text-red-500">Lỗi khi tải cây quản lý: ${e.message}</p>`;
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

        document.getElementById('viewer-placeholder').style.display = 'none';

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

        if (items && items.length > 0) {
            switchTab(`tab-${items[0].id}`);
        } else {
            document.getElementById('viewer-placeholder').textContent = "Không có khoản chi nào trong tháng này.";
            document.getElementById('viewer-placeholder').style.display = 'block';
            switchTab(newTabId);
        }
    } catch (e) {
        document.getElementById('viewer-placeholder').textContent = `Lỗi khi tải dữ liệu: ${e.message}`;
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

// ==================================================
//  EVENT LISTENERS & ROUTING
// ==================================================

function attachGlobalEventListeners() {
    menuContainer.addEventListener('click', e => {
        const link = e.target.closest('a.nav-link');
        if (link) {
            e.preventDefault();
            history.pushState({ path: link.getAttribute('href') }, '', link.getAttribute('href'));
            handleNav(link.getAttribute('href'));
        }
    });
}

function attachPageEventListeners(pagePath) {
    const pageContent = document.getElementById('content');
    if (!pageContent) return;

    if (pagePath === '/collections') {
        pageContent.addEventListener('click', e => {
            if (e.target.closest('.edit-btn')) openModal('edit', e.target.closest('.edit-btn').dataset.id);
            if (e.target.closest('.delete-btn')) handleDelete(e.target.closest('.delete-btn').dataset.id);
            if (e.target.closest('#add-new-btn')) openModal('add');
        });
        document.getElementById('item-form')?.addEventListener('submit', handleFormSubmit);
        document.getElementById('cancel-btn')?.addEventListener('click', closeModal);
    } else if (pagePath === '/management') {
        mgmtState = { ...mgmtState, activeMonthLink: null, activeYear: null, activeMonth: null, typeItems: [] };
        pageContent.addEventListener('click', e => {
            const monthLink = e.target.closest('.month-link');
            const tab = e.target.closest('[data-tab-id]');
            const toggle = e.target.closest('.toggle');

            if (toggle) {
                toggle.classList.toggle('expanded');
                toggle.nextElementSibling?.classList.toggle('active');
            } else if (monthLink) {
                loadMonthData(monthLink.dataset.year, monthLink.dataset.month, monthLink);
            } else if (tab) {
                switchTab(tab.dataset.tabId);
            }
        });
    }
}

const routes = {
    '/': '/pages/home',
    '/collections': '/pages/collections',
    '/management': '/pages/management'
};

async function handleNav(path) {
    const routePath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
    const pageFile = routes[routePath] || routes['/'];

    try {
        const response = await fetch(pageFile);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        content.innerHTML = await response.text();
        
        attachPageEventListeners(routePath);

        if (routePath === '/') await loadHomePage();
        else if (routePath === '/collections') await loadCollectionData();
        else if (routePath === '/management') await loadManagementPage();

    } catch (e) {
        console.error("Error handling navigation:", e);
        content.innerHTML = `<div class="text-center p-8"><h1 class="text-2xl font-bold text-red-600">Page Not Found</h1><p class="text-gray-500">Could not load content for ${path}.</p></div>`;
    }
}

async function initialLoad() {
    try {
        const menuResponse = await fetch('/components/menu');
        menuContainer.innerHTML = await menuResponse.text();
        attachGlobalEventListeners();
        window.onpopstate = e => { handleNav(e.state?.path || '/'); };
        await handleNav(window.location.pathname);
    } catch(e) {
        console.error("Initial load failed:", e);
        document.body.innerHTML = "<h1>Lỗi nghiêm trọng khi tải ứng dụng.</h1>";
    }
}

// Start the application
initialLoad();
