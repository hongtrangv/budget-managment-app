import { formatCurrency, showAlert } from './utils.js';

// Store chart instance to prevent memory leaks
let currentChart = null;

/**
 * Switches the visible tab and updates its content by toggling the 'hidden' class.
 * @param {string} tabId The data-tab attribute of the target tab ('overview', 'expense-proportion', 'save-detail')
 */
async function switchTab(tabId) {
    // Hide all tab panes by adding the 'hidden' class
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.add('hidden');
    });

    // Deactivate all menu buttons
    document.querySelectorAll('.dashboard-menu-item').forEach(button => {
        button.classList.remove('active-tab-button'); 
    });

    // Show the target tab pane by removing the 'hidden' class
    const activePane = document.querySelector(`.tab-pane[data-tab='${tabId}']`);
    if (activePane) {
        activePane.classList.remove('hidden');
    }

    // Activate the target menu button
    const activeButton = document.querySelector(`.dashboard-menu-item[data-tab='${tabId}']`);
    if (activeButton) {
        activeButton.classList.add('active-tab-button');
    }

    // Destroy the previous chart before loading new data to prevent conflicts
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }

    // Load the data for the activated tab
    switch (tabId) {
        case 'overview':
            await renderSummaryChart();
            break;
        case 'expense-proportion':
            await renderExpensePieChart();
            break;
        case 'save-detail':
            await renderSavingsTable();
            break;
        case 'loan-detail':
            await renderLoansTable();
            break;
    }
}

/**
 * Fetches data and renders the main income/expense bar chart.
 */
async function renderSummaryChart() {
    try {
        const year = document.getElementById('home-year-select').value;
        const month = document.getElementById('home-month-select').value;
        const response = await fetch(`/api/dashboard/summary/${year}/${month}`);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const data = await response.json();
        
        const ctx = document.getElementById('summary-chart').getContext('2d');
        
        currentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Tổng Thu', 'Tổng Chi'],
                datasets: [{
                    label: 'Số tiền (VND)',
                    data: [data.income, data.expense],
                    backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)'],
                    borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { callback: value => formatCurrency(value) } } },
                plugins: { legend: { display: false } }
            }
        });

        const outstanding = data.income - data.expense;
        document.getElementById('outstanding').textContent = formatCurrency(outstanding);
        document.getElementById('chart-period-overview').textContent = `(Tháng ${month}/${year})`;

    } catch (error) {
        console.error("Error rendering summary chart:", error);
        showAlert('error', `Không thể tải biểu đồ Thu/Chi: ${error.message}`);
    }
}

/**
 * Fetches data and renders the expense category pie chart.
 */
