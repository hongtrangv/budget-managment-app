import { ICONS } from './icons.js';

export function formatCurrency(value) {
    if (typeof value !== 'number') return value;
    return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}
export function formatDateToYMD(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
	 
}
/**
 * Fetches the API secret key from the server.
 * Stores the key in a local variable for subsequent requests.
 * @returns {Promise<string>} The API secret key.
 */
let apiSecretKey = window.API_KEY;
async function getApiSecretKey() {
    if (apiSecretKey) {
        return apiSecretKey;
    }
    try {
        const response = await fetch('/api/get-key');
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        apiSecretKey = data.api_key;
        return apiSecretKey;
    } catch (error) {
        console.error('Failed to get API key:', error);
        showAlert('error', 'Không thể lấy khóa API để xác thực. Vui lòng tải lại trang.');
        throw error; // Re-throw to stop the authenticated fetch
    }
}

/**
 * Shows a customizable alert message.
 * @param {'success' | 'error' | 'info'} type - The type of alert.
 * @param {string} message - The message to display.
 * @param {number} duration - The duration in milliseconds before the alert disappears.
 */
export function showAlert(type, message, duration = 4000) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        console.error('Alert container not found!');
        return;
    }

    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    const alertDiv = document.createElement('div');
    alertDiv.className = `fixed top-5 right-5 ${colors[type]} text-white py-2 px-4 rounded-lg shadow-lg animate-fade-in-down z-50`;
    alertDiv.textContent = message;

    alertContainer.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.classList.add('animate-fade-out-up');
        alertDiv.addEventListener('animationend', () => {
            alertDiv.remove();
        });
    }, duration);
}

/**
 * A wrapper around the native fetch API that automatically adds the API key to the headers.
 * It also provides centralized error handling.
 * @param {string} url - The URL to fetch.
 * @param {object} options - The options for the fetch request.
 * @returns {Promise<Response>} The fetch response.
 */
export async function authenticatedFetch(url, options = {}) {
    try {
        const key = await getApiSecretKey();

        const headers = {
            ...options.headers,
            'X-API-Key': key,
            'Content-Type': 'application/json'
        };

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            let errorMessage = `Lỗi HTTP: ${response.status}`;
            try {
                const errorBody = await response.json();
                errorMessage = errorBody.message || errorBody.error || errorMessage;
            } catch (e) {
                // Body is not JSON or empty, use the default message
            }
            showAlert('error', errorMessage);
            throw new Error(errorMessage);
        }

        return response;
    } catch (error) {
        console.error('Authenticated fetch failed:', error);
        // Avoid showing a generic alert if a specific one was already shown
        if (!error.message.startsWith('Lỗi HTTP')) {
             showAlert('error', `Yêu cầu thất bại: ${error.message}`);
        }
        throw error; // Re-throw the error so the calling function can handle it
    }
}

/**
 * Creates and displays a dynamic modal for adding or editing data.
 * @param {object} options - The configuration for the modal.
 * @param {'add' | 'edit'} options.mode - The mode of the modal.
 * @param {object} options.headers - An object defining the form fields (key: field name, value: label).
 * @param {object} [options.data] - The existing data for the fields (in 'edit' mode).
 * @param {string} options.apiUrl - The base API URL for the request.
 * @param {string} [options.docId] - The document ID (required for 'edit' mode).
 * @param {string} options.addAction - The action identifier for adding an item.
 * @param {string} options.editAction - The action identifier for updating an item.
 * @param {function} options.onComplete - The callback function to execute after a successful operation.
 */
