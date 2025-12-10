document.addEventListener("DOMContentLoaded", function () {
    const loanTableBody = document.querySelector("#loan-table tbody");

    // Fetch loan data and populate the table
    fetch("/api/dashboard/loan")
        .then(response => response.json())
        .then(data => {
            data.forEach(loan => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${loan.name}</td>
                    <td>${loan.amount}</td>
                    <td>${loan.interest_rate}</td>
                    <td>${loan.start_date}</td>
                    <td><button class="view-payments-btn" data-loan-id="${loan.id}">Xem</button></td>
                `;
                loanTableBody.appendChild(row);
            });
        });

    // Add event listener for view payments button
    loanTableBody.addEventListener("click", function (event) {
        if (event.target.classList.contains("view-payments-btn")) {
            const loanId = event.target.getAttribute("data-loan-id");
            openPaymentsModal(loanId);
        }
    });

    function openPaymentsModal(loanId) {
        // Fetch payment history for the loan
        fetch(`/api/dashboard/loan/${loanId}/payments`)
            .then(response => response.json())
            .then(payments => {
                const modalPaymentHistory = document.getElementById("modal-payment-history");
                modalPaymentHistory.innerHTML = ""; // Clear previous content
                payments.forEach(payment => {
                    const paymentDiv = document.createElement("div");
                    paymentDiv.innerHTML = `
                        <p>Date: ${payment.date}</p>
                        <p>Amount: ${payment.amount}</p>
                        <hr>
                    `;
                    modalPaymentHistory.appendChild(paymentDiv);
                });

                // Show the modal
                const modal = document.getElementById("payments-modal");
                modal.style.display = "block";
            });
    }

    // Close the modal
    const closeBtn = document.querySelector(".modal .close");
    closeBtn.addEventListener("click", function () {
        const modal = document.getElementById("payments-modal");
        modal.style.display = "none";
    });
});
