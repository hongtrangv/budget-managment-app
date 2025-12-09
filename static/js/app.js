import { loadSavingPage } from './saving.js';
import {loadHomePage} from './home.js';
import { loadCategoryPage } from './collections.js';
import { loadManagementPage } from './management.js';
import { loadLoanPaymentPage } from './loan_payment.js';
import { initializeChatbotWidget } from './chatbot.js';
import { loadAndRenderLibrary } from './books.js';
import { showAlert } from './utils.js';

const content = document.getElementById('content');
const menuContainer = document.getElementById('menu-container');

const routes = {
    '/': { page: '/pages/home.html', loader: loadHomePage },
    '/saving': { page: '/pages/saving.html', loader: loadSavingPage },    
    '/collections': { page: './pages/collections.html', loader: loadCategoryPage },
    '/management': { page: '/pages/management.html', loader: loadManagementPage },
    '/loan-payment': { page: '/pages/loan_payment.html', loader: loadLoanPaymentPage },
    '/bookstore': { page: '/pages/books.html', loader: loadAndRenderLibrary }
};

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
    const menu = document.querySelector('nav');
    if (menu) {
        menu.addEventListener('click', e => {
            const navLink = e.target.closest('a[data-navigo]');
            if (navLink) {
                e.preventDefault();
                const path = navLink.getAttribute('href');
                history.pushState({ path }, '', path);
                handleNav(path);
            }
        });
    }
}

async function handleNav(path) {
    const routePath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
    const route = routes[routePath] || routes['/'];
    try {
        const response = await fetch(route.page);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for path ${route.page}`);
        content.innerHTML = await response.text();
        
        if (route.loader) {
            await route.loader();
        }
    } catch (e) {
        console.error("Error handling navigation:", e);
        showAlert('error', `Không thể tải trang: ${path}. Vui lòng thử lại.`);
    }
}

async function initialLoad() {
    try {
        const menuResponse = await fetch('/components/menu.html');
        if (!menuResponse.ok) throw new Error(`Failed to load menu: ${menuResponse.status}`);
        menuContainer.innerHTML = await menuResponse.text();   
        
        // NEW: Setup mobile menu listeners after menu is loaded
        //setupMobileMenu();

        initializeChatbotWidget();
        attachGlobalEventListeners(); 
        window.onpopstate = e => { handleNav(e.state?.path || '/'); };
        await handleNav(window.location.pathname);
        
        const footerYear = document.getElementById('footer-year');
        if (footerYear) {
            footerYear.textContent = new Date().getFullYear();
        }

        const tickerContent = document.getElementById('time-ticker-content');
        const tickerClone = document.getElementById('time-ticker-content-clone');
        if (tickerContent && tickerClone) {
            const updateTime = () => {
                const now = new Date();
                const formattedTime = `Hôm nay: ${now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • Bây giờ là: ${now.toLocaleTimeString('vi-VN')}`;
                tickerContent.textContent = formattedTime;
                tickerClone.textContent = formattedTime;
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
