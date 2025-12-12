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
    '/collections': { page: './pages/collections.html', loader: loadCategoryPage },
    '/management': { page: '/pages/management.html', loader: loadManagementPage },
    '/loan-payment': { page: '/pages/loan_payment.html', loader: loadLoanPaymentPage },
    '/bookstore': { page: '/pages/books.html', loader: loadAndRenderLibrary },
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
    const routeInfo = findMatchingRoute(path);
    let pageUrl = routeInfo.page;
    if (routeInfo.dynamic) {
        for (const key in routeInfo.params) {
            pageUrl = pageUrl.replace(`:${key}`, routeInfo.params[key]);
        }
    }

    try {
        // Use the books_bp prefix for dynamic content
        const finalUrl = routeInfo.dynamic ? `/books_bp${pageUrl}` : pageUrl;
        const response = await fetch(finalUrl);
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

/**
 * Sets up the event listener for the mobile menu button.
 */
function setupMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const openChatbotMobile = document.getElementById('open-chatbot-widget-mobile');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // Ensure menu closes when a link is clicked
    mobileMenu.addEventListener('click', (e) => {
        if (e.target.matches('a[data-navigo]') || e.target.closest('a[data-navigo]')) {
            mobileMenu.classList.add('hidden');
        }
    });
    
    // Handle chatbot button inside mobile menu
    if(openChatbotMobile) {
        openChatbotMobile.addEventListener('click', () => {
            const mainChatbotButton = document.getElementById('open-chatbot-widget');
            if(mainChatbotButton) mainChatbotButton.click();
            mobileMenu.classList.add('hidden');
        });
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
    });
}

async function initialLoad() {
    try {
        const menuResponse = await fetch('/components/menu.html');
        if (!menuResponse.ok) throw new Error(`Failed to load menu: ${menuResponse.status}`);
        menuContainer.innerHTML = await menuResponse.text();   
        
        initializeChatbotWidget();
        //initializeBookActions();
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
