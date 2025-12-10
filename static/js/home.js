import { createCategoryChart, createSummaryChart } from './charts.js';
import { formatCurrency, showAlert,formatDate,formatDateToYMD } from './utils.js';

// Chart instance
let currentChart = null;
const now = new Date();
const currentMonth = now.getMonth() + 1; // getMonth() trả về giá trị từ 0-11, nên cần +1
const currentYear = now.getFullYear();
// --- LOAN PAGINATION STATE ---
let loanCurrentPage = 1;
const LOAN_PAGE_SIZE = 5; // Display 5 loans per page
// An array to store the document ID of the first item of each page.
// pageStartDocs[0] is always null (for the first page)
// pageStartDocs[1] is the ID of the first doc on page 2, etc.
let loanPageStartDocs = [null]; 
/**
 * Fetches data and renders the expense category pie chart.
 */
async function renderExpensePieChart() {
     try {       
        document.getElementById('current_date').innerHTML= ' tháng '+currentMonth +' năm '+currentYear;
        const response = await fetch(`/api/dashboard/pie/${currentYear}/${currentMonth}`);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const data = await response.json();

        const ctx = document.getElementById('expense-category-chart').getContext('2d');

        currentChart = new Chart(ctx, {
             type: 'doughnut',
            data: {
                labels: data.map(item => item.name),
                datasets: [{
                    data: data.map(item => item.value),
                    backgroundColor: data.map(() => `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.7)`),
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                 plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label || ''}: ${formatCurrency(context.raw || 0)}`
                        }
                    },
                    datalabels: {
                        color: 'white',
                        formatter: (value, ctx) => {
                            const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? (value / total) * 100 : 0;
                            return percentage > 5 ? percentage.toFixed(1) + '%' : '';
                        }
                    }
                }
            }
        });
         //.getElementById('chart-period-expense').textContent = `(Tháng ${month}/${year})`;

    } catch (error) {
        console.error("Error rendering expense pie chart:", error);
        showAlert('error', `Không thể tải biểu đồ tỷ trọng chi: ${error.message}`);
    }
}

/**
 * Fetches data and renders the savings table with expiry status.
 */
async function renderSavingsTable() {
    try {
        const year = document.getElementById('home-year-select').value;
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

/**
 * Fetches and renders a specific page of the loans table.
 * @param {'first' | 'next' | 'prev'} direction - The direction to paginate.
 */
async function loadAndRenderLoans(direction) {
    const prevButton = document.getElementById('loan-prev-page');
    const nextButton = document.getElementById('loan-next-page');

    let startAfterDocId = null;

    if (direction === 'next') {
        loanCurrentPage++;
        startAfterDocId = loanPageStartDocs[loanCurrentPage -1];
    } else if (direction === 'prev') {
        loanCurrentPage--;
        startAfterDocId = loanPageStartDocs[loanCurrentPage-1];
    } else { // 'first'
        loanCurrentPage = 1;
        loanPageStartDocs = [null];
        startAfterDocId = null;
    }

    try {
        const url = `/api/dashboard/loan?pageSize=${LOAN_PAGE_SIZE}` + (startAfterDocId ? `&startAfter=${startAfterDocId}` : '');
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const result = await response.json();
        const loans = result.data;
        const lastDocId = result.last_doc_id;

        const tableBody = document.querySelector("#loan-table tbody");
        tableBody.innerHTML = ""; // Clear existing rows

        loans.forEach((item, index) => {
            const row = document.createElement("tr");
            row.className = index % 2 === 0 ? 'bg-white' : 'bg-green-50';
            row.innerHTML = `
                <td class="py-3 px-4 text-center">${item.borrowerName}</td>
                <td class="py-3 px-4 text-right">${formatCurrency(item.principalAmount)}</td>
                <td class="py-3 px-4 text-right">${item.term}</td>                
                <td class="py-3 px-4 text-center">${formatDate(item.startDate)}</td>
                <td class="py-3 px-4 text-right">${formatCurrency(item.outstanding)}</td>
                <td class="py-3 px-4 text-center"><button class="p-1 hover:bg-gray-200 rounded-full view-payments-btn" data-loan-id="${item.id}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" role="img" aria-hidden="false" focusable="false">
                    <title>View</title>
                    <path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
                            d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6" fill="none"/>
                    </svg>
                </button></td>
            `;
            tableBody.appendChild(row);
        });

        // Set the start ID for the *next* page if it doesn't already exist
        if (lastDocId && loanPageStartDocs.length <= loanCurrentPage) {
            loanPageStartDocs.push(lastDocId);
        }

        // Update button states
        prevButton.disabled = loanCurrentPage <= 1;
        // Disable 'next' if we received fewer items than the page size, meaning we're on the last page.
        nextButton.disabled = loans.length < LOAN_PAGE_SIZE;

        // Add event listeners to the new "View" buttons
        document.querySelectorAll('.view-payments-btn').forEach(button => {
            button.addEventListener('click', () => {
                openPaymentsModal(button.dataset.loanId);
            });
        });
        const modal = document.getElementById('payments-modal');
        modal.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
            el.addEventListener('click', () => modal.classList.add('hidden'));
        });

    } catch (error) {
        console.error("Error rendering loan table:", error);
        showAlert('error', `Không thể tải bảng chi tiết khoản vay: ${error.message}`);
        prevButton.disabled = true;
        nextButton.disabled = true;
    }
}

async function openPaymentsModal(loanId) {
    try {
        const response = await fetch(`/api/dashboard/loan/${loanId}/payments`);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const payments = await response.json();

        const paymentHistoryBody = document.getElementById("payment-history-table-body");
        paymentHistoryBody.innerHTML = ""; // Clear previous content

        if (payments.length === 0) {
            paymentHistoryBody.innerHTML = "<tr><td colspan='4' class='text-center p-4'>Không có lịch sử trả lãi cho khoản vay này.</td></tr>";
        } else {
            payments.forEach((payment,index) => {
                const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-green-50';
                const row = document.createElement('tr');
                row.className = rowClass;
                row.innerHTML = `
                    <td class="py-3 px-4 text-center">${formatDateToYMD(payment.paidDate)}</td>
                    <td class="py-3 px-4 text-right">${formatCurrency(payment.principalPaid)}</td>
                    <td class="py-3 px-4 text-right">${formatCurrency(payment.interestPaid)}</td>
                    <td class="py-3 px-4 text-right">${formatCurrency(payment.totalPaid)}</td>
                `;
                paymentHistoryBody.appendChild(row);
            });
        }

        const modal = document.getElementById("payments-modal");
        modal.classList.remove('hidden');

    } catch (error) {
        console.error("Error fetching loan payments:", error);
        showAlert('error', `Không thể tải lịch sử trả lãi: ${error.message}`);
    }
}

/**
 * Main function to initialize the home page.
 */
export async function loadHomePage() {
    try {       
        LoadInfomation();
    } catch (error) {
        console.error('Failed to initialize home page:', error);
        showAlert('error', `Lỗi khởi tạo trang chủ: ${error.message}`);
    }
}
async function totalBook(){
    const [booksResponse] = await Promise.all([        
        fetch('/api/books')
    ]);
    const allBooks = await booksResponse.json();
    const books = document.getElementById('total-books');
    books.textContent = allBooks.length + ' cuốn';
}
async function totalSaving(){
    const response = await fetch(`/api/dashboard/save`);
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    const data = await response.json();
    let total = 0;
    let totalYield = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    data.forEach((item, index) => {
        const startDate = new Date(item.date); // Assumes date format is parseable by new Date() e.g., 'YYYY-MM-DD'                
        const rate = item.rate;           
        const days = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));;
        
        const interestYield = Math.round(item.amount * rate * days / 36500,0);
        totalYield += interestYield;
        total += item.amount;
        
    });
    const totalSaving = document.getElementById('total-savings');
    totalSaving.textContent = formatCurrency(total);
    const totalYieldElement = document.getElementById('total-interest');
    totalYieldElement.textContent = formatCurrency(totalYield);
}
async function loadRecentTransactions(){

    const response = await fetch(`/api/collections/Year/${currentYear}/Months/${currentMonth}/Types/Chi/recent?limit=5`);
    const data = await response.json();
    const table = document.getElementById("recent-transactions");
    table.innerHTML = ""; // Clear existing rows    
    let tableHeader =`<table class="min-w-full bg-white">
                        <thead class="bg-green-600 text-white">
                            <tr>
                                <th class="py-3 px-4 text-center">Ngày</th>
                                <th class="py-3 px-4 text-center">Nội dung</th>                                
                                <th class="py-3 px-4 text-center">Số tiền</th>
                            </tr>
                        </thead><tbody>`;    
    data.forEach((item, index) => {
        let row = `<tr class="${index % 2 === 0 ? 'bg-white' : 'bg-green-50'}">`;        
        row += `<td class="py-3 px-4 text-center">${formatDate(item.date)}</td>
            <td class="py-3 px-4 text-center">${item.name}</td>
            <td class="py-3 px-4 text-center">${formatCurrency(item.amount)}</td> </tr>               
        `;
        tableHeader += row;        
    }); 
    tableHeader += `</tbody></table>`
    table.innerHTML = tableHeader;      
}
async function loadChart(){
    const response = await fetch(`/api/dashboard/summary/${currentYear}/${currentMonth}`);
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    const data = await response.json();
    
    const income = document.getElementById('monthly-income');
    const expense = document.getElementById('monthly-expense');
    const outstanding = document.getElementById('balance')
    income.textContent = formatCurrency(data.income);
    expense.textContent = formatCurrency(data.expense);
    outstanding.textContent = formatCurrency(data.income- data.expense);
    
    // Lấy tổng thu trong tháng trước
    let previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    let yearForPreviousMonth = currentMonth === 1 ? currentYear - 1 : currentYear;    
    const preResponse = await fetch(`/api/dashboard/summary/${yearForPreviousMonth}/${previousMonth}`);
    if (!preResponse.ok) throw new Error(`API error: ${preResponse.statusText}`);
    const prevData = await preResponse.json();
    
    // So sánh và cập nhật thu nhập
    const incomeChangeElement = document.getElementById('income-change');
    const incomeChange = ((data.income - prevData.income) / (prevData.income || 1)) * 100;
    incomeChangeElement.classList.remove('text-green-600', 'text-red-600');
    if (incomeChange > 0) {
        incomeChangeElement.textContent = `▲ ${incomeChange.toFixed(1)}% so với tháng trước`;
        incomeChangeElement.classList.add('text-green-600');
    } else if (incomeChange < 0) {
        incomeChangeElement.textContent = `▼ ${Math.abs(incomeChange).toFixed(1)}% so với tháng trước`;
        incomeChangeElement.classList.add('text-red-600');
    } else {
        incomeChangeElement.textContent = `Không đổi so với tháng trước`;
    }
}
async function LoadInfomation(){
    // Lấy thông tin tổng số sách
    totalBook();
    // Lấy tổng chi trong tháng
    loadChart();    
    // Lấy danh sách khoản tiết kiệm
    loadAndRenderLoans('first');
    // Biểu đồ thu chi
    renderExpensePieChart(currentMonth,currentYear);
    // Lấy thông tin tiết kiệm
    totalSaving();
    // Lấy thông tin các giao dịch gần đây top 5
    loadRecentTransactions();
}

    