import { formatCurrency } from './utils.js';

let homeChart = null;
let chartActive = 'home';

function setupEventListeners() {
    document.querySelector('button[data-tab="overview"]').addEventListener('click', () => loadHomePage('home'));
    document.querySelector('button[data-tab="expense-proportion"]').addEventListener('click', () => loadHomePage('pie'));
    document.querySelector('button[data-tab="save-detail"]').addEventListener('click', () => loadHomePage('save'));
}

function switchDashboardView(viewId) {
    document.querySelectorAll('.dashboard-view').forEach(view => view.classList.add('hidden'));
    document.querySelectorAll('.dashboard-menu-item').forEach(item => {
        item.classList.remove('text-blue-600', 'border-blue-500');
        item.classList.add('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300', 'border-transparent');
    });
    const activeView = document.getElementById(viewId);
    if (activeView) activeView.classList.remove('hidden');
    const activeButton = document.querySelector(`.dashboard-menu-item[data-view='${viewId}']`);
    if (activeButton) {
        activeButton.classList.add('text-blue-600', 'border-blue-500');
        activeButton.classList.remove('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300', 'border-transparent');
    }
    if (viewId === 'content-overview') updateHomeChart();
    else if (viewId === 'content-expense-proportion') updatePieChart();
}

async function updatePieChart() {
    try {
        chartActive = 'pie';
        document.getElementById('content-expense-proportion').classList.remove('hidden');
        document.getElementById('content-overview').classList.add('hidden');
        document.getElementById('content-data-save').classList.add('hidden');
        const yearSelect = document.getElementById('home-year-select').value;
        const monthSelect = document.getElementById('home-month-select').value;
        const response = await fetch(`/api/dashboard/pie/${yearSelect}/${monthSelect}`);
        if (!response.ok) throw new Error(`API call failed with status ${response.status}`);
        const data = await response.json();
        const ctx = document.getElementById('expense-category-chart')?.getContext('2d');
        if (!ctx) return;
        if (homeChart) homeChart.destroy();
        const labels = data.map(item => item.name);
        const values = data.map(item => item.value);
        const total = values.reduce((a, b) => a + b, 0);
        const bgColors = values.map(() => `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.7)`);
        const borderColors = bgColors.map(c => c.replace("0.7", "1"));
        homeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 20, padding: 15, font: { size: 14, family: '\"Be Vietnam Pro\", sans-serif' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label || ''}: ${formatCurrency(context.raw || 0)}`
                        }
                    },
                    datalabels: {
                        color: 'white',
                        anchor: 'end',
                        align: 'start',
                        offset: -20,
                        borderRadius: 4,
                        backgroundColor: (ctx) => ctx.dataset.backgroundColor[ctx.dataIndex] + 'aa',
                        font: { weight: 'bold' },
                        formatter: (value, ctx) => {
                            const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            if (total === 0) return '0.0%';
                            const percentage = (value / total) * 100;
                            return percentage > 5 ? percentage.toFixed(1) + '%' : '';
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error rendering expense-category-chart:", error);
        const chartContainer = document.getElementById('expense-category-chart')?.parentElement;
        if (chartContainer) chartContainer.innerHTML = `<p class="text-center text-red-500">Không thể tải dữ liệu biểu đồ. Lỗi: ${error.message}</p>`;
    }
}

async function updateHomeChart() {
    try {
        chartActive = 'home';
        document.getElementById('content-expense-proportion').classList.add('hidden');
        document.getElementById('content-overview').classList.remove('hidden');
        document.getElementById('content-data-save').classList.add('hidden');
        const yearSelect = document.getElementById('home-year-select').value;
        const monthSelect = document.getElementById('home-month-select').value;
        const response = await fetch(`/api/dashboard/summary/${yearSelect}/${monthSelect}`);
        if (!response.ok) throw new Error(`API call failed with status ${response.status}`);
        const data = await response.json();
        const ctx = document.getElementById('summary-chart')?.getContext('2d');
        if (!ctx) return;
        if (homeChart) homeChart.destroy();
        homeChart = new Chart(ctx, {
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
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: context => {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) label += formatCurrency(context.parsed.y);
                                return label;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error rendering summary chart:", error);
        const chartContainer = document.getElementById('summary-chart')?.parentElement;
        if (chartContainer) chartContainer.innerHTML = `<p class="text-center text-red-500">Không thể tải dữ liệu biểu đồ. Lỗi: ${error.message}</p>`;
    }
}

async function updateSaveChart() {
    document.getElementById('content-expense-proportion').classList.add('hidden');
    document.getElementById('content-overview').classList.add('hidden');
    document.getElementById('content-data-save').classList.remove('hidden');
    const response = await fetch(`/api/dashboard/save`);
    if (!response.ok) throw new Error(`API call failed with status ${response.status}`);
    const data = await response.json();
    let html = '<div class="overflow-x-auto shadow-lg rounded-lg"><table class="min-w-full bg-green">';
    html += '<thead class="bg-green-600 text-white"><tr>';
    html += '<th class="py-3 px-4 text-left uppercase font-semibold text-sm">Số tiền</th>';
    html += '<th class="py-3 px-4 text-left uppercase font-semibold text-sm">Lãi suất (%/năm)</th>';
    html += '<th class="py-3 px-4 text-left uppercase font-semibold text-sm">Kỳ hạn (Tháng)</th>';
    html += '<th class="py-3 px-4 text-left uppercase font-semibold text-sm">Ngày gửi</th>';
    html += '<th class="py-3 px-4 text-left uppercase font-semibold text-sm">Ghi chú</th>';
    html += '</thead><tbody class="text-gray-700">';
    for (let i = 0; i < data.length; i++) {
        const rowClass = i % 2 === 0 ? 'bg-white' : 'bg-green-50';
        html += `<tr class="${rowClass}" data-id="${data[i]['id']}">`;
        html += `<td class="py-3 px-4">${data[i]['amount']}</td>`;
        html += `<td class="py-3 px-4">${data[i]['rate']}</td>`;
        html += `<td class="py-3 px-4">${data[i]['term']}</td>`;
        html += `<td class="py-3 px-4">${data[i]['date']}</td>`;
        html += `<td class="py-3 px-4">${data[i]['note'] || ''}</td>`;
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    document.getElementById('data-save').innerHTML = html;
}

async function loadChart() {
    if (chartActive === 'home') await updateHomeChart();
    else if (chartActive === 'pie') await updatePieChart();
}

export async function loadHomePage(type = 'home') {
    const yearSelect = document.getElementById('home-year-select');
    const monthSelect = document.getElementById('home-month-select');
    try {
        const response = await fetch(`/api/dashboard/years`);
        if (!response.ok) throw new Error('Could not fetch years');
        const years = await response.json();
        const currentYear = new Date().getFullYear().toString();
        yearSelect.innerHTML = years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>Năm ${y}</option>`).join('');
        let monthOptions = ''
        for (let i = 1; i <= 12; i++) {
            monthOptions += `<option value="${i}" ${i === new Date().getMonth() + 1 ? 'selected' : ''}>Tháng ${i}</option>`;
        }
        monthSelect.innerHTML = monthOptions;

        yearSelect.addEventListener('change', loadChart);
        monthSelect.addEventListener('change', loadChart);

        setupEventListeners();

        if (type === 'home') await updateHomeChart();
        else if (type === 'pie') await updatePieChart();
        else if (type === 'save') await updateSaveChart();

    } catch (error) {
        console.error('Failed to load home page filters:', error);
        yearSelect.innerHTML = '<option>Lỗi tải năm</option>';
    }
}
