import { showAlert, formatCurrency,formatDateToYMD } from './utils.js';

/**
 * Fetches the list of active loans from the server.
 * @returns {Promise<Array>} A promise that resolves to an array of loans.
 */
async function fetchLoans() {
    try {
        const response = await fetch('/api/dashboard/loan');
        if (!response.ok) {
            throw new Error('Could not fetch loans.');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching loans:', error);
        showAlert('error', 'Không thể tải danh sách khoản vay.');
        return [];
    }
}

/**
 * Populates the loan selection dropdown.
 */
async function populateLoanSelector() {
    const select = document.getElementById('loan-select');
    if (!select) return;

    const loans = await fetchLoans();
    select.innerHTML = '<option value="">-- Chọn một khoản vay --</option>'; // Clear loading text

    if (loans.length > 0) {
        loans.forEach(loan => {
            const option = document.createElement('option');
            option.value = loan.id;
            // Display loan name and its total amount for better context
            option.textContent = `${loan.borrowerName}`;
            select.appendChild(option);
        });
    }
}

/**
 * Sets up the logic for the payment form, including input calculations and submission.
 */
function setupPaymentForm() {
    const form = document.getElementById('payment-form');
    if (!form) return;

    const principalInput = document.getElementById('principal-paid');
    const interestInput = document.getElementById('interest-paid');
    const totalInput = document.getElementById('total-amount');
    const dateInput = document.getElementById('payment-date');

    // Function to update the total amount
    const updateTotal = () => {
        const principal = parseFloat(principalInput.value) || 0;
        const interest = parseFloat(interestInput.value) || 0;
        const total = principal + interest;
        totalInput.value = formatCurrency(total);
    };

    // Set today's date as the default
    dateInput.valueAsDate = new Date();

    // Add event listeners to calculate total on input
    principalInput.addEventListener('input', updateTotal);
    interestInput.addEventListener('input', updateTotal);

    // Initial calculation
    updateTotal();

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {
            loan_id: formData.get('loan_id'),
            payment_date: formData.get('payment_date'),
            principal_paid: parseFloat(formData.get('principal_paid')) || 0,
            interest_paid: parseFloat(formData.get('interest_paid')) || 0,
        };

        // Basic validation
        if (!data.loan_id) {
            showAlert('error', 'Vui lòng chọn một khoản vay.');
            return;
        }
        if (!data.payment_date) {
            showAlert('error', 'Vui lòng chọn ngày trả.');
            return;
        }
        if (data.principal_paid === 0 && data.interest_paid === 0) {
            showAlert('error', 'Vui lòng nhập số tiền gốc hoặc lãi đã trả.');
            return;
        }

        try {
            const response = await fetch('/api/loans/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'An unknown error occurred.');
            }

            showAlert('success', 'Đã ghi nhận thanh toán thành công!');
            form.reset(); // Reset form fields
            dateInput.valueAsDate = new Date(); // Re-set date after reset
            updateTotal(); // Recalculate total (to show 0)

        } catch (error) {
            console.error('Payment submission error:', error);
            showAlert('error', `Lỗi: ${error.message}`);
        }
    });
}

/**
 * Main function to initialize the loan payment page.
 */
export function loadLoanPaymentPage() {
    populateLoanSelector();
    setupPaymentForm();
}
