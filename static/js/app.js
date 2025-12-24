import { loadSavingPage } from './saving.js';
import {loadHomePage} from './home.js';
import { loadCategoryPage } from './collections.js';
import { loadManagementPage } from './management.js';
import { loadLoanPaymentPage } from './loan_payment.js';
import { initializeChatbotWidget } from './chatbot.js';
import { loadAndRenderLibrary,renderStarRating } from './books.js';
import { initializeBookActions } from './book_actions.js';
import { showAlert } from './utils.js';

const content = document.getElementById('content');
const menuContainer = document.getElementById('menu-container');

const routes = {
    '/': { page: '/pages/home.html', loader: loadHomePage },
    '/saving': { page: '/pages/saving.html', loader: loadSavingPage },    
    '/collections': { page: '/pages/collections.html', loader: loadCategoryPage },
    '/management': { page: '/pages/management.html', loader: loadManagementPage },
    '/loan-payment': { page: '/pages/loan_payment.html', loader: loadLoanPaymentPage },
    '/bookstore': { page: '/pages/books.html', loader: loadAndRenderLibrary },
    '/login': { page: '/login' },
    '/register': { page: '/register' },
    '/shelf/:rowIndex/:unitIndex/:compIndex': { dynamic: true, page: '/shelf/:rowIndex/:unitIndex/:compIndex' },
    '/book/:bookId': { 
        dynamic: true, 
        page: '/book/:bookId', 
        loader: () => {
            const ratingElement = document.getElementById('book-detail-rating');
            if (ratingElement) {
                renderStarRating(ratingElement);
            }
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
                match = false;
                break;
            }
        }
        if (match) return { ...routes[route], params };
    }
    return routes['/']; // Fallback to the root route
}

async function handleNav(path) {
    // Nếu người dùng đã đăng nhập và cố gắng truy cập /login hoặc /register, chuyển hướng họ về trang chủ
    const loggedIn = document.body.dataset.loggedIn === 'true';
    if (loggedIn && (path === '/login' || path === '/register')) {
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

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for path ${finalUrl}`);
        content.innerHTML = await response.text();
        
        if (routeInfo.loader) {
            await routeInfo.loader();
        }
    } catch (e) {
        console.error("Error handling navigation:", e);
        showAlert('error', `Không thể tải trang: ${path}. Vui lòng thử lại.`);
    }
}

async function logout() {
    try {
        const response = await fetch('/logout');
        const result = await response.json();

        if (response.ok && result.status === 'success' && result.redirect) {
            showAlert('success', 'Đăng xuất thành công. Đang chuyển hướng...');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            throw new Error(result.message || 'Đăng xuất không thành công.');
        }
    } catch (error) {
        console.error('Lỗi Đăng xuất:', error);
        showAlert('error', `Lỗi khi đăng xuất: ${error.message}`);
    }
}

function attachGlobalEventListeners() {
    document.body.addEventListener('click', e => {
        const navLink = e.target.closest('a[data-navigo]');
        if (navLink) {
            e.preventDefault();
            const path = navLink.getAttribute('href');
            history.pushState({ path }, '', path);
            handleNav(path);
        }

        // Thay đổi bộ chọn từ ID sang CLASS
        const logoutButton = e.target.closest('.logout-button');
        if (logoutButton) {
            e.preventDefault();
            logout();
        }
    });

    document.body.addEventListener('submit', async (event) => {
        const form = event.target;

        if (form.id === 'login-form' || form.id === 'register-form') {
            event.preventDefault();

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            const messageDiv = document.getElementById('form-message');

            try {
                const actionUrl = event.target.id === 'login-form' ? '/login' : '/register';
                const response = await fetch(actionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-KEY': window.API_KEY || ''
                    },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    if (messageDiv) {
                         messageDiv.className = 'p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg';
                         messageDiv.textContent = result.message;
                    }
                    setTimeout(() => {
                        if (result.redirect) {
                             window.location.href = result.redirect;
                        }
                    }, 1000);
                } else {
                    throw new Error(result.message || 'An unknown error occurred.');
                }
            } catch (error) {
                if (messageDiv) {
                    messageDiv.className = 'p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg';
                    messageDiv.textContent = error.message;
                }
            }
        }
    });
}

async function initialLoad() {
    try {
        const menuResponse = await fetch('/components/menu.html');
        if (!menuResponse.ok) throw new Error(`Failed to load menu: ${menuResponse.status}`);
        menuContainer.innerHTML = await menuResponse.text();   
        
        // Lấy trạng thái đăng nhập từ server và đặt nó vào body tag
        const authStatusResponse = await fetch('/api/auth/status');
        const authStatus = await authStatusResponse.json();
        document.body.dataset.loggedIn = authStatus.logged_in;

        initializeChatbotWidget();
        attachGlobalEventListeners(); 
        window.onpopstate = e => { handleNav(e.state?.path || '/'); };
        await handleNav(window.location.pathname);
        
        const footerYear = document.getElementById('footer-year');
        if (footerYear) {
            footerYear.textContent = new Date().getFullYear();
        }

        const tickerContent = document.getElementById('time-ticker-content');
        if (tickerContent) {
            const updateTime = () => {
                const now = new Date();
                const formattedTime = `Hôm nay: ${now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • Bây giờ là: ${now.toLocaleTimeString('vi-VN')}`;
                tickerContent.textContent = formattedTime;
            };
            setInterval(updateTime, 1000);
            updateTime();
        }

    } catch(e) {
        console.error("Initial load failed:", e);
        showAlert('error', 'Lỗi nghiêm trọng: Không thể tải các thành phần giao diện chính.', 10000);
    }
}

initialLoad();
