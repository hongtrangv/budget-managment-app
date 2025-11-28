
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
    if (!alertContainer) {
        console.error("Alert container #alert-container not found.");
        return;
    }
    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    const icons = { /* icon definitions */ };
    alert.innerHTML = `...`; // alert innerHTML
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

export function createTable(data, headers, collectionName,page,pageSize) {
    const table = document.createElement('table');
    table.className = 'min-w-full bg-white';

    const thead = document.createElement('thead');
    thead.className = 'bg-green-600 text-white';
    const headerRow = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'col';
    th.className = 'py-3 px-4 text-center uppercase font-semibold text-sm';
    th.textContent = "STT";
    headerRow.appendChild(th);
    headers.forEach(headerText => {  
        const th = document.createElement('th');
        th.scope = 'col';
        th.className = 'py-3 px-4 text-center uppercase font-semibold text-sm';     
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    const actionTh = document.createElement('th');
    actionTh.scope = 'col';
    actionTh.className = 'py-3 px-4 text-center uppercase font-semibold text-sm';
    actionTh.innerHTML = 'Hành động';
    headerRow.appendChild(actionTh);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.className = 'text-gray-700';
    if (data.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = headers.length + 1;
        td.className = 'px-6 py-4 text-center text-sm text-gray-500';
        td.textContent = 'Không có dữ liệu';
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else {       
        data.forEach((item,i) => {
            const rowClass = i % 2 === 0 ? 'bg-white' : 'bg-green-50';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.className = `${rowClass} text-center`;
            td.textContent = ((page-1)*pageSize) + i+1 || '';
            tr.appendChild(td);
            headers.forEach(header => {                 
                const td = document.createElement('td');
                td.className = `${rowClass} text-center`;              
                td.textContent = item.name || '';
                tr.appendChild(td);
            });

            const actionTd = document.createElement('td');
            actionTd.className = `${rowClass} text-right`;
            actionTd.innerHTML = `
                <button class="edit-btn text-indigo-600 hover:text-indigo-900" data-id="${item.id}">Sửa</button>
                <button class="delete-btn text-red-600 hover:text-red-900 ml-4" data-id="${item.id}">Xóa</button>
            `;
            tr.appendChild(actionTd);
            tbody.appendChild(tr);
        });
    }

    table.appendChild(tbody);
    return table;
}

export async function openModal(mode, collectionName, headers, data, onComplete) {
    const modal = document.getElementById('form-modal');
    const titleEl = document.getElementById('form-title');
    const form = document.getElementById('item-form');
    const formFields = document.getElementById('form-fields');
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    if (!modal || !titleEl || !form || !formFields || !submitBtn || !cancelBtn) {
        console.error('Modal elements not found!');
        return;
    }

    form.reset();
    formFields.innerHTML = '';
    submitBtn.style.display = 'inline-block';
    
    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    if (mode === 'delete') {
        titleEl.textContent = 'Xác nhận xóa';
        formFields.innerHTML = '<p>Bạn có chắc chắn muốn xóa mục này không?</p>';
        submitBtn.textContent = 'Xóa';
        submitBtn.className = 'px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-red-700';

        form.onsubmit = async (e) => {
            e.preventDefault();
            try {
                const response = await fetch(`/api/collections/${collectionName}/${data.id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Lỗi không xác định');
                }
                showAlert('success', 'Đã xóa thành công!');
                closeModal();
                if (onComplete) onComplete();
            } catch (error) {
                showAlert('error', error.message);
            }
        };
    } else {
        submitBtn.className = 'px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-green-700';
        headers.forEach(header => {
            if (header.toLowerCase() === 'id') return;
            const fieldContainer = document.createElement('div');
            fieldContainer.className = 'mb-4 text-left';
            const label = document.createElement('label');
            label.className = 'block text-gray-700 text-sm font-bold mb-2';
            label.htmlFor = `field-${header}`;
            label.textContent = header;
            const input = document.createElement('input');
            input.className = 'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700';
            input.id = `field-${header}`;
            input.name = header;
            input.type = 'text';
            fieldContainer.appendChild(label);
            fieldContainer.appendChild(input);
            formFields.appendChild(fieldContainer);
        });

        if (mode === 'add') {
            titleEl.textContent = 'Thêm mục mới';
            submitBtn.textContent = 'Lưu';
            form.onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const postData = Object.fromEntries(formData.entries());
                try {
                    const response = await fetch(`/api/collections/${collectionName}/documents`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(postData)
                    });
                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.error || 'Lỗi không xác định');
                    }
                    showAlert('success', 'Đã thêm thành công!');
                    closeModal();
                    if (onComplete) onComplete();
                } catch (error) {
                    showAlert('error', error.message);
                }
            };
        } else if (mode === 'edit') {
            titleEl.textContent = 'Chỉnh sửa mục';
            submitBtn.textContent = 'Cập nhật';
            headers.forEach(header => {
                const input = document.getElementById(`field-${header}`);
                if (input && data[header]) {
                    input.value = data[header];
                }
            });
            form.onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const updateData = Object.fromEntries(formData.entries());
                try {
                    const response = await fetch(`/api/collections/${collectionName}/${data.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData)
                    });
                     if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.error || 'Lỗi không xác định');
                    }
                    showAlert('success', 'Đã cập nhật thành công!');
                    closeModal();
                    if (onComplete) onComplete();
                } catch (error) {
                    showAlert('error', error.message);
                }
            };
        }
    }

    cancelBtn.onclick = closeModal;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
