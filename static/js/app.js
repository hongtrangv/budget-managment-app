import { loadHomePage } from './home.js';
import { loadCollectionData } from './collections.js';
import { loadManagementPage } from './management.js';
import { initializeChatbotWidget } from './chatbot.js'; // Import the widget initializer
import { showAlert } from './utils.js';

const content = document.getElementById('content');
const menuContainer = document.getElementById('menu-container');

const routes = {
    '/': { page: '/pages/home.html', loader: loadHomePage },
    '/collections': { page: '/pages/collections.html', loader: loadCollectionData },
    '/management': { page: '/pages/management.html', loader: loadManagementPage },
};

function attachGlobalEventListeners() {
    const menu = document.querySelector('nav');
    if (menu) {
        // Handle navigation links
        menu.addEventListener('click', e => {
            const navLink = e.target.closest('a[data-navigo]');
            if (navLink) {
                e.preventDefault();
                const path = navLink.getAttribute('href');
                history.pushState({ path }, '', path);
                handleNav(path);
            }
        });

        // The chatbot button is also in the menu, so we can attach its listener here too.
        // Note: The actual initialization of the widget logic is separate.
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
        
        // Initialize the chatbot widget functionality right after the page loads.
        // It will find its buttons and attach its own listeners.
        initializeChatbotWidget();

        attachGlobalEventListeners(); 
        window.onpopstate = e => { handleNav(e.state?.path || '/'); };
        await handleNav(window.location.pathname);
        
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
