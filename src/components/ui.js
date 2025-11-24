const content = document.getElementById('content');
const menuContainer = document.getElementById('menu-container');

// --- State variables for different pages ---
let currentCollection = 'Items'; // Default collection
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
        // Don't create a column for the 'id' field
        if (key !== 'id') {
            html += `<th class="py-3 px-4 text-left uppercase font-semibold text-sm">${key}</th>`;
        }
    });
    html += '<th class="py-3 px-4 text-right uppercase font-semibold text-sm">Hành động</th></tr></thead><tbody class="text-gray-700">';
    documents.forEach((doc, index) => {
        const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-green-50';
        const docId = doc['id']; // Use the 'id' field we added
        html += `<tr class="${rowClass}" data-id="${docId}">`;
        headers.forEach(header => {
            if (header !== 'id') {
                html += `<td class="py-3 px-4">${doc[header] || ''}</td>`;
            }
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
    let idFieldHtml = '';
    let otherFieldsHtml = '';
    const idKey = 'Danh mục thu chi';

    headers.forEach(key => {
        if (key === 'id') return; // Don't create a form field for the internal 'id'
        const value = doc[key] || '';
        const fieldHtml = `
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="form-${key}">${key}</label>
                <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                       id="form-${key}" type="text" name="${key}" value="${value}" ${key === idKey && isEditMode ? '' : 'readonly'}>
            </div>`;
        if (key === idKey) {
            idFieldHtml = fieldHtml;
        } else {
            otherFieldsHtml += fieldHtml;
        }
    });
    return idFieldHtml + otherFieldsHtml;
}

// --- Modal Handling ---
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
    // Luôn chỉ lấy Items
    try {       
        await loadDocuments("items");        
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
        ? `/api/collections/${currentCollection}/${currentDocId}`
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
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete document.');
        }
        await loadDocuments(currentCollection);
        alert('Xóa thành công!');
    } catch (error) {
        console.error('Delete error:', error);
        alert(`Lỗi: ${error.message}`);
    }
}


// ==================================================
//  LOGIC FOR "MANAGEMENT" PAGE
// ==================================================

// Renders the form for creating a NEW item
function renderNewItemForm(tabId) {
    const today = new Date().toISOString().split('T')[0];
    return `
        <form class="item-form p-4 bg-gray-50 rounded" data-tab-id="${tabId}" data-is-new="true" onsubmit="handleItemFormSubmit(event)">
            <h3 class="text-lg font-bold mb-4">Tạo khoản chi mới</h3>
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Tên khoản chi</label>
                <input type="text" name="Tên" required class="input-field">
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Số tiền (VND)</label>
                <input type="number" name="Số tiền" required class="input-field">
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Ngày</label>
                <input type="date" name="date" value="${today}" required class="input-field">
            </div>
            <div class="form-actions mt-4">
                <button type="submit" class="btn-save-item">Tạo mới</button>
            </div>
        </form>
    `;
}

// Renders a table to display the details of an existing item
function renderItemTable(item) {
    let tableHtml = `<div class="p-4"><h3 class="text-lg font-bold mb-4">Chi tiết: ${item['Tên'] || ''}</h3><div class="overflow-x-auto shadow-lg rounded-lg"><table class="min-w-full bg-white">`;
    tableHtml += '<thead class="bg-gray-200 text-gray-600"><tr><th class="py-2 px-4 text-left">Trường</th><th class="py-2 px-4 text-left">Giá trị</th></tr></thead>';
    tableHtml += '<tbody>';
    
    // Define the order or fields to display
    const fieldOrder = ['Tên', 'Số tiền', 'date', 'id'];
    
    for (const key of fieldOrder) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
            const value = item[key];
             if (key !== 'id') { // Don't show the ID row in the table
                tableHtml += `<tr class="border-b"><td class="py-2 px-4 font-semibold">${key}</td><td class="py-2 px-4">${value}</td></tr>`;
            }
        }
    }

    tableHtml += '</tbody></table></div></div>';
    return tableHtml;
}


function createTab(title, tabId, options = {}) {
    const { isSpecial = false } = options;
    const tabBar = document.getElementById('item-tab-bar');
    const tabButton = document.createElement('div');
    tabButton.className = isSpecial ? 'special-tab' : 'item-tab';
    tabButton.dataset.tabId = tabId;
    // No close button 'x'
    tabButton.innerHTML = `<span>${title}</span>`;
    tabBar.appendChild(tabButton);
}

function createTabContent(item, tabId, isNew = false) {
    const contentContainer = document.getElementById('item-tab-content-container');
    const contentPane = document.createElement('div');
    contentPane.className = 'item-tab-content';
    contentPane.id = tabId;
    
    // Render a form for a new item, or a table for an existing one
    if (isNew) {
        contentPane.innerHTML = renderNewItemForm(tabId);
    } else {
        contentPane.innerHTML = renderItemTable(item);
    }
    
    contentContainer.appendChild(contentPane);
}


