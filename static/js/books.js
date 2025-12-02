import { authenticatedFetch } from './utils.js';
/**
 * Global state to hold the library data.
 */
let currentLibraryData = { layout: [], books: [] };
/**
 * Master list of all books, separate from the displayed list.
 */
let allBooks = [];

/**
 * A global variable to hold the currently selected book's data.
 */
let currentSelectedBook = null;

/**
 * Updates the statistics in the header.
 */
function updateStats() {
    const totalBooksCountEl = document.getElementById('total-books-count');
    if (totalBooksCountEl) {
        totalBooksCountEl.textContent = allBooks.length; 
    }
}

/**
 * Creates a single book element robustly.
 * It respects the shelf's orientation (unitType).
 */
function createBookElement(bookData, unitType) {
    const bookEl = document.createElement('div');
    bookEl.className = 'book';

    // Display books based on the shelf's orientation.
    if (unitType === 'vertical') {
        bookEl.classList.add('book-vertical');
    } else {
        bookEl.classList.add('book-horizontal');
    }
    
    // Safely get title, providing a fallback.
    const title = bookData.title || 'Untitled Book';

    const hashCode = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
    bookEl.style.backgroundColor = `hsl(${hashCode(title) % 360}, 50%, 60%)`;

    bookEl.dataset.bookId = bookData.id;
    bookEl.textContent = title; // Set text content safely.

    bookEl.addEventListener('click', (e) => {
        e.stopPropagation(); 
        showBookInfoModal(bookData);
    });

    return bookEl;
}

/**
 * Renders the bookshelf.
 */
function renderBookshelf() {
    const libraryContainer = document.getElementById('library-container');
    if (!libraryContainer) return;

    libraryContainer.innerHTML = '';
    const { layout, books } = currentLibraryData;
    if (!layout || layout.length === 0) return;

    const MAX_BOOKS_BEFORE_COUNTING = 10;

    layout.forEach((row, rowIndex) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'library-row';

        row.units.forEach((unit, unitIndex) => {
            const unitEl = document.createElement('div');
            unitEl.classList.add('unit', `unit-${unit.type}`);
            unitEl.style.flexGrow = unit.compartments;

            for (let compIndex = 0; compIndex < unit.compartments; compIndex++) {
                const compEl = document.createElement('div');
                compEl.className = 'compartment';

                const booksInCompartment = books.filter(book => 
                    book.rowIndex === rowIndex && 
                    book.unitIndex === unitIndex && 
                    book.compIndex === compIndex
                );

                if (booksInCompartment.length > 0) {
                    if (booksInCompartment.length > MAX_BOOKS_BEFORE_COUNTING) {
                        for (let i = 0; i < MAX_BOOKS_BEFORE_COUNTING; i++) {
                            const bookData = booksInCompartment[i];
                            const bookEl = createBookElement(bookData, unit.type);
                            compEl.appendChild(bookEl);
                        }

                        const counter = document.createElement('div');
                        counter.className = 'book-counter';
                        counter.textContent = `+${booksInCompartment.length - MAX_BOOKS_BEFORE_COUNTING}`;
                        compEl.appendChild(counter);
                    } else {
                        booksInCompartment.forEach(bookData => {
                            const bookEl = createBookElement(bookData, unit.type);
                            compEl.appendChild(bookEl);
                        });
                    }
                } else {
                    compEl.classList.add('compartment--empty');
                }

                compEl.addEventListener('click', () => {
                    showAddBookModal(rowIndex, unitIndex, compIndex);
                });

                unitEl.appendChild(compEl);
            }
            rowEl.appendChild(unitEl);
        });
        libraryContainer.appendChild(rowEl);
    });
    
    updateStats();
}


/**
 * Fetches all necessary data from the server and initializes the view.
 */
export async function loadAndRenderLibrary() {
    try {
        const [layoutResponse, booksResponse] = await Promise.all([
            fetch('/api/shelves'),
            fetch('/api/books')
        ]);

        if (!layoutResponse.ok || !booksResponse.ok) {
            throw new Error(`Network error`);
        }

        currentLibraryData.layout = await layoutResponse.json();
        const booksFromServer = await booksResponse.json();

        allBooks = [...booksFromServer];
        
        // Initial load uses all books
        filterAndRender(); 
        setupGlobalEventListeners();

    } catch (error) {
        console.error("Failed to load library data:", error);
        const libraryContainer = document.getElementById('library-container');
        if (libraryContainer) libraryContainer.innerHTML = `<p class="error-message">Could not load library.</p>`;
    }
}

// --- CRUD Operations --- //

async function handleAddBook(event) {
    event.preventDefault();
    const form = document.getElementById('add-book-form');
    const formData = new FormData(form);
    const bookData = Object.fromEntries(formData.entries());

    bookData.rowIndex = parseInt(bookData.rowIndex, 10);
    bookData.unitIndex = parseInt(bookData.unitIndex, 10);
    bookData.compIndex = parseInt(bookData.compIndex, 10);

    try {
        const uri = `/api/books`;        
        const newBook = await authenticatedFetch(uri, {
            method: 'POST',
            headers: { 'X-Action-Identifier': 'CREATE_BOOK' },
            body: JSON.stringify(bookData)
        });        
        allBooks.push(newBook);
        filterAndRender();
        hideModal('add-book-modal');
    } catch (error) {
        console.error("Error adding book:", error);
        alert(error.message);
    }
}

