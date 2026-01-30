import { loadSavingPage } from './saving.js';
import { loadHomePage } from './home.js';
import { loadCategoryPage } from './collections.js';
import { loadManagementPage } from './management.js';
import { loadLoanPaymentPage } from './loan_payment.js';
import { initializeChatbotWidget } from './chatbot.js';
import { loadAndRenderLibrary, renderStarRating } from './books.js';
import { showAlert } from './utils.js';
import { loadExcelUploadPage } from './excel_upload.js';
import { loadRegistrationPage } from './register.js';
import { ICONS } from './icons.js';
import { initAdminMenuPage } from './admin_menu.js';
import { initializeDndList } from './dnd_list.js'; // Import the new function
import { initUserApprovalPage } from './user_approval.js';
import { loadPriceManagementPage } from './price_management.js';

const content = document.getElementById('content');
const menuContainer = document.getElementById('menu-container');

function closeMobileSidebar() {
    const sidebar = document.getElementById('left-sidebar');
    const backdrop = document.getElementById('backdrop');
    if (sidebar && backdrop) {
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
    }
}

const routes = {
    '/welcome': { page: '/pages/welcome.html' }, // Page for logged-out users
    '/': { page: '/pages/home.html', loader: loadHomePage },
    '/saving': { page: '/pages/saving.html', loader: loadSavingPage },    
    '/collections': { page: '/pages/collections.html', loader: loadCategoryPage },
    '/management': { page: '/pages/management.html', loader: loadManagementPage },
    '/loan-payment': { page: '/pages/loan_payment.html', loader: loadLoanPaymentPage },
    '/bookstore': { page: '/pages/books.html', loader: loadAndRenderLibrary },
    '/calendar': { page: '/pages/calendar.html', loader: () => import('./calendar.js') },
    '/report': { page: '/pages/report.html' },
    '/excel-upload': { page: '/pages/excel_upload.html', loader: loadExcelUploadPage },
    '/dnd-list': { page: '/pages/dnd_list.html', loader: initializeDndList }, // Assign the loader
    '/login': { page: '/login' },
    '/register': { page: '/register', loader: loadRegistrationPage },
    '/admin/user-approval': { page: '/pages/admin/user_approval.html',loader:initUserApprovalPage },
    '/admin/menu': { page: '/admin/menu', loader: initAdminMenuPage },
    '/price-management': { page: '/pages/price_management.html', loader: loadPriceManagementPage },
    '/shelf/:rowIndex/:unitIndex/:compIndex': { dynamic: true, page: '/shelf/:rowIndex/:unitIndex/:compIndex' },
    '/book/:bookId': { 
        dynamic: true, 
        page: '/book/:bookId', 
        loader: () => {
            const ratingElement = document.getElementById('book-detail-rating');
            if (ratingElement) renderStarRating(ratingElement);
        }
    }
};

function findMatchingRoute(path) {
    for (const route in routes) {
        const routeParts = route.split('/').filter(p => p);
        const pathParts = path.split('/').filter(p => p);
        if (routeParts.length !== pathParts.length) continue;
        const params = {};
        let match = true;
        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
                params[routeParts[i].substring(1)] = pathParts[i];
            } else if (routeParts[i] !== pathParts[i]) {
                match = false; break;
            }
        }
        if (match) return { ...routes[route], params };
    }
    return routes['/'];
}

