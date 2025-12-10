/**
 * Chuyển đổi một số điểm thành một chuỗi các biểu tượng ngôi sao.
 * @param {number} rating - Điểm số, ví dụ: 3.
 * @param {number} [maxStars=5] - Số lượng sao tối đa.
 * @returns {string} - Một chuỗi HTML các thẻ span chứa ngôi sao.
 */
export function renderStars(rating, maxStars = 5) {
    const numRating = Number(rating) || 0;
    let stars = '';
    for (let i = 1; i <= maxStars; i++) {
        // Sử dụng lớp text-yellow-500 của Tailwind cho sao được tô màu
        stars += i <= numRating 
            ? '<span class="text-yellow-500 text-xl">★</span>' 
            : '<span class="text-gray-300 text-xl">☆</span>';
    }
    return `<div class="flex">${stars}</div>`;
}

/**
 * Tạo một nhóm các ngôi sao có thể nhấp để nhập liệu.
 * @param {string} name - Tên của trường input.
 * @param {number} [currentValue=0] - Giá trị hiện tại của điểm số.
 * @param {number} [maxStars=5] - Số lượng sao tối đa.
 * @returns {HTMLElement} - Một div chứa các ngôi sao để nhập liệu.
 */
export function createStarRatingInput(name, currentValue = 0, maxStars = 5) {
    const container = document.createElement('div');
    container.className = 'star-rating-input flex';
    container.dataset.name = name; // Lưu tên để truy xuất sau này

    for (let i = 1; i <= maxStars; i++) {
        const star = document.createElement('span');
        star.className = 'cursor-pointer text-2xl';
        star.dataset.value = i;
        star.innerHTML = i <= currentValue ? '★' : '☆';
        star.style.color = i <= currentValue ? '#FBBF24' : '#D1D5DB'; // Màu vàng và xám

        star.addEventListener('mouseover', () => {
            // Highlight các sao khi di chuột qua
            const allStars = container.querySelectorAll('span');
            allStars.forEach(s => {
                s.innerHTML = s.dataset.value <= star.dataset.value ? '★' : '☆';
                s.style.color = s.dataset.value <= star.dataset.value ? '#FBBF24' : '#D1D5DB';
            });
        });

        star.addEventListener('mouseout', () => {
            // Khôi phục trạng thái hiện tại khi rời chuột
            const currentRating = container.dataset.rating || 0;
            const allStars = container.querySelectorAll('span');
            allStars.forEach(s => {
                s.innerHTML = s.dataset.value <= currentRating ? '★' : '☆';
                 s.style.color = s.dataset.value <= currentRating ? '#FBBF24' : '#D1D5DB';
            });
        });

        star.addEventListener('click', () => {
            // Đặt giá trị khi nhấp
            container.dataset.rating = star.dataset.value;
        });

        container.appendChild(star);
    }
     // Đặt giá trị ban đầu
    container.dataset.rating = currentValue;
    return container;
}
