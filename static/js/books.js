/**
 * Global state to hold the library data.
 */
let currentLibraryData = { layout: [], books: [] };

/**
 * Creates a single book element.
 */
function createBookElement(bookData, unitType) {
    const bookEl = document.createElement('div');
    bookEl.className = 'book';

    if (unitType === 'vertical') {
        bookEl.style.height = `${Math.floor(Math.random() * 40 + 100)}px`;
        bookEl.classList.add('book-vertical');
    } else {
        bookEl.style.height = `${Math.floor(Math.random() * 30 + 70)}px`;
        bookEl.classList.add('book-horizontal');
    }
    
    const hashCode = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
    bookEl.style.backgroundColor = `hsl(${hashCode(bookData.title) % 360}, 50%, 60%)`;

    bookEl.textContent = bookData.title;
    bookEl.dataset.bookId = bookData.id; // Store ID for later
    bookEl.addEventListener('click', (e) => {
        e.stopPropagation(); 
        showBookInfoModal(bookData);
    });

    return bookEl;
}

/**
 * Renders the entire bookshelf from global data.
 */
function renderBookshelf() {
    const libraryContainer = document.getElementById('library-container');
    if (!libraryContainer) return;

    libraryContainer.innerHTML = ''; 
    const { layout, books } = currentLibraryData;

    if (!layout || layout.length === 0) return;

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

                booksInCompartment.forEach(bookData => {
                    const bookEl = createBookElement(bookData, unit.type);
                    compEl.appendChild(bookEl);
                });

                compEl.addEventListener('click', () => {
                    showAddBookModal(rowIndex, unitIndex, compIndex);
                });

                unitEl.appendChild(compEl);
            }
            rowEl.appendChild(unitEl);
        });
        libraryContainer.appendChild(rowEl);
    });
}

/**
 * Fetches data, renders the library, and sets up listeners.
 */
export async function loadAndRenderLibrary() {
    const libraryContainer = document.getElementById('library-container');
    try {
        const [layoutResponse, booksResponse] = await Promise.all([
            fetch('/api/shelves'),
            fetch('/api/books')
        ]);

        if (!layoutResponse.ok || !booksResponse.ok) {
            throw new Error(`Network error`);
        }

        currentLibraryData.layout = await layoutResponse.json();
        currentLibraryData.books = await booksResponse.json();

        renderBookshelf();
        setupGlobalEventListeners();

    } catch (error) {
        console.error("Failed to load library data:", error);
        if (libraryContainer) libraryContainer.innerHTML = `<p class="error-message">Could not load library.</p>`;
    }
}

/**
 * Handles the form submission for adding a new book.
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    const form = document.getElementById('add-book-form');
    const formData = new FormData(form);
    const bookData = Object.fromEntries(formData.entries());

    bookData.rowIndex = parseInt(bookData.rowIndex, 10);
    bookData.unitIndex = parseInt(bookData.unitIndex, 10);
    bookData.compIndex = parseInt(bookData.compIndex, 10);

    try {
        const response = await fetch('/api/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookData)
        });

        if (!response.ok) {
            throw new Error('Failed to add book.');
        }

        const newBook = await response.json();
        
        currentLibraryData.books.push(newBook);
        renderBookshelf();
        hideModal('add-book-modal');

    } catch (error) {
        console.error("Error adding book:", error);
        alert(error.message);
    }
}

// --- Modal Management --- //

function showBookInfoModal(bookData) {
    const modal = document.getElementById('book-info-modal');
    if (!modal) return;

    document.getElementById('modal-book-title').textContent = bookData.title;
    document.getElementById('modal-book-author').textContent = `Tác giả: ${bookData.author}`;
    document.getElementById('modal-book-description').textContent = bookData.description;
    document.getElementById('modal-book-cover').src = bookData.coverImage || '';

    modal.classList.add('show');
}

function showAddBookModal(rowIndex, unitIndex, compIndex) {
    const modal = document.getElementById('add-book-modal');
    if (!modal) return;

    document.getElementById('add-book-form').reset();
    document.getElementById('form-row-index').value = rowIndex;
    document.getElementById('form-unit-index').value = unitIndex;
    document.getElementById('form-comp-index').value = compIndex;
    document.getElementById('form-location-text').textContent = `Hàng ${rowIndex + 1}, Kệ ${unitIndex + 1}, Ngăn ${compIndex + 1}`;
    
    modal.classList.add('show');
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

let areListenersInitialized = false;

function setupGlobalEventListeners() {
    if (areListenersInitialized) return;

    document.querySelectorAll('.modal-close-btn, .modal-close-btn-add').forEach(btn => {
        btn.onclick = (e) => {
            const modal = e.target.closest('.book-modal');
            if (modal) {
                hideModal(modal.id);
            }
        };
    });

    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('book-modal')) {
            hideModal(event.target.id);
        }
    });

    document.getElementById('add-book-form').addEventListener('submit', handleFormSubmit);

    // The event listener for the now-removed button is also removed.

    areListenersInitialized = true;
}
