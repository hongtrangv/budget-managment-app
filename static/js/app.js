import { loadSavingPage } from './saving.js';
import {loadHomePage} from './home.js';
import { loadCategoryPage } from './collections.js';
import { loadManagementPage } from './management.js';
import { loadLoanPaymentPage } from './loan_payment.js';
import { initializeChatbotWidget } from './chatbot.js';
import { loadAndRenderLibrary,renderStarRating } from './books.js';
import { initializeBookActions } from './book_actions.js';
import { showAlert } from './utils.js';
import { loadExcelUploadPage } from './excel_upload.js'; // Import a new page

const content = document.getElementById('content');
const menuContainer = document.getElementById('menu-container');

const routes = {
    '/': { page: '/pages/home.html', loader: loadHomePage },
    '/saving': { page: '/pages/saving.html', loader: loadSavingPage },    
    '/collections': { page: '/pages/collections.html', loader: loadCategoryPage },
    '/management': { page: '/pages/management.html', loader: loadManagementPage },
    '/loan-payment': { page: '/pages/loan_payment.html', loader: loadLoanPaymentPage },
    '/bookstore': { page: '/pages/books.html', loader: loadAndRenderLibrary },
    '/calendar': { page: '/pages/calendar.html', loader: () => import('./calendar.js') },
    '/report': { page: '/pages/report.html' }, // Thêm route cho trang báo cáo
    '/excel-upload': { page: '/pages/excel_upload.html', loader: loadExcelUploadPage }, // Add excel upload page route
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

const ICONS = {
    home: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-7 4h14a1 1 0 001-1V10a1 1 0 00-1-1h-4"></path></svg>',
    saving: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>',
    collections: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>',
    management: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
    loan: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1m0-1H8m11 11.5a1.5 1.5 0 01-3 0V16a1.5 1.5 0 013 0v.5z"></path></svg>',
    book: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v11.494m0 0l-5.495-3.663A2.25 2.25 0 005.25 12V6.253a2.25 2.25 0 011.007-1.928l5.495-3.663a2.25 2.25 0 012.496 0l5.495 3.663A2.25 2.25 0 0118.75 6.253V12a2.25 2.25 0 01-1.257 2.086l-5.495 3.663z"></path></svg>',
    logout: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>',
    login: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>',
    register: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"></path></svg>'
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

            const submitButton = document.getElementById('login-submit-button');
            const spinner = document.getElementById('login-spinner');
            const buttonText = document.getElementById('login-button-text');

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Bắt đầu trạng thái loading (chỉ cho form đăng nhập)
            if (form.id === 'login-form' && submitButton) {
                submitButton.disabled = true;
                if(spinner) spinner.classList.remove('hidden');
                if(buttonText) buttonText.textContent = 'Đang xử lý...';
            }

            try {
                const actionUrl = form.id === 'login-form' ? '/login' : '/register';
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
                    // Hiển thị popup thành công
                    showAlert('success', result.message || 'Thao tác thành công!');
                    setTimeout(() => {
                        if (result.redirect) {
                             window.location.href = result.redirect;
                        }
                    }, 1000);
                } else {
                    // Lỗi từ API
                    throw new Error(result.message || 'Đã có lỗi không xác định xảy ra.');
                }
            } catch (error) {
                // Hiển thị popup lỗi
                showAlert('error', error.message);

                // Reset lại trạng thái nút (chỉ cho form đăng nhập)
                if (form.id === 'login-form' && submitButton) {
                    submitButton.disabled = false;
                    if(spinner) spinner.classList.add('hidden');
                    if(buttonText) buttonText.textContent = 'Đăng nhập';
                }
            }
        }
    });
}

function renderMenu(menu) {
    const menuItems = menu.items.map(item => {
        const icon = ICONS[item.icon] || '';
        return `
            <a href="${item.url}" id="${item.id || ''}" class="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group" data-navigo>
                ${icon}
                <span class="ms-3">${item.text}</span>
            </a>
        `;
    }).join('');

    menuContainer.innerHTML = `
        <div class="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
            <ul class="space-y-2 font-medium">
                ${menuItems}
            </ul>
        </div>
    `;
}

async function initialLoad() {
    try {
        const menuResponse = await fetch('/api/menu');
        if (!menuResponse.ok) throw new Error(`Failed to load menu: ${menuResponse.status}`);
        const menu = await menuResponse.json();
        renderMenu(menu);
        
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
