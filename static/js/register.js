// static/js/register.js
import { showAlert } from './utils.js';

/**
 * Handles the specific logic for the registration page.
 * It fetches the available user groups from the API and populates the dropdown select field.
 */
export async function loadRegistrationPage() {
    const groupSelect = document.getElementById('user-group');
    if (!groupSelect) {
        console.warn('Register page loaded, but "user-group" select element not found.');
        return;
    }

    // Set initial loading state
    groupSelect.disabled = true;
    groupSelect.innerHTML = '<option value="" disabled selected>Đang tải danh sách...</option>';

    try {
        const response = await fetch('/api/auth/groups');
        const data = await response.json();

        if (response.ok && data.status === 'success' && Array.isArray(data.groups)) {
            // Clear loading state
            groupSelect.innerHTML = '<option value="" disabled selected>-- Chọn một nhóm quyền --</option>';
            
            // Populate with groups from API
            data.groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.role_id;
                option.textContent = group.role_name;
                groupSelect.appendChild(option);
            });
            
            groupSelect.disabled = false;
        } else {
            // Handle API-level errors (e.g., {status: 'error', message: '...'})
            throw new Error(data.message || 'Phản hồi từ API không hợp lệ.');
        }
    } catch (error) {
        console.error('Failed to load user groups for registration page:', error);
        
        // Update UI to show error state
        groupSelect.innerHTML = '<option value="" disabled selected>Lỗi khi tải nhóm quyền</option>';
        groupSelect.disabled = true;
        
        // Show an alert to the user
        showAlert('error', 'Không thể tải danh sách nhóm quyền. Vui lòng thử lại sau.');
    }
}
