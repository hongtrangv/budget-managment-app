export function formatCurrency(value) {
    if (typeof value !== 'number') return value;
    return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

// We will find the container only when the showAlert function is first called.
let alertContainer = null;

export function showAlert(type, message, duration = 4000) {
    // If the container hasn't been found yet, find it.
    if (!alertContainer) {
        alertContainer = document.getElementById("alert-container");
    }

    // If it still doesn't exist after trying to find it, log an error and exit.
    if (!alertContainer) {
        console.error("Alert container #alert-container not found in the DOM.");
        return;
    }

    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;

    const icons = {
        success: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>`,
        error: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>`,
        warning: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-width="2" d="M12 9v2m0 4h.01M5 19h14L12 5 5 19z"></path>
                  </svg>`,
        info: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01"></path>
               </svg>`
    };

    alert.innerHTML = `
        ${icons[type]}
        <span>${message}</span>
        <button class="close-btn">&times;</button>
    `;

    // Close button
    alert.querySelector(".close-btn").addEventListener("click", () => {
        alert.style.animation = "fadeOut 0.3s ease forwards";
        setTimeout(() => alert.remove(), 300);
    });

    alertContainer.appendChild(alert);

    // Auto-hide after duration
    setTimeout(() => {
        if (alert.parentNode) {
            alert.style.animation = "fadeOut 0.3s ease forwards";
            setTimeout(() => alert.remove(), 300);
        }
    }, duration);
}
