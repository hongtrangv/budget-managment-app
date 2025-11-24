const content = document.getElementById('content');
const menuContainer = document.getElementById('menu-container');

// --- State variables for different pages ---
let currentCollection = 'items'; // Default collection
let currentDocuments = [];
let currentHeaders = [];
let isEditMode = false;
let currentDocId = null;

// --- State for Management Page ---
let mgmtState = {
    activeMonthLink: null,
    activeYear: null,
    activeMonth: null,
    openTabs: {},
};

// ==================================================
//  LOGIC FOR THE "COLLECTIONS" PAGE
// ==================================================

// --- UI Generation ---
function createTable(documents, headers) {
    if (!documents || documents.length === 0) {
        return '<p class="text-center text-gray-500">Không tìm thấy mục nào trong danh mục này.</p>';
    }
    let html = '<div class="overflow-x-auto shadow-lg rounded-lg"><table class="min-w-full bg-white">';
    html += '<thead class="bg-green-600 text-white"><tr>';
    headers.forEach(key => {
        html += `<th class="py-3 px-4 text-left uppercase font-semibold text-sm">${key}</th>`;
    });
    html += '<th class="py-3 px-4 text-right uppercase font-semibold text-sm">Hành động</th></tr></thead><tbody class="text-gray-700">';
    documents.forEach((doc, index) => {
        const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-green-50';
        const docId = doc['Danh mục thu chi']; // The unique ID field
        html += `<tr class="${rowClass}" data-id="${docId}">`;
        headers.forEach(header => {
            html += `<td class="py-3 px-4">${doc[header] || ''}</td>`;
        });
        html += `<td class="py-3 px-4 flex items-center justify-end space-x-2">
                   <button class="p-1 hover:bg-gray-200 rounded-full edit-btn" data-id="${docId}" title="Sửa"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button>
                   <button class="p-1 hover:bg-gray-200 rounded-full delete-btn" data-id="${docId}" title="Xóa"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button>
                 </td></tr>`;
    });
    html += '</tbody></table></div>';
    return html;
}

function createFormFields(doc, headers) {
    // Ensure the ID field 'Danh mục thu chi' is always first and handled separately.
    let idFieldHtml = '';
    let otherFieldsHtml = '';
    const idKey = 'Danh mục thu chi';

    headers.forEach(key => {
        const value = doc[key] || '';
        const fieldHtml = `
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="form-${key}">${key}</label>
                <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                       id="form-${key}" type="text" name="${key}" value="${value}" ${key === idKey && isEditMode ? 'readonly' : ''}>
            </div>`;
        if (key === idKey) {
            idFieldHtml = fieldHtml;
        } else {
            otherFieldsHtml += fieldHtml;
        }
    });
    return idFieldHtml + otherFieldsHtml; // ID field will be at the top.
}

// --- Modal Handling ---
function openModal(mode, docId = null) {
    const modal = document.getElementById('form-modal');
    const form = document.getElementById('item-form');
    form.reset();
    isEditMode = mode === 'edit';
    currentDocId = docId;
    const doc = isEditMode ? currentDocuments.find(d => d['Danh mục thu chi'] == docId) : {};
    document.getElementById('form-title').textContent = isEditMode ? 'Chỉnh sửa Mục' : 'Thêm Mục Mới';
    document.getElementById('form-fields').innerHTML = createFormFields(doc, currentHeaders);
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('form-modal').classList.add('hidden');
}

// --- Data Fetching and Rendering ---
async function loadDocuments(collectionName) {
    currentCollection = collectionName;
    const contentDiv = document.getElementById('collections-content');
    contentDiv.innerHTML = '<p>Đang tải dữ liệu...</p>';
    try {
        const response = await fetch(`/api/collections/${collectionName}/documents`);
        if (!response.ok) throw new Error(`API call failed with status ${response.status}`);
        currentDocuments = await response.json();

        if (currentDocuments.length > 0) {
            currentHeaders = Object.keys(currentDocuments[0]);
        } else {
            // If there are no documents, we might need to define default headers or get them differently.
            // For now, we'll leave headers empty, but this could be improved.
            currentHeaders = ['Danh mục thu chi', 'Tên', 'Mô tả']; // Example default
        }
        contentDiv.dataset.headers = currentHeaders.join(',');
        contentDiv.innerHTML = createTable(currentDocuments, currentHeaders);
    } catch (error) {
        console.error('Error loading documents:', error);
        contentDiv.innerHTML = `<p class="text-red-500">Lỗi tải dữ liệu: ${error.message}</p>`;
    }
}

