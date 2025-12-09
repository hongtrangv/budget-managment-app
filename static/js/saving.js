import { formatCurrency, showAlert,formatDate,formatDateToYMD } from './utils.js';

async function renderSavingsTable() {
    try {
        const year = new Date().getFullYear();
        const response = await fetch(`/api/dashboard/save`);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const data = await response.json();
        
        let html = '<div class="overflow-x-auto shadow-lg rounded-lg"><table class="min-w-full bg-white">';
        html += `<thead class="bg-green-600 text-white"><tr>
                        <th class="py-3 px-4 text-left">Số tiền</th>
                        <th class="py-3 px-4 text-left">Lãi suất</th>
                        <th class="py-3 px-4 text-left">Kỳ hạn</th>
                        <th class="py-3 px-4 text-left">Ngày gửi</th>
                        <th class="py-3 px-4 text-left">Lợi tức (VND) </th>
                        <th class="py-3 px-4 text-left">Ghi chú</th>
                        <th class="py-3 px-4 text-left">Trạng thái</th>
                 </tr></thead><tbody>`;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to midnight for accurate date comparison

        data.forEach((item, index) => {
            const startDate = new Date(item.date); // Assumes date format is parseable by new Date() e.g., 'YYYY-MM-DD'
            const termInMonths = parseInt(item.term, 10);
            
            const expiryDate = new Date(startDate);
            expiryDate.setMonth(expiryDate.getMonth() + termInMonths);
            expiryDate.setHours(0, 0, 0, 0);

            const timeDiff = expiryDate.getTime() - today.getTime();
            const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

            let statusText;
            let statusClass;
            const rate = item.rate;           
            const days = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));;
            
            if (dayDiff < 0) {
                days = Math.ceil((expiryDate - startDate) / (1000 * 60 * 60 * 24));
                statusText = 'Quá hạn tất toán';
                statusClass = 'text-red-600 font-bold';
            } else if (dayDiff <= 5) {
                statusText = `Sắp đáo hạn (còn ${dayDiff} ngày)`;
                statusClass = 'text-yellow-600 font-bold';
            } else {
                statusText = 'Chưa đến hạn';
                statusClass = 'text-green-600';
            }
            const interestYield = Math.round(item.amount * rate * days / 36500,0).toLocaleString('vi-VN');
            html += `<tr class="${index % 2 === 0 ? 'bg-white' : 'bg-green-50'}">`;
            html += `<td class="py-3 px-4">${formatCurrency(item.amount)}</td>`;
            html += `<td class="py-3 px-4">${item.rate}%</td>`;
            html += `<td class="py-3 px-4">${item.term} tháng</td>`;
            html += `<td class="py-3 px-4">${item.date}</td>`;
            html += `<td class="py-3 px-4">${interestYield}</td>`;
            html += `<td class="py-3 px-4">${item.note || ''}</td>`;
            html += `<td class="py-3 px-4 ${statusClass}">${statusText}</td>`;
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        document.getElementById('data-save').innerHTML = html;
        document.getElementById('chart-period-save').textContent = `(Năm ${year})`;

    } catch (error) {
        console.error("Error rendering savings table:", error);
        showAlert('error', `Không thể tải bảng tiết kiệm: ${error.message}`);
    }
}

export async function loadSavingPage(){
    renderSavingsTable();
}