/**
 * Khởi tạo chức năng cho danh sách Kéo và Thả (Drag and Drop).
 * Hàm này sẽ được gọi bởi router của SPA sau khi nội dung trang được tải.
 */
export function initializeDndList() {
    // Tìm đến phần tử danh sách <ul> có id là 'sortable-list'
    const list = document.getElementById('sortable-list');

    /**
     * Cập nhật lại tên (text content) của tất cả các mục trong danh sách
     * để phản ánh đúng vị trí hiện tại của chúng, giữ nguyên tên gốc.
     */
    function updateItemLabels() {
        // Kiểm tra nếu list không tồn tại thì thoát sớm
        if (!list) return;
        const items = list.children;
        for (let i = 0; i < items.length; i++) {
            const originalName = items[i].dataset.name;
            items[i].textContent = `Vị trí ${i + 1}: ${originalName}`;
        }
    }

    // Nếu tìm thấy danh sách, khởi tạo Sortable và các chức năng khác
    if (list) {
        // 1. Cập nhật tên các mục ngay khi tải trang lần đầu tiên
        updateItemLabels();

        // 2. Khởi tạo SortableJS
        new Sortable(list, {
            animation: 150,
            ghostClass: 'ghost-item',
            // Hàm được gọi khi kết thúc kéo thả
            onEnd: function (evt) {
                // Cập nhật lại nhãn vị trí sau khi sắp xếp
                updateItemLabels();
                console.log(`Đã di chuyển '${evt.item.dataset.name}' từ vị trí ${evt.oldIndex + 1} đến ${evt.newIndex + 1}`);
            }
        });
    }
}

// === CÁC HÀM XỬ LÝ SỰ KIỆN CHO BUTTON (GLOBAL SCOPE) ===
// Các hàm này được đặt ở ngoài `DOMContentLoaded` để chúng có thể được gọi từ `onclick` trong HTML.

/**
 * Xử lý sự kiện khi nhấn nút "Lưu thay đổi".
 */
function handleSaveChanges() {
    console.log('Action: Save Changes');
    const list = document.getElementById('sortable-list');
    if (!list) return;
    
    // Lấy thứ tự hiện tại của các mục
    const items = Array.from(list.children).map((item, index) => {
        return `${index + 1}: ${item.dataset.name}`;
    });
    
    alert('Đã nhấn Lưu thay đổi!\nThứ tự hiện tại:\n' + items.join('\n'));
    // Trong ứng dụng thực tế, bạn sẽ gửi `items` này đến server qua một API tại đây.
}

/**
 * Xử lý sự kiện khi nhấn nút "Hủy bỏ".
 */
function handleCancel() {
    console.log('Action: Cancel');
    alert('Đã nhấn Hủy bỏ! Thao tác đã được hoàn tác.');
    // Trong ứng dụng thực tế, bạn có thể tải lại trạng thái ban đầu hoặc điều hướng đi nơi khác.
}

/**
 * Xử lý sự kiện khi nhấn nút "Xóa".
 */
function handleDelete() {
    console.log('Action: Delete');
    // Hỏi xác nhận trước khi xóa
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách này không?')) {
        alert('Đã nhấn Xóa! Danh sách sẽ bị xóa.');
        const list = document.getElementById('sortable-list');
        if (list) {
            list.innerHTML = ''; // Xóa toàn bộ các mục trong danh sách
        }
        // Trong ứng dụng thực tế, bạn sẽ gọi API để xóa dữ liệu trên server.
    } else {
        alert('Thao tác xóa đã được hủy.');
    }
}
