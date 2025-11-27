import { loadHomePage } from './home.js';
import { loadCollectionData } from './collections.js';
import { loadManagementPage } from './management.js';

const content = document.getElementById('content');
const menuContainer = document.getElementById('menu-container');

const routes = {
    '/': { page: '/pages/home.html', loader: loadHomePage },
    '/collections': { page: '/pages/collections.html', loader: loadCollectionData },
    '/management': { page: '/pages/management.html', loader: loadManagementPage }
};

function attachGlobalEventListeners() {
    menuContainer.addEventListener('click', e => {
        const link = e.target.closest('a'); // Changed to be more general
        if (link && link.getAttribute('href')) {
            e.preventDefault();
            const path = link.getAttribute('href');
            history.pushState({ path }, '', path);
            handleNav(path);
        }
    });
}

async function handleNav(path) {
    const routePath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
    const route = routes[routePath] || routes['/'];

    try {
        const response = await fetch(route.page);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        content.innerHTML = await response.text();
        
        if (route.loader) {
            await route.loader();
        }

    } catch (e) {
        console.error("Error handling navigation:", e);
        content.innerHTML = `<div class="text-center p-8"><h1 class="text-2xl font-bold text-red-600">Page Not Found</h1><p class="text-gray-500">Could not load content for ${path}.</p></div>`;
    }
}

async function initialLoad() {
    try {
        const menuResponse = await fetch('/components/menu.html'); // Updated path
        menuContainer.innerHTML = await menuResponse.text();   
        attachGlobalEventListeners();
        window.onpopstate = e => { handleNav(e.state?.path || '/'); };
        await handleNav(window.location.pathname);
        document.getElementById('footer-year').textContent = new Date().getFullYear();
        
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
        document.body.innerHTML = "<h1>Lỗi nghiêm trọng khi tải ứng dụng.</h1>";
    }
}

initialLoad();
