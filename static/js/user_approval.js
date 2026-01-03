import { ICONS } from './icons.js';
import { showAlert, formatDate, authenticatedFetch } from './utils.js';

async function fetchInactiveUsers(userList, loadingSpinner, noUsersMessage, showError) {
    showLoading(true, userList, loadingSpinner, noUsersMessage);
    try {
        const response = await fetch('/api/admin/inactive-users');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status}`);
        }
        const data = await response.json();
        renderUserList(data.users, userList, noUsersMessage);
    } catch (error) {
        console.error('Fetch inactive users error:', error);
        showError(error.message, userList);
    } finally {
        showLoading(false, userList, loadingSpinner, noUsersMessage);
    }
}

async function fetchRoles(roleSelect, roleLoadingMessage) {
    showRoleLoading(true, roleSelect, roleLoadingMessage);
    try {
        const response = await fetch('/api/auth/groups');
        if (!response.ok) throw new Error('Could not fetch roles');
        const data = await response.json();
        populateRoleSelect(data.groups, roleSelect);
    } catch (error) {
        console.error('Fetch roles error:', error);
    } finally {
        showRoleLoading(false, roleSelect, roleLoadingMessage);
    }
}

async function approveUser(userId, roleId, confirmButton, closeModal, refreshUsers) {
    confirmButton.disabled = true;
    confirmButton.textContent = 'Đang xử lý...';
    try {
        const response = await fetch('/api/admin/approve-user', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },            
            body: JSON.stringify({ user_id: userId, role_id: roleId })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Approval failed');
        alert('Thành công: ' + result.message); // Replace with a better notification system if available
        closeModal();
        refreshUsers();
    } catch (error) {
        console.error('Approve user error:', error);
        alert('Lỗi: ' + error.message); // Replace with a better notification system
    } finally {
        confirmButton.textContent = 'Duyệt và Kích hoạt';
        // The button state will be handled by the role selection logic
    }
}

function renderUserList(users, userList, noUsersMessage) {
    userList.innerHTML = '';
    if (!users || users.length === 0) {
        noUsersMessage.style.display = 'block';
        return;
    }
    noUsersMessage.style.display = 'none';
    users.forEach((user,i) => {
        const rowClass = i % 2 === 0 ? 'bg-white' : 'bg-green-50';
        const row = document.createElement('tr');
        row.className = rowClass;
        row.innerHTML = `
            <td class="py-2 px-4 text-center">${user.fullname || 'N/A'}</p></td>
            <td class="py-2 px-4 text-center">${user.username}</p></td>
            <td class="py-2 px-4 text-center">
                <button data-userid="${user.id}" data-username="${user.username}" data-fullname="${user.fullname || 'N/A'}" class="p-1 hover:bg-gray-200 rounded-full approve-btn" title="Duyệt">${ICONS.BADGE_CHECK}</button>
            </td>
        `;
        userList.appendChild(row);
    });
}

function populateRoleSelect(roles, roleSelect) {
    roleSelect.innerHTML = '<option value="" disabled selected>-- Chọn một vai trò --</option>';
    if (roles && roles.length > 0) {
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = role.name;
            roleSelect.appendChild(option);
        });
    }
}

function showLoading(isLoading, userList, loadingSpinner, noUsersMessage) {
    loadingSpinner.style.display = isLoading ? 'block' : 'none';
    noUsersMessage.style.display = 'none';
    if (isLoading) userList.innerHTML = '';
}

function showRoleLoading(isLoading, roleSelect, roleLoadingMessage) {
    roleLoadingMessage.style.display = isLoading ? 'block' : 'none';
    roleSelect.style.display = isLoading ? 'none' : 'block';
}

function showError(message, userList) {
    userList.innerHTML = `<td colspan="3" class="text-center py-10 px-5 text-red-500 font-semibold">${message}</td>`;
}

export function initUserApprovalPage() {
    const userList = document.getElementById('inactive-users-list');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noUsersMessage = document.getElementById('no-users-message');
    const modal = document.getElementById('approval-modal');
    
    // Check if the necessary elements exist before proceeding
    if (!userList || !loadingSpinner || !noUsersMessage || !modal) {
        console.error('One or more essential elements for the user approval page are missing.');
        return;
    }

    const roleSelect = document.getElementById('role-select');
    const roleLoadingMessage = document.getElementById('role-loading-message');
    const confirmButton = document.getElementById('confirm-approval');
    const cancelButton = document.getElementById('cancel-approval');

    let currentUserId = null;

    const closeModal = () => {
        modal.style.display = 'none';
        currentUserId = null;
        roleSelect.innerHTML = '';
    };

    const openModal = (user) => {
        currentUserId = user.id;
        document.getElementById('modal-fullname').textContent = user.fullname;
        document.getElementById('modal-username').textContent = user.username;
        document.getElementById('modal-userid').textContent = user.id;
        modal.style.display = 'flex';
        confirmButton.disabled = true;
        fetchRoles(roleSelect, roleLoadingMessage);
    };
    
    const refreshUsers = () => fetchInactiveUsers(userList, loadingSpinner, noUsersMessage, showError);

    // Attach event listeners
    userList.addEventListener('click', (e) => {
        if (e.target.classList.contains('approve-btn')) {
            const button = e.target;
            openModal({
                id: button.dataset.userid,
                username: button.dataset.username,
                fullname: button.dataset.fullname
            });
        }
    });

    roleSelect.addEventListener('change', () => {
        confirmButton.disabled = !roleSelect.value;
    });

    cancelButton.addEventListener('click', closeModal);

    confirmButton.addEventListener('click', () => {
        const selectedRoleId = roleSelect.value;
        if (selectedRoleId && currentUserId) {
            approveUser(currentUserId, selectedRoleId, confirmButton, closeModal, refreshUsers);
        }
    });

    // Initial data load
    refreshUsers();
}
