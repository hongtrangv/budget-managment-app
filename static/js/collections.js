import { createTable, openModal } from './utils.js';

const COLLECTION_NAME = 'items';
let currentPage = 1;
let totalPages = 1;
let lastDocIds = [null]; // Array to store the last doc ID of each page

async function fetchCategories(page = 1) {
    try {
        const pageSize = 10; 
        const startAfter = lastDocIds[page - 1] || null;

        let url = `/api/collections/${COLLECTION_NAME}/documents?pageSize=${pageSize}`;
        if (startAfter) {
            url += `&startAfter=${startAfter}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        // --- CORRECT WAY TO HANDLE HEADERS ---
        const contentDiv = document.getElementById('collections-content');
        const headersString = contentDiv.dataset.headers;
        const headerObject = JSON.parse(headersString); // Parse the JSON string into an object

        const table = createTable(result.data, headerObject, COLLECTION_NAME, page, pageSize);
        contentDiv.innerHTML = ''; // Clear previous content
        contentDiv.appendChild(table);

        // Store the last doc ID for the *next* page
        if (result.last_doc_id && page < result.total_pages) {
             if (lastDocIds.length <= page) {
                lastDocIds.push(result.last_doc_id);
            }
        }

        currentPage = page;
        totalPages = result.total_pages;

        updatePaginationUI(result.total_records);

    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('collections-content').innerHTML = '<p class="text-red-500">Không thể tải dữ liệu. Lỗi: ' + error.message + '</p>';
    }
}

function updatePaginationUI(totalRecords) {
    const prevButton = document.getElementById('category-prev-page');
    const nextButton = document.getElementById('category-next-page');
    const pageInfo = document.getElementById('category-page-info');

    if (pageInfo) {
        pageInfo.textContent = `Trang ${currentPage} / ${totalPages} | Tổng: ${totalRecords}`;
    }
    if (prevButton) {
        prevButton.disabled = currentPage <= 1;
    }
    if (nextButton) {
        nextButton.disabled = currentPage >= totalPages;
    }
}

function setupEventListeners() {
    const contentDiv = document.getElementById('collections-content');

    document.getElementById('category-prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) fetchCategories(currentPage - 1);
    });

    document.getElementById('category-next-page')?.addEventListener('click', () => {
        if (currentPage < totalPages) fetchCategories(currentPage + 1);
    });

    document.getElementById('add-new-btn')?.addEventListener('click', () => {
        const headerObject = JSON.parse(contentDiv.dataset.headers);
        // Pass the entire header object to the modal
        openModal('add', COLLECTION_NAME, headerObject, null, () => fetchCategories(currentPage));
    });

    contentDiv.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const docId = target.dataset.id;
        const row = target.closest('tr');
        const headerObject = JSON.parse(contentDiv.dataset.headers);
        const headerKeys = Object.keys(headerObject);

        if (target.classList.contains('edit-btn')) {
             const dataCells = Array.from(row.cells).slice(1, -1); // Skip STT and Actions
             const data = dataCells.reduce((acc, cell, index) => {
                acc[headerKeys[index]] = cell.textContent;
                return acc;
            }, {});

            openModal('edit', COLLECTION_NAME, headerObject, { id: docId, ...data }, () => fetchCategories(currentPage));
        }

        if (target.classList.contains('delete-btn')) {
            openModal('delete', COLLECTION_NAME, headerObject, { id: docId }, () => fetchCategories(currentPage));
        }
    });
}

export function loadCategoryPage() {
    currentPage = 1;
    totalPages = 1;
    lastDocIds = [null];
    fetchCategories(1);
    setupEventListeners(); // Ensure listeners are set up once
}
