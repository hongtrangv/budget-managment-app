// static/js/collections.js

// Import các hàm cần thiết từ utils.js
// Giả sử createTable cũng nằm trong utils.js hoặc được tải toàn cục
import { createTable, createDynamicModal, authenticatedFetch, showAlert } from './utils.js';

// --- QUẢN LÝ TRẠNG THÁI ---
let currentPage = 1;
let totalPages = 1;
let lastDocIds = [null]; // Lưu trữ ID tài liệu cuối cùng của mỗi trang để phân trang Firestore

// --- LẤY VÀ HIỂN THỊ DỮ LIỆU ---

/**
 * Lấy danh sách tài liệu đã phân trang từ collection được chỉ định.
 * @param {number} page - Số trang cần lấy.
 */
async function fetchCollectionData(page = 1) {
    try {
        const contentDiv = document.getElementById('collections-content');
        const collection = contentDiv.dataset.collection;
        if (!collection) {
            throw new Error('Tên collection không được định nghĩa trong thuộc tính data-collection.');
        }

        const pageSize = 10;
        const startAfter = lastDocIds[page - 1] || null;
        let url = `/api/collections/${collection}/documents?pageSize=${pageSize}`;
        if (startAfter) {
            url += `&startAfter=${startAfter}`;
        }

        // Yêu cầu GET cho collections là công khai, không cần header xác thực
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Lỗi HTTP! Trạng thái: ${response.status}`);
        }
        
        const result = await response.json();

        const headersString = contentDiv.dataset.headers;
        const headerObject = JSON.parse(headersString);

        // Hàm createTable sẽ render dữ liệu.
        // Nó nhận một hàm callback để xử lý các hành động như 'edit' và 'delete'.
        const table = createTable(result.data, headerObject, page, pageSize, (action, docId, data) => handleAction(action, docId, data, collection));
        contentDiv.innerHTML = ''; 
        contentDiv.appendChild(table);

        // Cập nhật trạng thái phân trang
        if (result.last_doc_id && page < result.total_pages) {
            if (lastDocIds.length <= page) {
                lastDocIds.push(result.last_doc_id);
            }
        }
        currentPage = page;
        totalPages = result.total_pages;
        updatePaginationUI(result.total_records);

    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu collection:', error);
        showAlert('error', `Không thể tải dữ liệu: ${error.message}`);
    }
}

// --- XỬ LÝ HÀNH ĐỘNG ---

/**
 * Xử lý các hành động được kích hoạt từ bảng (ví dụ: sửa, xóa).
 * @param {'edit' | 'delete'} action - Hành động cần thực hiện.
 * @param {string} docId - ID của tài liệu cần xử lý.
 * @param {object} data - Dữ liệu của hàng tương ứng.
 * @param {string} collection - Tên của collection.
 */
function handleAction(action, docId, data, collection) {
    const contentDiv = document.getElementById('collections-content');
    const headersString = contentDiv.dataset.headers;
    const headerObject = JSON.parse(headersString);

    if (action === 'edit') {
        // Mở modal động ở chế độ 'edit'
        createDynamicModal({
            mode: 'edit',
            headers: headerObject,
            data: data,
            apiUrl: `/api/collections/${collection}`, // URL API cơ sở cho PUT
            editAction: 'UPDATE_COLLECTION_DOCUMENT',
            docId: docId,
            onComplete: () => fetchCollectionData(currentPage) // Tải lại dữ liệu sau khi hoàn tất
        });
    } else if (action === 'delete') {
        // Hiển thị hộp thoại xác nhận trước khi xóa
        if (confirm('Bạn có chắc chắn muốn xóa mục này không?')) {
            deleteDocument(collection, docId);
        }
    }
}

/**
 * Gọi API để xóa một tài liệu cụ thể.
 * @param {string} collection - Tên của collection.
 * @param {string} docId - ID của tài liệu cần xóa.
 */
async function deleteDocument(collection, docId) {
    try {
        // Lưu ý: URL đã được sửa ở đây để khớp với route của backend
        await authenticatedFetch(`/api/collections/${collection}/${docId}`, {
            method: 'DELETE',
            headers: { 'X-Action-Identifier': 'DELETE_COLLECTION_DOCUMENT' } 
        });
        showAlert('success', 'Đã xóa thành công!');
        // Tải lại trang hiện tại.
        fetchCollectionData(currentPage);
    } catch (error) {
        // Thông báo lỗi đã được xử lý bởi authenticatedFetch
        console.error('Lỗi khi xóa tài liệu:', error);
    }
}

// --- CÀI ĐẶT GIAO DIỆN VÀ LẮNG NGHE SỰ KIỆN ---

/**
 * Cập nhật giao diện của các nút điều khiển phân trang.
 * @param {number} totalRecords - Tổng số bản ghi trong collection.
 */
function updatePaginationUI(totalRecords) {
    const prevButton = document.getElementById('category-prev-page');
    const nextButton = document.getElementById('category-next-page');
    const pageInfo = document.getElementById('category-page-info');

    if (pageInfo) {
        pageInfo.textContent = `Trang ${currentPage} / ${totalPages} | Tổng: ${totalRecords}`;
    }
    if (prevButton) {
        prevButton.disabled = currentPage <= 1;
    }
    if (nextButton) {
        nextButton.disabled = currentPage >= totalPages;
    }
}

/**
 * Cài đặt tất cả các trình lắng nghe sự kiện cần thiết cho trang.
 */
function setupEventListeners() {
    const contentDiv = document.getElementById('collections-content');
    if (!contentDiv) return;

    const collection = contentDiv.dataset.collection;
    const headersString = contentDiv.dataset.headers;

    // Nút phân trang
    document.getElementById('category-prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) {
            fetchCollectionData(currentPage - 1);
        }
    });
    document.getElementById('category-next-page')?.addEventListener('click', () => {
        if (currentPage < totalPages) {
            fetchCollectionData(currentPage + 1);
        }
    });

    // Nút "Thêm mới"
    document.getElementById('add-new-item-btn')?.addEventListener('click', () => {
        if (!headersString) {
            showAlert('error', 'Thiếu cấu hình header.');
            return;
        }
        const headerObject = JSON.parse(headersString);

        // Mở modal động ở chế độ 'add'
        createDynamicModal({
            mode: 'add',
            headers: headerObject,
            apiUrl: `/api/collections/${collection}/documents`, // URL API cho POST
            addAction: 'ADD_COLLECTION_DOCUMENT',
            onComplete: () => {
                // Chuyển về trang đầu tiên để xem mục mới
                lastDocIds = [null]; 
                fetchCollectionData(1);
            }
        });
    });
}

// --- KHỞI TẠO ---
export function loadCategoryPage() {
    currentPage = 1;
    totalPages = 1;
    lastDocIds = [null];
    fetchCollectionData(1);
    setupEventListeners(); // Ensure listeners are set up once
}
// document.addEventListener('DOMContentLoaded', () => {
//     // Lấy dữ liệu ban đầu và cài đặt trình lắng nghe sự kiện khi DOM đã tải xong.
//     fetchCollectionData(1);
//     setupEventListeners();
// });
