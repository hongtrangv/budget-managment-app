const content = document.getElementById('content');
const menuContainer = document.getElementById('menu-container');

// --- State variables for different pages ---
let currentCollection = 'items'; // Default collection for the 'collections' page
let currentDocuments = [];
let currentHeaders = [];
let isEditMode = false;
let currentDocId = null;

// --- State for Management Page --- 
let currentActiveMonthLink = null; // To track the active month in the tree
let openTabs = {}; // To track open tabs: { tabId: true }


// ==================================================
//  LOGIC FOR THE "COLLECTIONS" PAGE
//  (This logic remains unchanged)
// ==================================================

function createTable(documents, headers) {
    if (!documents || documents.length === 0) {
        return '<p class="text-center text-gray-500">Không tìm thấy mục nào.</p>';
    }
    let html = '<div class="overflow-x-auto shadow-lg rounded-lg"><table class="min-w-full bg-white">';
    html += '<thead class="bg-green-600 text-white"><tr>';
    headers.forEach(key => {
        html += `<th class="py-3 px-4 text-left uppercase font-semibold text-sm">${key}</th>`;
    });
    html += '<th class="py-3 px-4 text-right uppercase font-semibold text-sm">Hành động</th></tr></thead><tbody class="text-gray-700">';
    documents.forEach((doc, index) => {
        const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-green-50';
        const docId = doc['Danh mục thu chi'];
        html += `<tr class="${rowClass}" data-id="${docId}">`;
        headers.forEach(header => {
            const value = doc[header] || '';
            html += `<td class="py-3 px-4">${value}</td>`;
        });
        html += `<td class="py-3 px-4 flex items-center justify-end space-x-2">
                   <button class="p-1 hover:bg-gray-200 rounded-full edit-btn" data-id="${docId}" title="Sửa"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button>
                   <button class="p-1 hover:bg-gray-200 rounded-full delete-btn" data-id="${docId}" title="Xóa"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button>
                 </td></tr>`;
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

function closeModal() { document.getElementById('form-modal').classList.add('hidden'); }

function createFormFields(doc, headers) {
    return headers.map(key => `
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2 text-left">${key}</label>
            <input type="text" name="${key}" value="${doc[key] || ''}" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
        </div>`).join('');
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
        collectionContent.innerHTML = currentDocuments.length > 0 ? createTable(currentDocuments, currentHeaders) : "<p class='text-center text-gray-500'>Không có dữ liệu.</p>";
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
//  REVISED LOGIC FOR THE "MANAGEMENT" PAGE
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
        const sortedYears = Object.keys(structure).sort((a, b) => b - a);
        const treeHtml = sortedYears.map(year => `
            <li>
                <span class="toggle">${year}</span>
                <ul class="nested">
                    ${structure[year].sort((a, b) => b - a).map(month => `
                        <li><span class="month-link" data-year="${year}" data-month="${month}">Tháng ${month}</span></li>
                    `).join('')}
                </ul>
            </li>`).join('');
        treeContainer.innerHTML = `<ul>${treeHtml}</ul>`;
    } catch (error) {
        treeContainer.innerHTML = `<p class="text-red-500">Lỗi khi tải menu: ${error.message}</p>`;
    }
}

async function loadItemsAndCreateTabs(year, month, monthElement) {
    // --- FIX: Clear previous state before loading new items ---
    const tabBar = document.getElementById('item-tab-bar');
    const contentContainer = document.getElementById('item-tab-content-container');
    tabBar.innerHTML = ''; // Clear tab buttons
    contentContainer.innerHTML = '<p id="viewer-placeholder" class="text-gray-500">Đang tải...</p>'; // Clear content and show loading message
    openTabs = {}; // Reset the state of open tabs
    // --- End of fix ---

    if (currentActiveMonthLink) {
        currentActiveMonthLink.classList.remove('active-month');
    }
    monthElement.classList.add('active-month');
    currentActiveMonthLink = monthElement;

    const placeholder = document.getElementById('viewer-placeholder');

    try {
        const response = await fetch(`/api/management/items/${year}/${month}`);
        if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
        const items = await response.json();

        if (items.length === 0) {
            if (placeholder) placeholder.textContent = `Không có khoản chi nào trong Tháng ${month}/${year}.`;
            return;
        }

        if (placeholder) placeholder.style.display = 'none';

        items.forEach(item => {
            const tabId = `tab-${year}-${month}-${item.id}`;
            createItemTab(item, tabId);
        });

        // --- FIX: Activate the first tab after all are created ---
        if (items.length > 0) {
            const firstTabId = `tab-${year}-${month}-${items[0].id}`;
            switchTab(firstTabId);
        }
        // --- End of fix ---

    } catch (error) {
        if (placeholder) {
            placeholder.textContent = `Lỗi khi tải khoản chi: ${error.message}`;
            placeholder.style.display = 'block';
        }
    }
}

function createItemTab(item, tabId) {
    if (openTabs[tabId]) return; // Don't create if already exists

    const tabBar = document.getElementById('item-tab-bar');
    const contentContainer = document.getElementById('item-tab-content-container');

    const tabButton = document.createElement('div');
    tabButton.className = 'item-tab';
    tabButton.dataset.tabId = tabId;
    tabButton.innerHTML = `<span>${item['id'] || 'No ID'}</span><button class="tab-close-btn" data-tab-id="${tabId}">&times;</button>`;
    tabBar.appendChild(tabButton);

    const contentPane = document.createElement('div');
    contentPane.className = 'item-tab-content';
    contentPane.id = tabId;
    const amount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item['Số tiền'] || 0);
    const date = new Date(item.date).toLocaleDateString('vi-VN');
    contentPane.innerHTML = `<h3 class="text-lg font-bold mb-2">Chi tiết: ${item['Tên']}</h3><p><strong>Số tiền:</strong> ${amount}</p><p><strong>Ngày:</strong> ${date}</p>`;
    contentContainer.appendChild(contentPane);

    openTabs[tabId] = true;
    // --- FIX: Do not auto-switch here. Let the caller decide when to switch. ---
}

function switchTab(tabId) {
    document.querySelectorAll('.item-tab').forEach(t => t.classList.remove('active-tab'));
    document.querySelectorAll('.item-tab-content').forEach(c => c.classList.remove('active-content'));

    const tabButton = document.querySelector(`.item-tab[data-tab-id='${tabId}']`);
    const contentPane = document.getElementById(tabId);
    if (tabButton) tabButton.classList.add('active-tab');
    if (contentPane) contentPane.classList.add('active-content');
}

function closeTab(tabId) {
    const tabButton = document.querySelector(`.item-tab[data-tab-id='${tabId}']`);
    const contentPane = document.getElementById(tabId);
    const wasActive = tabButton && tabButton.classList.contains('active-tab');

    if (tabButton) tabButton.remove();
    if (contentPane) contentPane.remove();
    delete openTabs[tabId];

    if (wasActive && Object.keys(openTabs).length > 0) {
        const lastTabId = Object.keys(openTabs)[Object.keys(openTabs).length - 1];
        switchTab(lastTabId);
    }

    if (Object.keys(openTabs).length === 0) {
        const placeholder = document.getElementById('viewer-placeholder');
        if (!placeholder) { // If placeholder doesn't exist, create it
             const contentContainer = document.getElementById('item-tab-content-container');
             contentContainer.innerHTML = '<p id="viewer-placeholder" class="text-gray-500">Vui lòng chọn một tháng từ menu để hiển thị các khoản chi.</p>';
        } else {
             placeholder.style.display = 'block';
             placeholder.textContent = 'Vui lòng chọn một tháng từ menu để hiển thị các khoản chi.';
        }
    }
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

function attachPageEventListeners(pagePath) {
    if (pagePath === '/collections') {
        const addNewBtn = document.getElementById('add-new-btn');
        if (addNewBtn) addNewBtn.addEventListener('click', () => openModal('add'));
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        const itemForm = document.getElementById('item-form');
        if (itemForm) itemForm.addEventListener('submit', handleFormSubmit);
    } else if (pagePath === '/management') {
        openTabs = {};
        currentActiveMonthLink = null;
        const managementPageContainer = document.getElementById('content');
        managementPageContainer.addEventListener('click', function(event) {
            const target = event.target;
            if (target.classList.contains('toggle')) {
                target.classList.toggle('expanded');
                target.nextElementSibling?.classList.toggle('active');
            } else if (target.classList.contains('month-link')) {
                loadItemsAndCreateTabs(target.dataset.year, target.dataset.month, target);
            } else if (target.closest('.item-tab') && !target.classList.contains('tab-close-btn')) {
                switchTab(target.closest('.item-tab').dataset.tabId);
            } else if (target.classList.contains('tab-close-btn')) {
                closeTab(target.dataset.tabId);
            }
        });
    }
}

function attachTableEventListeners() {
    content.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', e => handleDelete(e.currentTarget.dataset.id));
    });
    content.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', e => openModal('edit', e.currentTarget.dataset.id));
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
        } else if (path === '/management') {
            await loadManagementPage();
        }
        attachPageEventListeners(path);
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

initialLoad();
