export function formatCurrency(value) {
    if (typeof value !== 'number') return value;
    return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}