async function loadCollectionData() {
    const selector = document.getElementById('collection-selector');
    if (!selector) return;
    try {
        const response = await fetch('/api/collections');
        if (!response.ok) throw new Error('Could not fetch collection list');
        const collections = await response.json();
        selector.innerHTML = collections.map(c => `<option value="${c}">${c}</option>`).join('');
        
        // Load documents for the first collection in the list by default
        if (collections.length > 0) {
            await loadDocuments(collections[0]);
        }
    } catch (error) {
        console.error("Error loading collections:", error);
        selector.innerHTML = '<option>Lỗi tải danh mục</option>';
    }
}

// --- CRUD Operations ---
async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form));
    const url = isEditMode
        ? `/api/collections/${currentCollection}/documents/${currentDocId}`
        : `/api/collections/${currentCollection}/documents`;
    const method = isEditMode ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || `Failed to ${isEditMode ? 'update' : 'create'} document.`);
        }
        closeModal();
        await loadDocuments(currentCollection); // Refresh the table
        alert('Thao tác thành công!');
    } catch (error) {
        console.error('Form submission error:', error);
        alert(`Lỗi: ${error.message}`);
    }
}

async function handleDelete(docId) {
    if (!confirm(`Bạn có chắc muốn xóa mục: ${docId}?`)) return;
    try {
        const response = await fetch(`/api/collections/${currentCollection}/documents/${docId}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete document.');
        }
        await loadDocuments(currentCollection); // Refresh the table
        alert('Xóa thành công!');
    } catch (error) {
        console.error('Delete error:', error);
        alert(`Lỗi: ${error.message}`);
    }
}


// ==================================================
//  LOGIC FOR "MANAGEMENT" PAGE
// ==================================================

// Functions like renderItemForm, createTab, loadManagementPage, etc. are unchanged.
// ... (previous management page functions are kept here) ...
function renderItemForm(item = {}, tabId, isNew = false) {
    const today = new Date().toISOString().split('T')[0];
    const date = item.date || today;
    const title = isNew ? 'Tạo khoản chi mới' : `Chi tiết: ${item['Tên'] || ''}`;
    const buttonText = isNew ? 'Tạo mới' : 'Lưu thay đổi';

    return `
        <form class="item-form p-4 bg-gray-50 rounded" data-tab-id="${tabId}" data-item-id="${item.id || ''}" data-is-new="${isNew}">
            <h3 class="text-lg font-bold mb-4">${title}</h3>
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Tên khoản chi</label>
                <input type="text" name="Tên" value="${item['Tên'] || ''}" required class="input-field" ${isNew ? '' : 'disabled'}>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Số tiền (VND)</label>
                <input type="number" name="Số tiền" value="${item['Số tiền'] || ''}" required class="input-field" ${isNew ? '' : 'disabled'}>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Ngày</label>
                <input type="date" name="date" value="${date}" required class="input-field" ${isNew ? '' : 'disabled'}>
            </div>
            <div class="form-actions mt-4 space-x-2">
                ${!isNew ? `<button type="button" class="btn-edit-item">Sửa</button>` : ''}
                <button type="submit" class="btn-save-item" ${isNew ? '' : 'style="display:none;"'}>${buttonText}</button>
                ${!isNew ? `<button type="button" class="btn-delete-item btn-danger">Xóa</button>` : ''}
            </div>
        </form>
    `;
}

function createTab(title, tabId, options = {}) {
    const { isSpecial = false } = options;
    const tabBar = document.getElementById('item-tab-bar');
    const tabButton = document.createElement('div');
    tabButton.className = isSpecial ? 'special-tab' : 'item-tab';
    tabButton.dataset.tabId = tabId;
    tabButton.innerHTML = `<span>${title}</span>` + (isSpecial ? '' : `<button class="tab-close-btn" data-tab-id="${tabId}">&times;</button>`);
    tabBar.appendChild(tabButton);
}

function createTabContent(item, tabId, isNew = false) {
    const contentContainer = document.getElementById('item-tab-content-container');
    const contentPane = document.createElement('div');
    contentPane.className = 'item-tab-content';
    contentPane.id = tabId;
    contentPane.innerHTML = renderItemForm(item, tabId, isNew);
    contentContainer.appendChild(contentPane);
}

async function loadManagementPage() {
    const treeContainer = document.getElementById('management-tree');
    if (!treeContainer) return;
    try {
        const structure = await (await fetch('/api/management/tree/structure')).json();
        treeContainer.innerHTML = `<ul>${Object.keys(structure).sort((a,b) => b-a).map(year => `
            <li><span class="toggle">${year}</span><ul class="nested">${structure[year].map(month => `
                <li><span class="month-link" data-year="${year}" data-month="${month}">Tháng ${month}</span></li>`).join('')}</ul></li>`).join('')}</ul>`;
    } catch (e) { treeContainer.innerHTML = `<p>Lỗi: ${e.message}</p>`; }
}

async function loadMonthData(year, month, monthElement) {
    if (mgmtState.activeMonthLink) mgmtState.activeMonthLink.classList.remove('active-month');
    monthElement.classList.add('active-month');
    mgmtState = { activeMonthLink: monthElement, activeYear: year, activeMonth: month, openTabs: {} };

    const tabBar = document.getElementById('item-tab-bar');
    const contentContainer = document.getElementById('item-tab-content-container');
    tabBar.innerHTML = '';
    contentContainer.innerHTML = '<p id="viewer-placeholder">Đang tải...</p>';

    try {
        const items = await (await fetch(`/api/management/items/${year}/${month}`)).json();
        document.getElementById('viewer-placeholder').style.display = 'none';

        createTab('+', 'new-item-tab', { isSpecial: true });
        createTabContent({}, 'new-item-tab', true);
        mgmtState.openTabs['new-item-tab'] = true;

        items.forEach(item => {
            const tabId = `tab-${item.id}`;
            createTab(item.id, tabId);
            createTabContent(item, tabId);
            mgmtState.openTabs[tabId] = true;
        });

        if (items.length > 0) switchTab(`tab-${items[0].id}`);
        else switchTab('new-item-tab');

    } catch (e) { document.getElementById('viewer-placeholder').textContent = `Lỗi: ${e.message}`; }
}

function switchTab(tabId) {
    document.querySelectorAll('.item-tab, .special-tab').forEach(t => t.classList.remove('active-tab'));
    document.querySelectorAll('.item-tab-content').forEach(c => c.classList.remove('active-content'));
    const tabButton = document.querySelector(`[data-tab-id='${tabId}']`);
    if (tabButton) tabButton.classList.add('active-tab');
    const contentPane = document.getElementById(tabId);
    if (contentPane) contentPane.classList.add('active-content');
}

function closeTab(tabId) {
    if (tabId === 'new-item-tab') return; 
    const tabButton = document.querySelector(`[data-tab-id='${tabId}']`);
    const contentPane = document.getElementById(tabId);
    if (tabButton) tabButton.remove();
    if (contentPane) contentPane.remove();
    delete mgmtState.openTabs[tabId];

    if (tabButton && tabButton.classList.contains('active-tab')) {
        const remainingTabs = Object.keys(mgmtState.openTabs);
        switchTab(remainingTabs.length > 0 ? remainingTabs[0] : 'new-item-tab');
    }
}

async function handleItemFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const isNew = form.dataset.isNew === 'true';
    const itemId = form.dataset.itemId;
    const data = Object.fromEntries(new FormData(form));

    const url = isNew 
        ? `/api/management/items/${mgmtState.activeYear}/${mgmtState.activeMonth}`
        : `/api/management/items/${mgmtState.activeYear}/${mgmtState.activeMonth}/${itemId}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Operation failed');
        
        alert('Thao tác thành công!');
        loadMonthData(mgmtState.activeYear, mgmtState.activeMonth, mgmtState.activeMonthLink);

    } catch (e) { alert(`Lỗi: ${e.message}`); }
}

async function handleItemDelete(itemId) {
    if (!confirm('Bạn có chắc chắn muốn xóa khoản chi này không?')) return;
    try {
        const response = await fetch(`/api/management/items/${mgmtState.activeYear}/${mgmtState.activeMonth}/${itemId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error((await response.json()).error || 'Delete failed');
        
        alert('Xóa thành công!');
        closeTab(`tab-${itemId}`);

    } catch (e) { alert(`Lỗi: ${e.message}`); }
}


// ==================================================
//  EVENT LISTENERS & ROUTING
// ==================================================

function attachGlobalEventListeners() {
    menuContainer.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.matches('.nav-link')) {
            e.preventDefault();
            const path = link.getAttribute('href');
            history.pushState({ path }, '', path);
            handleNav(path);
        }
    });
}

function attachPageEventListeners(pagePath) {
    const pageContent = document.getElementById('content');
    // Remove previous listeners if any to avoid duplication
    // (A more robust solution would be to use a controller/class to manage listeners)

    if (pagePath === '/collections') {
        const selector = document.getElementById('collection-selector');
        const addButton = document.getElementById('add-item-btn');
        const collectionsContent = document.getElementById('collections-content');
        const modal = document.getElementById('form-modal');

        if (selector) {
            selector.addEventListener('change', (e) => loadDocuments(e.target.value));
        }
        if (addButton) {
            addButton.addEventListener('click', () => openModal('add'));
        }
        if (collectionsContent) {
            collectionsContent.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-btn');
                const deleteBtn = e.target.closest('.delete-btn');
                if (editBtn) {
                    openModal('edit', editBtn.dataset.id);
                }
                if (deleteBtn) {
                    handleDelete(deleteBtn.dataset.id);
                }
            });
        }
        if (modal) {
            document.getElementById('item-form').addEventListener('submit', handleFormSubmit);
            document.getElementById('close-modal-btn').addEventListener('click', closeModal);
        }
    } 
    else if (pagePath === '/management') {
        mgmtState = { activeMonthLink: null, activeYear: null, activeMonth: null, openTabs: {} };
        pageContent.addEventListener('click', function(e) {
            const target = e.target;
            if (target.classList.contains('toggle')) {
                target.classList.toggle('expanded');
                target.nextElementSibling?.classList.toggle('active');
            } else if (target.classList.contains('month-link')) {
                loadMonthData(target.dataset.year, target.dataset.month, target);
            } else if (target.closest('.item-tab, .special-tab') && !target.classList.contains('tab-close-btn')) {
                switchTab(target.closest('.item-tab, .special-tab').dataset.tabId);
            } else if (target.classList.contains('tab-close-btn')) {
                closeTab(target.dataset.tabId);
            } else if (target.classList.contains('btn-edit-item')) {
                const form = target.closest('.item-form');
                form.querySelectorAll('.input-field').forEach(i => i.disabled = false);
                form.querySelector('.btn-save-item').style.display = 'inline-block';
                target.style.display = 'none';
            } else if (target.classList.contains('btn-delete-item')) {
                handleItemDelete(target.closest('.item-form').dataset.itemId);
            }
        });
        pageContent.addEventListener('submit', function(e) {
            if (e.target.classList.contains('item-form')) handleItemFormSubmit(e);
        });
    }
}

const routes = {
    '/': 'src/pages/home.html',
    '/collections': 'src/pages/collections.html',
    '/management': 'src/pages/management.html'
};

async function handleNav(path) {
    const pageFile = routes[path] || routes['/'];
    try {
        const response = await fetch(pageFile);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        content.innerHTML = await response.text();
        
        // The order is important: content must be in the DOM before we can attach listeners or load data into it.
        attachPageEventListeners(path); // Attach listeners for the new page

        if (path === '/collections') {
            await loadCollectionData(); // Then load the initial data
        }
        else if (path === '/management') {
            await loadManagementPage();
        }

    } catch (e) {
        console.error("Error handling navigation:", e);
        content.innerHTML = `<div class="text-center p-8"><h1 class="text-2xl font-bold text-red-600">Page Not Found</h1><p class="text-gray-500">Could not load content for ${path}.</p></div>`;
    }
}

async function initialLoad() {
    menuContainer.innerHTML = await (await fetch('src/components/menu.html')).text();
    attachGlobalEventListeners();
    window.onpopstate = e => {
        handleNav(e.state?.path || '/');
    };
    await handleNav(window.location.pathname);
}

initialLoad();
