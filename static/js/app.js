import { loadHomePage } from './home.js';
import { loadCollectionData } from './collections.js';
import { loadManagementPage } from './management.js';
import { loadChatbotPage } from './chatbot.js'; // <-- IMPORT CHATBOT LOADER
import { showAlert } from './utils.js';

const content = document.getElementById('content');
const menuContainer = document.getElementById('menu-container');

// Add the new route for the chatbot
const routes = {
    '/': { page: '/pages/home.html', loader: loadHomePage },
    '/collections': { page: '/pages/collections.html', loader: loadCollectionData },
    '/management': { page: '/pages/management.html', loader: loadManagementPage },
    '/chatbot': { page: '/pages/chatbot.html', loader: loadChatbotPage } // <-- ADD CHATBOT ROUTE
};

function attachGlobalEventListeners() {
    // This logic is now more robust. It finds the menu once and attaches a single listener.
    const menu = document.querySelector('nav'); // Target the nav inside the loaded menu
    if (menu) {
        menu.addEventListener('click', e => {
            const link = e.target.closest('a[data-navigo]');
            if (link) {
                e.preventDefault();
                const path = link.getAttribute('href');
                history.pushState({ path }, '', path);
                handleNav(path);
            }
        });
    } else {
        console.error('Navigation menu not found for event listener attachment.');
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
        
        attachGlobalEventListeners(); // Attach listeners AFTER menu is loaded
        window.onpopstate = e => { handleNav(e.state?.path || '/'); };
        await handleNav(window.location.pathname);
        
        // This seems to be footer logic, better to keep it if it exists.
        const footerYear = document.getElementById('footer-year');
        if (footerYear) {
            footerYear.textContent = new Date().getFullYear();
        }

        // --- TIME TICKER LOGIC ---
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