export function createDynamicModal({ mode, headers, data = {}, apiUrl, docId, addAction, editAction, onComplete }) {
    // Remove any existing modal first
    document.getElementById('dynamic-modal-container')?.remove();

    const isEditMode = mode === 'edit';

    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.id = 'dynamic-modal-container';
    modalContainer.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-40';

    // Create modal dialog
    const modalDialog = document.createElement('div');
    modalDialog.className = 'relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white';

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'mt-3 text-center';

    // Create title
    const title = document.createElement('h3');
    title.className = 'text-lg leading-6 font-medium text-gray-900';
    title.textContent = isEditMode ? 'Chỉnh sửa Mục' : 'Thêm Mục mới';

    // Create form
    const form = document.createElement('form');
    form.className = 'mt-4';
    
    const formFields = document.createElement('div');
    formFields.className = 'space-y-4';

    // Generate form fields from headers
    Object.keys(headers).forEach(key => {
        if (key.toLowerCase() === 'id') return; // Don't create an input for the ID

        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'text-left';

        const label = document.createElement('label');
        label.htmlFor = `modal-field-${key}`;
        label.className = 'block text-sm font-medium text-gray-700';
        label.textContent = headers[key];

        const input = document.createElement('input');
        input.type = 'text';
        input.name = key;
        input.id = `modal-field-${key}`;
        input.className = 'mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm';
        if (isEditMode) {
            input.value = data[key] || '';
        }

        fieldDiv.appendChild(label);
        fieldDiv.appendChild(input);
        formFields.appendChild(fieldDiv);
    });

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'mt-6 flex justify-end space-x-3';

    // Create submit button
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = isEditMode ? 'Lưu thay đổi' : 'Thêm mới';

    // Create cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Hủy';

    // Event Listeners
    cancelBtn.addEventListener('click', () => {
        modalContainer.remove();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        const method = isEditMode ? 'PUT' : 'POST';
        const actionIdentifier = isEditMode ? editAction : addAction;
        const url = isEditMode ? `${apiUrl}/${docId}` : apiUrl;

        try {
            await authenticatedFetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Action-Identifier': actionIdentifier
                },
                body: JSON.stringify(payload)
            });

            showAlert('success', `Đã ${isEditMode ? 'cập nhật' : 'thêm mới'} thành công!`);
            modalContainer.remove();
            if (onComplete) {
                onComplete();
            }
        } catch (error) {
            // Error alert is already shown by authenticatedFetch
            console.error('Form submission error:', error);
        } finally {
            submitBtn.disabled = false;
        }
    });

    // Assemble modal
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(submitBtn);
    
    form.appendChild(formFields);
    form.appendChild(buttonContainer);

    modalContent.appendChild(title);
    modalContent.appendChild(form);

    modalDialog.appendChild(modalContent);
    modalContainer.appendChild(modalDialog);

    // Append to body and show
    document.body.appendChild(modalContainer);
}

/**
 * Creates an HTML table from an array of data, styled to match the project's design.
 * @param {Array<object>} data - The array of data objects.
 * @param {object} headers - An object where keys are data properties and values are table headers.
 * @param {number} currentPage - The current page number.
 * @param {number} pageSize - The number of items per page.
 * @param {function} onAction - Callback function for actions like edit/delete. Signature: (action, docId, data)
 * @returns {HTMLTableElement} The generated table element.
 */
export function createTable(data, headers, currentPage, pageSize, onAction) {
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-300';

    // Create table head with project-specific styling
    const thead = document.createElement('thead');
    thead.className = 'bg-green-600';
    const trHead = document.createElement('tr');
    
    // Add a number column header
    const thNum = document.createElement('th');
    thNum.className = 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider';
    thNum.textContent = 'STT';
    trHead.appendChild(thNum);

    Object.values(headers).forEach(headerText => {
        const th = document.createElement('th');
        th.className = 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider';
        th.textContent = headerText;
        trHead.appendChild(th);
    });
    
    const thActions = document.createElement('th');
    thActions.className = 'px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider';
    thActions.textContent = 'Hành động';
    trHead.appendChild(thActions);

    thead.appendChild(trHead);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white divide-y divide-gray-200';

    if (data.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = Object.keys(headers).length + 2; // +2 for # and Actions columns
        td.className = 'px-6 py-4 text-center text-gray-500';
        td.textContent = 'Không có dữ liệu.';
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else {
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.className = index % 2 === 0 ? 'bg-white' : 'bg-green-50'; // Alternating row colors
            tr.classList.add('hover:bg-green-100');
            
            // Number cell
            const tdNum = document.createElement('td');
            tdNum.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-700';
            tdNum.textContent = (currentPage - 1) * pageSize + index + 1;
            tr.appendChild(tdNum);

            Object.keys(headers).forEach(key => {
                const td = document.createElement('td');
                td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';
                td.textContent = row[key] || '';
                tr.appendChild(td);
            });

            // Action buttons cell
            const tdActions = document.createElement('td');
            tdActions.className = 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2';

            const editButton = document.createElement('button');
            editButton.title = 'Chỉnh sửa';
            editButton.innerHTML = ICONS.EDIT; // Use icon from JS module
            editButton.onclick = () => onAction('edit', row.id, row);

            const deleteButton = document.createElement('button');
            deleteButton.title = 'Xóa';
            deleteButton.innerHTML = ICONS.DELETE; // Use icon from JS module
            deleteButton.onclick = () => onAction('delete', row.id, row);

            tdActions.appendChild(editButton);
            tdActions.appendChild(deleteButton);
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });
    }

    table.appendChild(tbody);

    return table;
}
