import { formatCurrency } from './utils.js';

// A set of predefined colors for the charts
const CHART_COLORS = [
    '#4CAF50', '#F44336', '#2196F3', '#FFC107', '#9C27B0', '#FF9800', 
    '#009688', '#E91E63', '#3F51B5', '#FF5722', '#8BC34A', '#673AB7'
];

/**
 * Creates or updates the summary chart (Income vs. Expense).
 * @param {object} data - The data from the API.
 * @param {Chart} chartInstance - The existing Chart.js instance, if any.
 * @returns {Chart} The new or updated chart instance.
 */
export function createSummaryChart(data, chartInstance) {
    const ctx = document.getElementById('summary-chart')?.getContext('2d');
    if (!ctx) return null;

    // Destroy the old chart if it exists
    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = Object.keys(data.income).sort((a, b) => a - b);
    const incomeData = labels.map(day => data.income[day] || 0);
    const expenseData = labels.map(day => data.expense[day] || 0);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(day => `Ngày ${day}`),
            datasets: [
                {
                    label: 'Thu',
                    data: incomeData,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)', 
                    borderColor: 'rgb(75, 192, 192)',
                    borderWidth: 1
                },
                {
                    label: 'Chi',
                    data: expenseData,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)', 
                    borderColor: 'rgb(255, 99, 132)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: value => formatCurrency(value) }
                }
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                    }
                }
            }
        }
    });
}

/**
 * Creates or updates the expense category chart (Doughnut).
 * @param {object} data - The data from the API.
 * @param {Chart} chartInstance - The existing Chart.js instance, if any.
 * @returns {Chart} The new or updated chart instance.
 */
export function createCategoryChart(data, chartInstance) {
    const ctx = document.getElementById('expense-category-chart')?.getContext('2d');
    if (!ctx) return null;

    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = data.map(item => item.name);
    const expenseData = data.map(item => item.value);

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Chi phí theo hạng mục',
                data: expenseData,
                backgroundColor: CHART_COLORS,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.label}: ${formatCurrency(context.raw)}`
                    }
                },
                datalabels: {
                    formatter: (value, ctx) => {
                        let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        let percentage = (value * 100 / sum).toFixed(1) + '%';
                        return percentage;
                    },
                    color: '#fff',
                    textShadowColor: '#000',
                    textShadowBlur: 4
                }
            }
        },
        plugins: [ChartDataLabels] // Ensure the datalabels plugin is registered
    });
}
