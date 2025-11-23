function createTable(documents, headers) {
    if (!documents || documents.length === 0) {
        return '<p class="text-center text-gray-500">Không tìm thấy mục nào.</p>';
    }

    let html = '<div class="shadow-lg rounded-lg">';
    html += '<table class="min-w-full bg-white">';
    html += '<thead class="bg-green-600 text-white"><tr>';

    // Tạo tiêu đề bảng từ mảng headers
    headers.forEach(key => {
        html += `<th class="py-3 px-4 text-left uppercase font-semibold text-sm">${key}</th>`;
    });
    html += '<th class="py-3 px-4 text-right uppercase font-semibold text-sm">Hành động</th>'; // Cột hành động

    html += '</tr></thead><tbody class="text-gray-700">';

    // Tạo các hàng cho mỗi tài liệu
    documents.forEach((doc, index) => {
        const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-green-50';
        const docId = doc['Danh mục thu chi'];         
        html += `<tr class="${rowClass}" data-id="${docId}">`;
        
        // Lặp lại danh sách headers để đảm bảo thứ tự cột nhất quán
        headers.forEach(header => {
            const value = doc[header] || ''; 
            html += `<td class="py-3 px-4">${value}</td>`;
        });

        // Thêm các nút biểu tượng
        html += `<td class="py-3 px-4 flex items-center justify-end space-x-2">`;
        html += `<button class="p-1 hover:bg-gray-200 rounded-full edit-btn" data-id="${docId}" title="Sửa">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                        <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
                    </svg>
                 </button>`;
        html += `<button class="p-1 hover:bg-gray-200 rounded-full delete-btn" data-id="${docId}" title="Xóa">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" />
                    </svg>
                 </button>`;
        html += `</td>`;

        html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
}
