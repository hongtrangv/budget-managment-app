// static/js/excel_upload.js

import { showAlert } from './utils.js';

export function loadExcelUploadPage() {
    const form = document.getElementById('excel-upload-form');
    const fileInput = document.getElementById('excel-file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const dataContainer = document.getElementById('excel-data-container');

    if (!form) return; // Thoát nếu không tìm thấy form

    // Hiển thị tên tệp đã chọn
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = fileInput.files[0].name;
        } else {
            fileNameDisplay.textContent = 'XLS, XLSX';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Ngăn form gửi theo cách truyền thống

        if (fileInput.files.length === 0) {
            showAlert('error', 'Vui lòng chọn một tệp Excel để tải lên.');
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        // Hiển thị trạng thái đang tải
        dataContainer.innerHTML = '<p class="text-center text-gray-500">Đang xử lý tệp, vui lòng chờ...</p>';

        try {
            const response = await fetch('/api/excel/upload', {
                method: 'POST',
                body: formData, // Gửi FormData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Đã xảy ra lỗi không xác định');
            }

            // Nếu thành công, hiển thị bảng dữ liệu
            renderDataTable(result.columns, result.data);
            showAlert('success', `Đã xử lý thành công tệp: ${file.name}`);

        } catch (error) {
            console.error('Error uploading or processing file:', error);
            dataContainer.innerHTML = ''; // Xóa thông báo đang tải
            showAlert('error', `Lỗi: ${error.message}`);
        }
    });

    function renderDataTable(columns, data) {
        if (!columns || !data) {
            dataContainer.innerHTML = '<p class="text-center text-red-500">Không nhận được dữ liệu hợp lệ từ máy chủ.</p>';
            return;
        }

        let table = '<div class="overflow-x-auto relative shadow-md sm:rounded-lg"><table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">';
        
        // Tạo header của bảng
        table += '<thead class="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">';
        table += '<tr>';
        columns.forEach(col => {
            table += `<th scope="col" class="py-3 px-6">${col}</th>`;
        });
        table += '</tr></thead>';

        // Tạo body của bảng
        table += '<tbody>';
        data.forEach(row => {
            table += '<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">';
            columns.forEach(col => {
                table += `<td class="py-4 px-6">${row[col]}</td>`;
            });
            table += '</tr>';
        });
        table += '</tbody></table></div>';

        dataContainer.innerHTML = table;
    }
}
