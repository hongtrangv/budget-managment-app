const content = document.getElementById('content');
const menuContainer = document.getElementById('menu-container');
let currentCollection = 'items';
let currentDocuments = [];
let currentHeaders = [];

// --- State variables for different pages ---
let isEditMode = false;
let currentDocId = null;
let currentActiveMonthLink = null; // For management page

// ==================================================
//  LOGIC FOR THE "COLLECTIONS" PAGE
// ==================================================

function createTable(documents, headers) {
    if (!documents || documents.length === 0) {
        return '<p class="text-center text-gray-500">Không tìm thấy mục nào.</p>';
    }

    let html = '<div class="shadow-lg rounded-lg">';
    html += '<table class="min-w-full bg-white">';
    html += '<thead class="bg-green-600 text-white"><tr>';

    headers.forEach(key => {
        html += `<th class="py-3 px-4 text-left uppercase font-semibold text-sm">${key}</th>`;
    });
    html += '<th class="py-3 px-4 text-right uppercase font-semibold text-sm">Hành động</th>';

    html += '</tr></thead><tbody class="text-gray-700">';

    documents.forEach((doc, index) => {
        const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-green-50';
        const docId = doc['Danh mục thu chi'];
        html += `<tr class="${rowClass}" data-id="${docId}">`;

        headers.forEach(header => {
            const value = doc[header] || '';
            html += `<td class="py-3 px-4">${value}</td>`;
        });

        html += `<td class="py-3 px-4 flex items-center justify-end space-x-2">`;
        html += `<button class="p-1 hover:bg-gray-200 rounded-full edit-btn" data-id="${docId}" title="Sửa">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                 </button>`;
        html += `<button class="p-1 hover:bg-gray-200 rounded-full delete-btn" data-id="${docId}" title="Xóa">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                 </button>`;
        html += `</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
}

function openModal(mode, docId = null) {
    const modal = document.getElementById('form-modal');
    const form = document.getElementById('item-form');
    const formTitle = document.getElementById('form-title');
    const formFields = document.getElementById('form-fields');

    form.reset();
    isEditMode = mode === 'edit';
    currentDocId = docId;
    const headersFromDOM = document.getElementById('collections-content').dataset.headers.split(',');

    if (isEditMode) {
        formTitle.textContent = 'Chỉnh sửa Mục';
        const doc = currentDocuments.find(d => d['Danh mục thu chi'] == docId);
        formFields.innerHTML = doc ? createFormFields(doc, headersFromDOM) : '<p>Lỗi: Không tìm thấy mục.</p>';
    } else {
        formTitle.textContent = 'Thêm Mục Mới';
        formFields.innerHTML = createFormFields({}, headersFromDOM);
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    document.getElementById('form-modal').classList.add('hidden');
}

function createFormFields(doc, headers) {
    return headers.map(key => `
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2 text-left">${key}</label>
            <input type="text" name="${key}" value="${doc[key] || ''}" 
                   class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
        </div>`
    ).join('');
}

async function loadCollectionData() {
    const collectionContent = document.getElementById('collections-content');
    if (!collectionContent) return;
    collectionContent.innerHTML = '<p class="text-center">Đang tải...</p>';
    const predefinedHeaders = collectionContent.dataset.headers.split(',');

    try {
        const response = await fetch(`/api/collections/${currentCollection}/documents`);
        if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
        currentDocuments = await response.json();
        currentHeaders = predefinedHeaders;
        collectionContent.innerHTML = currentDocuments.length > 0 
            ? createTable(currentDocuments, currentHeaders)
            : "<p class='text-center text-gray-500'>Không có dữ liệu. Vui lòng nhấn nút '+' để thêm mới.</p>";
        attachTableEventListeners();
    } catch (error) {
        collectionContent.innerHTML = `<p class="text-center text-red-500">Error: ${error.message}</p>`;
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());

    if (!data['Danh mục thu chi'] || data['Danh mục thu chi'].trim() === '') {
        alert('Trường "Danh mục thu chi" (ID) là bắt buộc.');
        return;
    }

    const url = isEditMode ? `/api/collections/${currentCollection}/documents/${currentDocId}` : `/api/collections/${currentCollection}/documents`;
    const method = isEditMode ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!response.ok) throw new Error(await response.text());
        closeModal();
        await loadCollectionData();
    } catch (error) {
        alert(`Operation failed: ${error.message}`);
    }
}

async function handleDelete(docId) {
    if (!confirm('Bạn có chắc muốn xóa mục này không?')) return;
    try {
        const response = await fetch(`/api/collections/${currentCollection}/documents/${docId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(await response.text());
        await loadCollectionData();
    } catch (error) {
        alert(`Delete failed: ${error.message}`);
    }
}

// ==================================================
//  LOGIC FOR THE "MANAGEMENT" PAGE
// ==================================================

async function loadManagementPage() {
    const treeContainer = document.getElementById('management-tree');
    if (!treeContainer) return;
    try {
        const response = await fetch('/api/management/tree/structure');
        if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
        const structure = await response.json();

        if (Object.keys(structure).length === 0) {
            treeContainer.innerHTML = '<p>Không có dữ liệu để hiển thị.</p>';
            return;
        }
        treeContainer.innerHTML = buildTreeMenuHtml(structure);
        attachManagementEventListeners();
    } catch (error) {
        treeContainer.innerHTML = `<p class="text-red-500">Lỗi khi tải menu: ${error.message}</p>`;
    }
}

function buildTreeMenuHtml(structure) {
    const sortedYears = Object.keys(structure).sort((a, b) => a - b);
    return `<ul>${sortedYears.map(year => `
        <li>
            <span class="toggle">${year}</span>
            <ul class="nested">${structure[year].sort((a, b) => b - a).map(month => `
                <li><span class="month-link" data-year="${year}" data-month="${month}">Tháng ${month}</span></li>`
            ).join('')}</ul>
        </li>`
    ).join('')}</ul>`;
}

async function loadItemsForMonth(year, month, monthElement) {
    const itemsContainer = document.getElementById('items-container');
    if (!itemsContainer) return;
    itemsContainer.innerHTML = '<p>Đang tải chi tiết...</p>';
    try {
        const response = await fetch(`/api/management/items/${year}/${month}`);
        if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
        const items = await response.json();

        if (currentActiveMonthLink) currentActiveMonthLink.classList.remove('active');
        monthElement.classList.add('active');
        currentActiveMonthLink = monthElement;

        itemsContainer.innerHTML = buildItemsTableHtml(items, year, month);
    } catch (error) {
        itemsContainer.innerHTML = `<p class="text-red-500">Lỗi khi tải chi tiết: ${error.message}</p>`;
    }
}

function buildItemsTableHtml(items, year, month) {
    const header = `<h2 class="text-xl font-semibold mb-3">Chi tiết cho Tháng ${month}/${year}</h2>`;
    if (!items || items.length === 0) {
        return `${header}<p>Không có chi tiêu trong tháng này.</p>`;
    }
    const tableRows = items.map(item => {
        const amount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item['Số tiền'] || 0);
        const date = new Date(item.date).toLocaleDateString('vi-VN');
        return `<tr class="hover:bg-gray-50">
                    <td class="py-2 px-4 border-b">${item['Tên']}</td>
                    <td class="py-2 px-4 border-b text-right">${amount}</td>
                    <td class="py-2 px-4 border-b text-center">${date}</td>
                </tr>`;
    }).join('');
    return `${header}<div class="overflow-x-auto"><table class="min-w-full bg-white border">
                <thead><tr class="bg-gray-200">
                   <th class="py-2 px-4 border-b text-left">Tên</th>
                   <th class="py-2 px-4 border-b text-right">Số tiền</th>
                   <th class="py-2 px-4 border-b text-center">Ngày</th>
                </tr></thead>
                <tbody>${tableRows}</tbody>
            </table></div>`;
}

// ==================================================
//  EVENT LISTENERS & ROUTING
// ==================================================

function attachGlobalEventListeners() {
    menuContainer.addEventListener('click', e => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const path = new URL(e.target.href).pathname;
            history.pushState({ path }, '', path);
            handleNav(path);
        }
    });
}

