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

let alertContainer = null;
export function showAlert(type, message, duration = 4000) {
    if (!alertContainer) alertContainer = document.getElementById("alert-container");
    if (!alertContainer) return console.error("Alert container #alert-container not found.");
    
    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    // Icons can be added here if needed
    alert.innerHTML = `<span>${message}</span><button class="close-btn">&times;</button>`;
    alert.querySelector(".close-btn").addEventListener("click", () => alert.remove());
    alertContainer.appendChild(alert);
    setTimeout(() => alert.remove(), duration);
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
 * Creates and returns an HTML table element from given data.
 * @param {Array<Object>} data - Array of data objects.
 * @param {Object} headers - An object where keys are data properties and values are display names.
 * @param {string} collectionName - The name of the Firestore collection.
 * @param {number} page - The current page number.
 * @param {number} pageSize - The number of items per page.
 * @returns {HTMLTableElement} The generated table element.
 */
export function createTable(data, headers, collectionName, page, pageSize) {
    const table = document.createElement('table');
    table.className = 'min-w-full bg-white';

    const headerKeys = Object.keys(headers);
    const headerValues = Object.values(headers);

    const thead = document.createElement('thead');
    thead.className = 'bg-green-600 text-white';
    const headerRow = document.createElement('tr');
    
    // Add STT column header
    const thStt = document.createElement('th');
    thStt.className = 'py-3 px-4 text-center uppercase font-semibold text-sm';
    thStt.textContent = "STT";
    headerRow.appendChild(thStt);

    headerValues.forEach(value => {
        const th = document.createElement('th');
        th.className = 'py-3 px-4 text-left uppercase font-semibold text-sm';
        th.textContent = value;
        headerRow.appendChild(th);
    });

    const thAction = document.createElement('th');
    thAction.className = 'py-3 px-4 text-center uppercase font-semibold text-sm';
    thAction.textContent = 'Hành động';
    headerRow.appendChild(thAction);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.className = 'text-gray-700';
    
    if (data.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = headerKeys.length + 2; // +2 for STT and Actions
        td.className = 'py-4 px-4 text-center text-gray-500';
        td.textContent = 'Không có dữ liệu';
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else {
        data.forEach((item, index) => {
            const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-green-50';
            const tr = document.createElement('tr');
            tr.className = rowClass;

            // STT cell
            const tdStt = document.createElement('td');
            tdStt.className = 'py-3 px-4 text-center';
            tdStt.textContent = (page - 1) * pageSize + index + 1;
            tr.appendChild(tdStt);

            // Data cells
            headerKeys.forEach(key => {
                const td = document.createElement('td');
                const value = item[key];
 
                     // 1. Check for numbers
                     if (typeof value === 'number') {
                         td.textContent = value.toLocaleString('vi-VN');
                         td.className = 'py-3 px-4 text-right';
                     }
                     // 2. Check for date-like strings (e.g., YYYY-MM-DD) or Firebase Timestamps
                     else if ((typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) && !isNaN(new Date(value).getTime())) || (value && typeof value.toDate === 'function')) {
                         td.textContent = formatDate(value); // Use existing formatDate function
                         td.className = 'py-3 px-4 text-center';
                     }
                     // 3. Default for other values
                     else {
                         td.textContent = value || '';
                         td.className = 'py-3 px-4 text-left';
                     }
                tr.appendChild(td);
            });

            // Action cell
            const tdAction = document.createElement('td');
            tdAction.className = 'py-3 px-4';
            tdAction.innerHTML = `
            <div class="flex items-center justify-center space-x-2">
                <button class="edit-btn p-1 hover:bg-gray-200 rounded-full" data-id="${item.id}" title="Sửa">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                </button>
                <button class="delete-btn p-1 hover:bg-gray-200 rounded-full" data-id="${item.id}" title="Xóa">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                </button>
            </div>
            `;
            tr.appendChild(tdAction);
            tbody.appendChild(tr);
        });
    }
    table.appendChild(tbody);
    return table;
}

/**
 * Opens a modal for adding, editing, or deleting an item.
 * @param {'add'|'edit'|'delete'} mode - The mode of the modal.
 * @param {string} collectionName - The Firestore collection name.
 * @param {Object} headers - Object mapping data keys to display labels for form fields.
 * @param {Object|null} data - The data for the item (for 'edit' and 'delete').
 * @param {Function} onComplete - Callback function to run after a successful operation.
 */
export async function openModal(mode, collectionName, headers, data, onComplete) {
    const modal = document.getElementById('form-modal');
    const titleEl = document.getElementById('form-title');
    const form = document.getElementById('item-form');
    const formFields = document.getElementById('form-fields');
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    if (!modal || !titleEl || !form || !formFields || !submitBtn || !cancelBtn) {
        return console.error('Modal elements not found!');
    }

    form.reset();
    formFields.innerHTML = '';
    const closeModal = () => modal.classList.add('hidden');

    cancelBtn.onclick = closeModal;

    if (mode === 'delete') {
        titleEl.textContent = 'Xác nhận xóa';
        formFields.innerHTML = '<p>Bạn có chắc chắn muốn xóa mục này không?</p>';
        submitBtn.textContent = 'Xóa';
        submitBtn.className = 'btn btn-danger'; // Use full classes

        form.onsubmit = async (e) => {
            e.preventDefault();
            // API call to DELETE
            closeModal();
            if (onComplete) onComplete();
        };
    } else {
        // Reset submit button classes for add/edit
        submitBtn.className = 'btn btn-primary btn-save';

        // Generate form fields for 'add' and 'edit' modes
        for (const [key, label] of Object.entries(headers)) {
            const fieldContainer = document.createElement('div');
            fieldContainer.className = 'mb-4 text-left';
            fieldContainer.innerHTML = `
                <label for="field-${key}" class="block text-gray-700 text-sm font-bold mb-2">${label}</label>
                <input type="text" id="field-${key}" name="${key}" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
            `;
            formFields.appendChild(fieldContainer);
        }

        if (mode === 'add') {
            titleEl.textContent = 'Thêm mục mới';
            submitBtn.textContent = 'Lưu';
            
            form.onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const postData = Object.fromEntries(formData.entries());
                // API call to POST
                showAlert('success', 'Đã thêm thành công!');
                closeModal();
                if (onComplete) onComplete();
            };
        } else if (mode === 'edit') {
            titleEl.textContent = 'Chỉnh sửa mục';
            submitBtn.textContent = 'Cập nhật';

            // Populate form with existing data
            for (const key of Object.keys(headers)) {
                const input = form.querySelector(`#field-${key}`);
                if (input && data[key]) {
                    input.value = data[key];
                }
            }

            form.onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const updateData = Object.fromEntries(formData.entries());
                // API call to PUT
                showAlert('success', 'Đã cập nhật thành công!');
                closeModal();
                if (onComplete) onComplete();
            };
        }
    }

    modal.classList.remove('hidden');
}
