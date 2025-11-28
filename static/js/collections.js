import { createTable, openModal } from './utils.js';

const COLLECTION_NAME = 'items';
let currentPage = 1;
let totalPages = 1;
let lastDocIds = [null]; // Array to store the last doc ID of each page

async function fetchCategories(page = 1) {
    try {
        const pageSize = 10; // Or get from a dropdown
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

        const headers = document.getElementById('collections-content').dataset.headers.split(',');
        const table = createTable(result.data, headers, COLLECTION_NAME,page,pageSize);
        document.getElementById('collections-content').innerHTML = ''; // Clear previous content
        document.getElementById('collections-content').appendChild(table);

        // Store the last document ID for the *next* page
        if (result.last_doc_id && page < result.total_pages) {
             if (lastDocIds.length <= page) {
                lastDocIds.push(result.last_doc_id);
            }
        }

        currentPage = page;
        totalPages = result.total_pages;

        updatePaginationUI(result.total_records);

    } catch (error) {
        console.error('Error fetching categories:', error);
        document.getElementById('collections-content').innerHTML = '<p class="text-red-500">Không thể tải dữ liệu.</p>';
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
    const prevButton = document.getElementById('category-prev-page');
    const nextButton = document.getElementById('category-next-page');
    const addNewBtn = document.getElementById('add-new-btn');

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                fetchCategories(currentPage - 1);
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                fetchCategories(currentPage + 1);
            }
        });
    }

    if (addNewBtn) {
        addNewBtn.addEventListener('click', () => {
            const headers = document.getElementById('collections-content').dataset.headers.split(',');
            openModal('add', COLLECTION_NAME, headers, null, () => fetchCategories(currentPage));
        });
    }

     // Delegate edit/delete events
    document.getElementById('collections-content').addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const docId = target.dataset.id;
        const headers = document.getElementById('collections-content').dataset.headers.split(',');
        const row = target.closest('tr');

        if (target.classList.contains('edit-btn')) {
             const data = Array.from(row.cells).slice(0, -1).reduce((acc, cell, index) => {
                acc[headers[index]] = cell.textContent;
                return acc;
            }, {});
            openModal('edit', COLLECTION_NAME, headers, { id: docId, ...data }, () => fetchCategories(currentPage));
        }

        if (target.classList.contains('delete-btn')) {
            openModal('delete', COLLECTION_NAME, headers, { id: docId }, () => fetchCategories(currentPage));
        }
    });
}

export function loadCategoryPage() {
    // Reset state for when the user navigates back to the page
    currentPage = 1;
    totalPages = 1;
    lastDocIds = [null];

    fetchCategories(1); // Initial load
    setupEventListeners();
}
