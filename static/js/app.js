import { loadHomePage } from './home.js';
import { loadCollectionData } from './collections.js';
import { loadManagementPage } from './management.js';
import { showAlert } from './utils.js'; // Import the showAlert function

const content = document.getElementById('content');
const menuContainer = document.getElementById('menu-container');

const routes = {
    '/': { page: '/pages/home.html', loader: loadHomePage },
    '/collections': { page: '/pages/collections.html', loader: loadCollectionData },
    '/management': { page: '/pages/management.html', loader: loadManagementPage }
};

function attachGlobalEventListeners() {
    menuContainer.addEventListener('click', e => {
        const link = e.target.closest('a');
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for path ${route.page}`);
        content.innerHTML = await response.text();
        
        if (route.loader) {
            await route.loader();
        }

    } catch (e) {
        console.error("Error handling navigation:", e);
        // Instead of wiping the content, show a user-friendly alert
        showAlert('error', `Không thể tải trang: ${path}. Vui lòng thử lại.`);
    }
}

async function initialLoad() {
    try {
        const menuResponse = await fetch('/components/menu.html');
        if (!menuResponse.ok) throw new Error(`Failed to load menu: ${menuResponse.status}`);
        menuContainer.innerHTML = await menuResponse.text();   
        
        attachGlobalEventListeners();
        window.onpopstate = e => { handleNav(e.state?.path || '/'); };
        await handleNav(window.location.pathname);
        document.getElementById('footer-year').textContent = new Date().getFullYear();

    } catch(e) {
        console.error("Initial load failed:", e);
        // Show a critical error alert without wiping the page
        showAlert('error', 'Lỗi nghiêm trọng: Không thể tải các thành phần giao diện chính.', 10000);
    }
}

initialLoad();
