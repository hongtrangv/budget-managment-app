import { authenticatedFetch, showAlert } from './utils.js';
import { ICONS } from './icons.js';

// Store the DOM elements that are frequently accessed
let form, formTitle, nameInput, pathInput, iconInput, rolesInput, itemIdInput, saveBtn, cancelBtn, menuListContainer, reloadBtn;

// --- API Calls ---

async function getMenuItems() {
    try {
        const response = await authenticatedFetch('/api/admin/menu', { method: 'GET' });
        if (!response.ok) throw new Error('Failed to fetch menu items');
        return await response.json();
    } catch (error) {
        showAlert({ type: 'error', title: 'Lỗi Tải Dữ Liệu', message: 'Không thể lấy danh sách menu. Vui lòng thử lại.' });
        return [];
    }
}

async function saveMenuItem(itemData) {
    const isEdit = !!itemData.id;
    const url = isEdit ? `/api/admin/menu/${itemData.id}` : '/api/admin/menu';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await authenticatedFetch(url, {
            method: method,
            body: JSON.stringify(itemData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Lỗi không xác định từ server');
        }

        showAlert({ type: 'success', title: 'Thành công', message: `Đã ${isEdit ? 'cập nhật' : 'thêm mới'} mục menu thành công!` });
        await loadAndRenderMenu(); // Refresh the list
        resetForm();
    } catch (error) {
        showAlert({ type: 'error', title: 'Lưu Thất Bại', message: error.message });
    }
}

async function deleteMenuItem(itemId) {
    try {
        const response = await authenticatedFetch(`/api/admin/menu/${itemId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Xóa thất bại');
        showAlert({ type: 'success', title: 'Đã xóa', message: 'Đã xóa mục menu thành công.' });
        await loadAndRenderMenu(); // Refresh the list
    } catch (error) {
        showAlert({ type: 'error', title: 'Lỗi', message: error.message });
    }
}

// --- UI Rendering & Manipulation ---

function createMenuItemElement(item) {
    const li = document.createElement('div');
    li.className = 'flex items-center justify-between p-3 bg-white dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600';
    li.dataset.id = item.id;

    const rolesText = item.roles && item.roles.length ? item.roles.join(', ') : 'Mọi người';
    const iconHTML = ICONS[item.icon?.toUpperCase()] || '<span class="w-6 h-6"></span>'; // Use a placeholder if icon doesn't exist

    li.innerHTML = `
        <div class="flex items-center space-x-4">
            ${iconHTML}
            <div>
                <p class="font-semibold text-gray-800 dark:text-white">${item.text}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${item.url} - <span class="font-medium">Quyền:</span> ${rolesText}</p>
            </div>
        </div>
        <div class="flex items-center space-x-2">
            <button title="Sửa" class="edit-btn btn-icon text-blue-500 hover:text-blue-700">${ICONS.EDIT}</button>
            <button title="Xóa" class="delete-btn btn-icon text-red-500 hover:text-red-700">${ICONS.DELETE}</button>
        </div>
    `;

    return li;
}

function renderMenuList(items) {
    menuListContainer.innerHTML = ''; // Clear existing list
    if (items.length === 0) {
        menuListContainer.innerHTML = `<div class="text-center p-8 text-gray-500">Chưa có mục menu nào.</div>`;
        return;
    }
    items.forEach(item => {
        const itemEl = createMenuItemElement(item);
        menuListContainer.appendChild(itemEl);
    });
}

function populateForm(item) {
    formTitle.textContent = 'Chỉnh sửa Mục Menu';
    nameInput.value = item.text || '';
    pathInput.value = item.url || '';
    iconInput.value = item.icon || '';
    rolesInput.value = item.roles ? item.roles.join(', ') : '';
    itemIdInput.value = item.id;
    saveBtn.textContent = 'Cập nhật';
    cancelBtn.classList.remove('hidden');
    nameInput.focus();
}

function resetForm() {
    form.reset();
    formTitle.textContent = 'Thêm mục mới';
    itemIdInput.value = '';
    saveBtn.textContent = 'Lưu';
    cancelBtn.classList.add('hidden');
}


// --- Event Handlers ---

async function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(form);
    const id = formData.get('id');
    const text = formData.get('text');
    const url = formData.get('url');
    const icon = formData.get('icon');
    const roles = formData.get('roles').split(',').map(r => r.trim()).filter(r => r);

    if (!text || !url) {
        showAlert({type: 'warning', title: 'Thiếu thông tin', message: 'Tên hiển thị và Đường dẫn là bắt buộc.'});
        return;
    }
    
    await saveMenuItem({ id, text, url, icon, roles });
}

function handleListClick(event) {
    const editButton = event.target.closest('.edit-btn');
    const deleteButton = event.target.closest('.delete-btn');

    if (!editButton && !deleteButton) return;

    const listItem = event.target.closest('[data-id]');
    const itemId = listItem.dataset.id;

    if (editButton) {
        const itemData = {
            id: itemId,
            text: listItem.querySelector('.font-semibold').textContent,
            url: listItem.querySelector('.text-sm').textContent.split(' - ')[0],
            icon: listItem.querySelector('svg').dataset.iconName || iconInput.value, // A bit tricky, might need better data embedding
            roles: listItem.querySelector('.font-medium').nextSibling.textContent.trim().split(', ')
        };
        
        // Find the full item object to get accurate data
        getMenuItems().then(items => {
            const fullItem = items.find(i => i.id === itemId);
            if (fullItem) populateForm(fullItem);
        });
    }

    if (deleteButton) {
        showAlert({
            type: 'warning',
            title: 'Xác nhận Xóa',
            message: `Bạn có chắc chắn muốn xóa mục menu này không?`,
            buttons: [
                { text: 'Hủy', class: 'secondary' },
                { 
                    text: 'Xóa', 
                    class: 'primary', // This will be styled as the danger action by the alert function
                    onClick: () => deleteMenuItem(itemId) 
                }
            ]
        });
    }
}

async function loadAndRenderMenu() {
    const items = await getMenuItems();
    renderMenuList(items);
}

// --- Initialization ---

function queryDOMElements() {
    form = document.getElementById('menu-item-form');
    formTitle = document.getElementById('form-title');
    nameInput = document.getElementById('menu-item-name');
    pathInput = document.getElementById('menu-item-path');
    iconInput = document.getElementById('menu-item-icon');
    rolesInput = document.getElementById('menu-item-roles');
    itemIdInput = document.getElementById('menu-item-id');
    saveBtn = document.getElementById('save-menu-item-btn');
    cancelBtn = document.getElementById('cancel-edit-btn');
    menuListContainer = document.getElementById('menu-items-list');
    reloadBtn = document.getElementById('reload-menu-btn');
}

export function initAdminMenuPage() {
    queryDOMElements();

    if (!form) return; // Don't run if we are not on the admin menu page

    // Attach event listeners
    form.addEventListener('submit', handleFormSubmit);
    cancelBtn.addEventListener('click', resetForm);
    menuListContainer.addEventListener('click', handleListClick);
    reloadBtn.addEventListener('click', loadAndRenderMenu);

    // Initial load
    loadAndRenderMenu();
}