async function handleUpdateBook(event) {
    event.preventDefault();
    if (!currentSelectedBook) return;

    const form = document.getElementById('edit-book-form');
    const formData = new FormData(form);
    const updatedData = Object.fromEntries(formData.entries());

    updatedData.rowIndex = currentSelectedBook.rowIndex;
    updatedData.unitIndex = currentSelectedBook.unitIndex;
    updatedData.compIndex = currentSelectedBook.compIndex;

    try {
        const uri = `/api/books/${currentSelectedBook.id}`;        
        const updatedBook = await authenticatedFetch(uri, {
            method: 'PUT',
            headers: { 'X-Action-Identifier': 'UPDATE_BOOK' },
            body: JSON.stringify(updatedData)
        });        ;

        const index = allBooks.findIndex(b => b.id === updatedBook.id);
        if (index !== -1) allBooks[index] = updatedBook;
        
        filterAndRender();
        hideModal('book-info-modal');
    } catch (error) {
        console.error("Error updating book:", error);
        alert(error.message);
    }
}

async function handleDeleteBook() {
    if (!currentSelectedBook) return;

    if (confirm(`Bạn có chắc chắn muốn xóa sách "${(currentSelectedBook.title || 'Untitled Book')}"?`)) {
        try {           
            const uri = `/api/books/${currentSelectedBook.id}`;        
            await authenticatedFetch(uri, {
                method: 'DELETE',
                headers: { 'X-Action-Identifier': 'DELETE_BOOK' }
            });        ;
            allBooks = allBooks.filter(b => b.id !== currentSelectedBook.id);
            
            filterAndRender();
            hideModal('book-info-modal');
        } catch (error) {
            console.error("Error deleting book:", error);
            alert(error.message);
        }
    }
}

// --- Modal Management & UI Logic --- //

function showBookInfoModal(bookData) {
    currentSelectedBook = bookData;
    
    document.getElementById('modal-view-mode').style.display = 'block';
    document.getElementById('modal-edit-mode').style.display = 'none';

    document.getElementById('modal-book-title-view').textContent = bookData.title || 'Untitled Book';
    document.getElementById('modal-book-author-view').textContent = `Tác giả: ${bookData.author || 'N/A'}`;
    document.getElementById('modal-book-description-view').textContent = bookData.description || '';
    document.getElementById('modal-book-cover-view').src = bookData.coverImage || '';

    showModal('book-info-modal');
}

function switchToEditMode() {
    if (!currentSelectedBook) return;

    document.getElementById('edit-book-id').value = currentSelectedBook.id;
    document.getElementById('edit-book-title').value = currentSelectedBook.title || '';
    document.getElementById('edit-book-author').value = currentSelectedBook.author || '';
    document.getElementById('edit-book-description').value = currentSelectedBook.description || '';
    document.getElementById('edit-book-cover').value = currentSelectedBook.coverImage || '';

    document.getElementById('modal-view-mode').style.display = 'none';
    document.getElementById('modal-edit-mode').style.display = 'block';
}

function cancelEditMode() {
    document.getElementById('modal-view-mode').style.display = 'block';
    document.getElementById('modal-edit-mode').style.display = 'none';
}

function showAddBookModal(rowIndex, unitIndex, compIndex) {
    document.getElementById('add-book-form').reset();
    document.getElementById('form-row-index').value = rowIndex;
    document.getElementById('form-unit-index').value = unitIndex;
    document.getElementById('form-comp-index').value = compIndex;
    document.getElementById('form-location-text').textContent = `Hàng ${rowIndex + 1}, Kệ ${unitIndex + 1}, Ngăn ${compIndex + 1}`;
    showModal('add-book-modal');
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show');
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
    currentSelectedBook = null; 
}

/**
 * Filters the master book list based on search term and re-renders the bookshelf.
 * This is now robust against missing title or author data.
 */
function filterAndRender() {
    const searchInput = document.getElementById('book-search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    if (searchTerm.trim() === '') {
        currentLibraryData.books = [...allBooks];
    } else {
        currentLibraryData.books = allBooks.filter(book => {
            const title = (book.title || '').toLowerCase();
            const author = (book.author || '').toLowerCase();
            return title.includes(searchTerm) || author.includes(searchTerm);
        });
    }
    renderBookshelf();
}

// --- Event Listeners Setup --- //

let areListenersInitialized = false;

function setupGlobalEventListeners() {
    if (areListenersInitialized) return;

    document.querySelectorAll('.modal-close-btn, .modal-close-btn-add').forEach(btn => {
        btn.onclick = (e) => {
            const modal = e.target.closest('.book-modal');
            if (modal) hideModal(modal.id);
        };
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('book-modal')) {
            hideModal(event.target.id);
        }
    });

    document.getElementById('add-book-form').addEventListener('submit', handleAddBook);
    document.getElementById('edit-book-form').addEventListener('submit', handleUpdateBook);

    document.getElementById('modal-edit-btn').addEventListener('click', switchToEditMode);
    document.getElementById('modal-cancel-btn').addEventListener('click', cancelEditMode);
    document.getElementById('modal-delete-btn').addEventListener('click', handleDeleteBook);

    document.getElementById('book-search-input').addEventListener('input', filterAndRender);

    areListenersInitialized = true;
}

// Initialize the library
loadAndRenderLibrary();