async function handleNav(path) {
    closeMobileSidebar();
    const loggedIn = document.body.dataset.loggedIn === 'true';

    // --- REDIRECTION LOGIC ---
    if (!loggedIn && path === '/') {
        history.replaceState({ path: '/welcome' }, '', '/welcome');
        handleNav('/welcome');
        return;
    }
    
    if (loggedIn && ['/login', '/register', '/welcome'].includes(path)) {
        history.replaceState({ path: '/' }, '', '/');
        handleNav('/');
        return;
    }

    const routeInfo = findMatchingRoute(path);
    let pageUrl = routeInfo.page;
    if (routeInfo.dynamic) {
        for (const key in routeInfo.params) {
            pageUrl = pageUrl.replace(`:${key}`, routeInfo.params[key]);
        }
    }
    try {
        const finalUrl = routeInfo.dynamic ? `/books_bp${pageUrl}` : pageUrl;
        const response = await fetch(finalUrl);
        if (response.redirected) {
            const redirectPath = new URL(response.url).pathname;
            history.replaceState({ path: redirectPath }, '', redirectPath);
            handleNav(redirectPath);
            return;
        }
        if (!response.ok) {
            if (response.status === 403) {
                content.innerHTML = await response.text();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        content.innerHTML = await response.text();
        if (routeInfo.loader) await routeInfo.loader();
    } catch (e) {
        console.error("Error handling navigation:", e);
        showAlert('error', `Không thể tải trang: ${path}.`);
    }
}

async function logout() {
    try {
        const response = await fetch('/logout');
        const result = await response.json();
        if (response.ok && result.status === 'success' && result.redirect) {
            showAlert('success', 'Đăng xuất thành công. Đang chuyển hướng...');
            setTimeout(() => { window.location.href = '/'; }, 1000);
        } else {
            throw new Error(result.message || 'Đăng xuất thất bại.');
        }
    } catch (error) {
        console.error('Lỗi Đăng xuất:', error);
        showAlert('error', `Lỗi khi đăng xuất: ${error.message}`);
    }
}

function initializeResponsiveUI() {
    const sidebar = document.getElementById('left-sidebar');
    const backdrop = document.getElementById('backdrop');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const userMenuButton = document.getElementById('user-menu-button');
    const userMenuDropdown = document.getElementById('user-menu-dropdown');

    if (mobileMenuButton) mobileMenuButton.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
        backdrop.classList.toggle('hidden');
    });
    if (backdrop) backdrop.addEventListener('click', closeMobileSidebar);
    if (userMenuButton) userMenuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenuDropdown.classList.toggle('hidden');
    });
    window.addEventListener('click', (e) => {
        if (userMenuDropdown && !userMenuDropdown.classList.contains('hidden')) {
             if (!userMenuButton.contains(e.target) && !userMenuDropdown.contains(e.target)) {
                userMenuDropdown.classList.add('hidden');
            }
        }
    });
}

function attachGlobalEventListeners() {
    document.body.addEventListener('click', e => {
        const navLink = e.target.closest('a[data-navigo]');
        if (navLink) {
            e.preventDefault();
            history.pushState({ path: navLink.getAttribute('href') }, '', navLink.getAttribute('href'));
            handleNav(navLink.getAttribute('href'));
        }
        const logoutButton = e.target.closest('.logout-button');
        if (logoutButton) {
            e.preventDefault();
            const dropdown = document.getElementById('user-menu-dropdown');
            if(dropdown) dropdown.classList.add('hidden');
            logout();
        }
    });

    document.body.addEventListener('submit', async (event) => {
        const form = event.target;
        if (form.id === 'login-form' || form.id === 'register-form') {
            event.preventDefault();
            const isLoginForm = form.id === 'login-form';
            const submitButton = document.getElementById(isLoginForm ? 'login-submit-button' : 'register-submit-button');
            const buttonText = document.getElementById(isLoginForm ? 'login-button-text' : 'register-button-text');
            const originalButtonText = isLoginForm ? 'Đăng nhập' : 'Đăng ký';
            
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            if (submitButton) {
                submitButton.disabled = true;
                if(buttonText) buttonText.textContent = 'Đang xử lý...';
            }

            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await response.json();
                if (response.ok && result.status === 'success') {
                    showAlert('success', result.message);
                    setTimeout(() => { if (result.redirect) window.location.href = result.redirect; }, 1000);
                } else {
                    throw new Error(result.message || 'Lỗi không xác định.');
                }
            } catch (error) {
                showAlert('error', error.message);
                if (submitButton) {
                    submitButton.disabled = false;
                    if(buttonText) buttonText.textContent = originalButtonText;
                }
            }
        }
    });
}

function renderMenu(menu) {
    const menuItems = menu.items.map(item => {
        const icon = ICONS[item.icon.toUpperCase()] || '';
        return `
            <a href="${item.url}" id="${item.id || ''}" class="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group" data-navigo>
                ${icon}
                <span class="ms-3">${item.text}</span>
            </a>
        `;
    }).join('');
    menuContainer.innerHTML = `
        <div class="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
            <ul class="space-y-2 font-medium">${menuItems}</ul>
        </div>
    `;
}

async function initialLoad() {
    try {
        const authStatusResponse = await fetch('/api/auth/status');
        const authStatus = await authStatusResponse.json();
        document.body.dataset.loggedIn = authStatus.logged_in;
        const menuResponse = await fetch('/api/menu');
        if (!menuResponse.ok) throw new Error(`Menu load failed: ${menuResponse.status}`);
        renderMenu(await menuResponse.json());
        // if (authStatus.logged_in) {
            
        // } else {
        //      menuContainer.innerHTML = '';
        // }I
        
        initializeChatbotWidget();
        initializeResponsiveUI();
        attachGlobalEventListeners(); 

        window.onpopstate = e => { handleNav(e.state?.path || '/'); };
        await handleNav(window.location.pathname);
        
        const footerYear = document.getElementById('footer-year');
        if (footerYear) footerYear.textContent = new Date().getFullYear();

    } catch(e) {
        console.error("Initial load failed:", e);
        showAlert('error', 'Lỗi nghiêm trọng: Không thể tải các thành phần chính.', 10000);
    }
}

initialLoad();