async function loadManagementPage() {
    const treeContainer = document.getElementById('management-tree');
    if (!treeContainer) return;
    try {
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
    // Reset state but keep track of the new active month
    mgmtState = { activeMonthLink: monthElement, activeYear: year, activeMonth: month, openTabs: {} };

    const tabBar = document.getElementById('item-tab-bar');
    const contentContainer = document.getElementById('item-tab-content-container');
    tabBar.innerHTML = '';
    contentContainer.innerHTML = '<p id="viewer-placeholder">Đang tải dữ liệu chi tiêu...</p>';

    try {
        const response = await fetch(`/api/management/items/${year}/${month}`);
        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        const items = await response.json();

        const placeholder = document.getElementById('viewer-placeholder');
        if(placeholder) placeholder.style.display = 'none';

        // Create the '+' tab for adding new items       
        createTabContent({}, 'new-item-tab', true);
        mgmtState.openTabs['new-item-tab'] = true;

        if (items && items.length > 0) {
            items.forEach(item => {
                const tabId = `tab-${item.id}`;
                createTab(item['Tên'] || item.id, tabId);
                createTabContent(item, tabId, false); // 'false' because this is an existing item
                mgmtState.openTabs[tabId] = true;
            });
            // Automatically switch to the first real item's tab
            switchTab(`tab-${items[0].id}`);
        } else {
            // If no items, switch to the 'new item' tab
            switchTab('new-item-tab');
            if(placeholder) {
                placeholder.textContent = "Không có khoản chi nào trong tháng này.";
                placeholder.style.display = 'block'; // Make sure it's visible
            }
        }

    } catch (e) { 
        const placeholder = document.getElementById('viewer-placeholder');
        if(placeholder) placeholder.textContent = `Lỗi khi tải dữ liệu: ${e.message}`;
        console.error('Error in loadMonthData:', e);
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.item-tab, .special-tab').forEach(t => t.classList.remove('active-tab'));
    document.querySelectorAll('.item-tab-content').forEach(c => c.classList.remove('active-content'));
    
    const tabButton = document.querySelector(`[data-tab-id='${tabId}']`);
    if (tabButton) tabButton.classList.add('active-tab');

    const contentPane = document.getElementById(tabId);
    if (contentPane) contentPane.classList.add('active-content');
}

// This function handles the submission of the NEW item form
async function handleItemFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    // Ensure we are in the context of the management page
    if (!mgmtState.activeYear || !mgmtState.activeMonth) {
        alert("Vui lòng chọn một tháng từ menu bên trái trước.");
        return;
    }

    const data = Object.fromEntries(new FormData(form));
    // Add month and year to the data
    data.year = mgmtState.activeYear;
    data.month = mgmtState.activeMonth;

    try {
        const response = await fetch('/api/management/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Không thể tạo mục mới.');
        }
        
        alert('Tạo mục mới thành công!');
        // Reload the data for the current month to show the new item
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

    if (pagePath === '/collections') {
        const selector = document.getElementById('collection-selector');
        const addButton = document.getElementById('add-new-btn');
        const collectionsContent = document.getElementById('collections-content');
        const modal = document.getElementById('form-modal');

        if (selector) selector.addEventListener('change', (e) => loadDocuments(e.target.value));
        if (addButton) addButton.addEventListener('click', () => openModal('add'));
        if (collectionsContent) {
            collectionsContent.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-btn');
                const deleteBtn = e.target.closest('.delete-btn');
                if (editBtn) openModal('edit', editBtn.dataset.id);
                if (deleteBtn) handleDelete(deleteBtn.dataset.id);
            });
        }
        if (modal) {
            document.getElementById('item-form').addEventListener('submit', handleFormSubmit);
            document.getElementById('cancel-btn').addEventListener('click', closeModal);
        }
    } 
    else if (pagePath === '/management') {
        // Reset state when page loads
        mgmtState = { activeMonthLink: null, activeYear: null, activeMonth: null, openTabs: {} };
        
        // Use a single, persistent event listener on the page content area
        pageContent.addEventListener('click', function(e) {
            const target = e.target;
            
            // Handle tree view toggle
            if (target.classList.contains('toggle')) {
                target.classList.toggle('expanded');
                target.nextElementSibling?.classList.toggle('active');
            } 
            // Handle month selection
            else if (target.classList.contains('month-link')) {
                loadMonthData(target.dataset.year, target.dataset.month, target);
            } 
            // Handle tab switching
            else if (target.closest('.item-tab, .special-tab')) {
                switchTab(target.closest('.item-tab, .special-tab').dataset.tabId);
            }
        });

        // The form submission for the management page is now handled by the 'onsubmit'
        // attribute in the form itself to avoid listener duplication.
    }
}

const routes = {
    '/': '/pages/home',
    '/collections': '/pages/collections',
    '/management': '/pages/management'
};

async function handleNav(path) {
    const routePath = path === '/' ? '/' : path.endsWith('/') ? path.slice(0, -1) : path;
    const pageEndpoint = routes[routePath] || routes['/']; 

    try {
        const response = await fetch(pageEndpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        content.innerHTML = await response.text();
        
        // Always attach page-specific listeners after loading new content
        attachPageEventListeners(routePath);

        // Load initial data for the specific page
        if (routePath === '/collections') {
            await loadCollectionData();
        }
        else if (routePath === '/management') {
            await loadManagementPage();
        }

    } catch (e) {
        console.error("Error handling navigation:", e);
        content.innerHTML = `<div class="text-center p-8"><h1 class="text-2xl font-bold text-red-600">Page Not Found</h1><p class="text-gray-500">Could not load content for ${path}.</p></div>`;
    }
}

async function initialLoad() {
    const menuResponse = await fetch('/components/menu');
    menuContainer.innerHTML = await menuResponse.text();

    attachGlobalEventListeners();
    
    // Handle back/forward browser navigation
    window.onpopstate = e => {
        handleNav(e.state?.path || '/');
    };

    // Initial page load based on the current URL
    await handleNav(window.location.pathname);
}

// Start the application
initialLoad();
