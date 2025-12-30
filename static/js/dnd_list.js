export function initializeDndList() {
    // Tìm đến phần tử danh sách <ul> có id là 'sortable-list'
    const list = document.getElementById('sortable-list');

    /**
     * Cập nhật lại tên (text content) của tất cả các mục trong danh sách
     * để phản ánh đúng vị trí hiện tại của chúng, giữ nguyên tên gốc.
     */
    function updateItemLabels() {
        const items = list.children;
        for (let i = 0; i < items.length; i++) {
            // Lấy tên gốc từ thuộc tính `data-name` của thẻ <li>
            const originalName = items[i].dataset.name;
            
            // Cập nhật nội dung, kết hợp vị trí mới và tên gốc
            items[i].textContent = `Vị trí ${i + 1}: ${originalName}`;
        }
    }

    // Nếu tìm thấy danh sách, khởi tạo Sortable và các chức năng khác
    if (list) {
        // 1. Cập nhật tên các mục ngay khi tải trang lần đầu tiên
        updateItemLabels();

        // 2. Khởi tạo SortableJS
        // Đảm bảo rằng thư viện Sortable đã được tải (ví dụ: trong index.html)
        if (typeof Sortable !== 'undefined') {
            new Sortable(list, {
                animation: 150, // Thời gian (ms) cho hiệu ứng sắp xếp
                ghostClass: 'ghost-item', // Tên lớp CSS cho "bóng ma" (placeholder)
                
                // 3. Lắng nghe sự kiện khi việc sắp xếp kết thúc
                onEnd: function (evt) {
                    // Sau khi kéo-thả xong, gọi hàm cập nhật lại tên của tất cả các mục
                    updateItemLabels();

                    // (Tùy chọn) In ra console để theo dõi
                    console.log(`Đã di chuyển '${evt.item.dataset.name}' từ vị trí ${evt.oldIndex + 1} đến ${evt.newIndex + 1}`);
                }
            });
        } else {
            console.error('Thư viện SortableJS chưa được tải.');
        }
    }
}
