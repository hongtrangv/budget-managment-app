import { showAlert } from './utils.js';

let currentCollection = 'Items';
let currentDocuments = [];
let currentHeaders = [];
let isEditMode = false;
let currentDocId = null;

function attachTableEventListeners() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const docId = e.currentTarget.getAttribute('data-id');
            openModal('edit', docId);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const docId = e.currentTarget.getAttribute('data-id');
            handleDelete(docId);
        });
    });
}

function createTable(documents, headers) {
    if (!documents || documents.length === 0) return '<p class="text-center text-gray-500">Không tìm thấy mục nào.</p>';
    let html = '<div class="overflow-x-auto shadow-lg rounded-lg"><table class="min-w-full bg-white">';
    html += '<thead class="bg-green-600 text-white"><tr>';
    headers.forEach(key => { if (key !== 'id') html += `<th class="py-3 px-4 text-left uppercase font-semibold text-sm">${key}</th>`; });
    html += '<th class="py-3 px-4 text-right uppercase font-semibold text-sm">Hành động</th></tr></thead><tbody class="text-gray-700">';
    documents.forEach((doc, index) => {
        const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-green-50';
        html += `<tr class="${rowClass}" data-id="${doc['id']}">`;
        headers.forEach(header => { if (header !== 'id') html += `<td class="py-3 px-4">${doc[header] || ''}</td>`; });
        html += `<td class="py-3 px-4 flex items-center justify-end space-x-2">
                   <button class="p-1 hover:bg-gray-200 rounded-full edit-btn" data-id="${doc['id']}" title="Sửa"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button>
                   <button class="p-1 hover:bg-gray-200 rounded-full delete-btn" data-id="${doc['id']}" title="Xóa"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button>
                 </td></tr>`;
    });
    html += '</tbody></table></div>';
    return html;
}

function createFormFields(doc, headers) {
    let html = '';
    headers.forEach(key => {
        if (key === 'id') return;
        html += `
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="form-${key}">${key}</label>
                <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                       id="form-${key}" type="text" name="${key}" value="${doc[key] || ''}">
            </div>`;
    });
    return html;
}

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

function closeModal() { document.getElementById('form-modal').classList.add('hidden'); }

async function loadDocuments(collectionName) {
    currentCollection = collectionName;
    const contentDiv = document.getElementById('collections-content');
    contentDiv.innerHTML = '<p>Đang tải ...</p>';
    try {
        const response = await fetch(`/api/collections/${collectionName}/documents`);
        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        currentDocuments = await response.json();
        currentHeaders = currentDocuments.length > 0 ? Object.keys(currentDocuments[0]) : ['Danh mục thu chi', 'Tên', 'Mô tả'];
        contentDiv.innerHTML = createTable(currentDocuments, currentHeaders);
        attachTableEventListeners();
    } catch (error) {
        console.error('Error loading documents:', error);
        contentDiv.innerHTML = `<p class="text-red-500">Lỗi tải dữ liệu: ${error.message}</p>`;
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const url = isEditMode ? `/api/collections/${currentCollection}/${currentDocId}` : `/api/collections/${currentCollection}/documents`;
    const method = isEditMode ? 'PUT' : 'POST';
    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!response.ok) throw new Error((await response.json()).error || 'Thao tác thất bại');
        closeModal();
        await loadDocuments(currentCollection);
        showAlert('success', 'Thao tác thành công!');
    } catch (error) {
        console.error('Form submission error:', error);
        showAlert('error', `Lỗi: ${error.message}`);
    }
}

async function handleDelete(docId) {
    if (!confirm(`Bạn có chắc muốn xóa mục: ${docId}?`)) return;
    try {
        const response = await fetch(`/api/collections/${currentCollection}/${docId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error((await response.json()).error || 'Xóa thất bại.');
        await loadDocuments(currentCollection);
        showAlert('success', 'Xóa thành công!');
    } catch (error) {
        console.error('Delete error:', error);
        showAlert('error', `Lỗi: ${error.message}`);
    }
}

export async function loadCollectionData() {
    document.getElementById('add-new-btn').addEventListener('click', () => openModal('add'));
    document.getElementById('item-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    try { 
        await loadDocuments("items"); 
    } catch (error) {
        console.error("Error loading collection data:", error);
    }
}