function attachPageEventListeners() {
    const addNewBtn = document.getElementById('add-new-btn');
    if (addNewBtn) addNewBtn.addEventListener('click', () => openModal('add'));

    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    const itemForm = document.getElementById('item-form');
    if (itemForm) itemForm.addEventListener('submit', handleFormSubmit);
}

function attachTableEventListeners() {
    content.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', e => handleDelete(e.currentTarget.dataset.id)));
    content.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', e => openModal('edit', e.currentTarget.dataset.id)));
}

function attachManagementEventListeners() {
    const container = document.getElementById('management-container');
    if (!container) return;
    container.addEventListener('click', function (event) {
        const target = event.target;
        if (target.classList.contains('toggle')) {
            target.classList.toggle('expanded');
            target.nextElementSibling?.classList.toggle('active');
        }
        if (target.classList.contains('month-link')) {
            loadItemsForMonth(target.dataset.year, target.dataset.month, target);
        }
    });
}

const routes = {
    '/': '/pages/home',
    '/collections': '/pages/collections',
    '/management': '/pages/management'
};

async function handleNav(path) {
    const pagePath = routes[path] || '/pages/home';
    try {
        const response = await fetch(pagePath);
        content.innerHTML = await response.text();
        
        if (path === '/collections') {
            await loadCollectionData();
            attachPageEventListeners();
        } else if (path === '/management') {
            await loadManagementPage();
        }
    } catch (error) {
        content.innerHTML = '<h1>Page Not Found</h1>';
    }
}

async function initialLoad() {
    const menuResponse = await fetch('/components/menu');
    menuContainer.innerHTML = await menuResponse.text();
    attachGlobalEventListeners();
    window.onpopstate = e => handleNav(e.state?.path || '/');
    await handleNav(window.location.pathname);
}

initialLoad(); // Start the application