async function renderExpensePieChart() {
     try {
        const year = document.getElementById('home-year-select').value;
        const month = document.getElementById('home-month-select').value;
        const response = await fetch(`/api/dashboard/pie/${year}/${month}`);
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
         document.getElementById('chart-period-expense').textContent = `(Tháng ${month}/${year})`;

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

async function renderLoansTable() {
    try {
        const response = await fetch(`/api/dashboard/loan`);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const data = await response.json();

        const tableBody = document.querySelector("#loan-table tbody");
        tableBody.innerHTML = ""; // Clear existing rows

        data.forEach((item, index) => {
            const row = document.createElement("tr");
            row.className = index % 2 === 0 ? 'bg-white' : 'bg-green-50';
            row.innerHTML = `
                <td class="py-3 px-4 text-center">${item.borrowerName}</td>
                <td class="py-3 px-4 text-left">${formatCurrency(item.principalAmount)}</td>
                <td class="py-3 px-4 text-left">${item.term}</td>
                <td class="py-3 px-4 text-center">${item.startDate}</td>
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

        // Add event listeners to the "Xem" buttons
        document.querySelectorAll('.view-payments-btn').forEach(button => {
            button.addEventListener('click', () => {
                const loanId = button.dataset.loanId;
                openPaymentsModal(loanId);
            });
        });

    } catch (error) {
        console.error("Error rendering loan table:", error);
        showAlert('error', `Không thể tải bảng chi tiết khoản vay: ${error.message}`);
    }
}

async function openPaymentsModal(loanId) {
    try {
        const response = await fetch(`/api/dashboard/loan/${loanId}/payments`);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const payments = await response.json();

        const modalPaymentHistory = document.getElementById("modal-payment-history");
        modalPaymentHistory.innerHTML = ""; // Clear previous content

        if (payments.length === 0) {
            modalPaymentHistory.innerHTML = "<p>Không có lịch sử trả lãi cho khoản vay này.</p>";
        } else {
            payments.forEach(payment => {
                const paymentDiv = document.createElement("div");
                paymentDiv.className = "py-2 border-b";
                paymentDiv.innerHTML = `
                    <p><strong>Ngày trả:</strong> ${payment.paidDate}</p>
                    <p><strong>Số tiền gốc:</strong> ${formatCurrency(payment.principalPaid)}</p>
                    <p><strong>Số tiền lãi:</strong> ${formatCurrency(payment.interestPaid)}</p>
                    <p><strong>Tổng số tiền phải trả:</strong> ${formatCurrency(payment.totalPaid)}</p>
                `;                
                modalPaymentHistory.appendChild(paymentDiv);
            });
        }

        // Show the modal
        const modal = document.getElementById("payments-modal");
        modal.classList.remove('hidden');

    } catch (error) {
        console.error("Error fetching loan payments:", error);
        showAlert('error', `Không thể tải lịch sử trả lãi: ${error.message}`);
    }
}


/**
 * Main function to initialize the home page.
 * Sets up filters, attaches event listeners ONCE, and loads the default tab.
 */
export async function loadHomePage() {
    try {
        // --- Setup Filters ---
        const yearSelect = document.getElementById('home-year-select');
        const monthSelect = document.getElementById('home-month-select');

        const response = await fetch(`/api/dashboard/years`);
        if (!response.ok) throw new Error('Could not fetch years');
        const years = await response.json();
        const currentYear = new Date().getFullYear().toString();
        yearSelect.innerHTML = years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>Năm ${y}</option>`).join('');
        
        let monthOptions = '';
        for (let i = 1; i <= 12; i++) {
            monthOptions += `<option value="${i}" ${i === new Date().getMonth() + 1 ? 'selected' : ''}>Tháng ${i}</option>`;
        }
        monthSelect.innerHTML = monthOptions;

        // --- Attach Event Listeners ONCE ---
        const dashboardMenu = document.getElementById('dashboard-menu');
        if (!dashboardMenu.dataset.eventsAttached) {
            dashboardMenu.addEventListener('click', (e) => {
                const button = e.target.closest('.dashboard-menu-item');
                if (button && button.dataset.tab) {
                    switchTab(button.dataset.tab);
                }
            });
            
            const handleFilterChange = () => {
                const activeButton = document.querySelector('.dashboard-menu-item.active-tab-button');
                if (activeButton) {
                    switchTab(activeButton.dataset.tab);
                }
            };

            yearSelect.addEventListener('change', handleFilterChange);
            monthSelect.addEventListener('change', handleFilterChange);

            dashboardMenu.dataset.eventsAttached = 'true'; // Mark as attached
        }

        // --- Modal Close --- 
        const modal = document.getElementById('payments-modal');
        const closeButton = modal.querySelector(".modal-close");
        const overlay = modal.querySelector(".modal-overlay");

        const closeModal = () => modal.classList.add('hidden');

        closeButton.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        // --- Load Initial Tab ---
        await switchTab('overview');

    } catch (error) {
        console.error('Failed to initialize home page:', error);
        showAlert('error', `Lỗi khởi tạo trang chủ: ${error.message}`);
    }
}
