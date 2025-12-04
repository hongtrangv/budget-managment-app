import { authenticatedFetch } from './utils.js';
// UPDATED: Import path
import { renderStars, createStarRatingInput } from './components/uiStars.js';

let currentLibraryData = { layout: [], books: [] };
let allBooks = [];
let currentSelectedBook = null;
let allGenres = []; // Cache for genres

/**
 * Fetches genres from the API and caches them.
 */
async function fetchGenres() {
    if (allGenres.length > 0) {
        return; // Use cached genres
    }
    try {
        // UPDATED: Use the new, cached endpoint for genres
        const response = await fetch('/api/genres/');
        if (!response.ok) {
            throw new Error('Could not fetch genres.');
        }
        // The new endpoint returns a list of genres directly
        allGenres = await response.json();
    } catch (error) {
        console.error('Error fetching genres:', error);
    }
}


/**
 * Creates a <select> dropdown for genres.
 * @param {string} currentGenre - The genre that should be pre-selected.
 * @returns {HTMLSelectElement}
 */
function createGenreDropdown(currentGenre = '') {
    const select = document.createElement('select');
    select.name = 'genre';
    select.id = 'book-genre-select';
    select.className = 'form-input-add';

    // Add a default, non-selectable option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Chọn thể loại --';
    select.appendChild(defaultOption);

    allGenres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre.name; // Use genre name as the value
        option.textContent = genre.name;
        if (genre.name === currentGenre) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    return select;
}


function updateStats() {
    const totalBooksCountEl = document.getElementById('total-books-count');
    if (totalBooksCountEl) {
        totalBooksCountEl.textContent = allBooks.length;
    }
}

function createBookElement(bookData, unitType) {
    const bookEl = document.createElement('div');
    bookEl.className = 'book';
    if (unitType === 'vertical') {
        bookEl.classList.add('book-vertical');
    } else {
        bookEl.classList.add('book-horizontal');
    }
    const title = bookData.title || 'Untitled Book';
    const hashCode = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
    bookEl.style.backgroundColor = `hsl(${hashCode(title) % 360}, 50%, 60%)`;
    bookEl.dataset.bookId = bookData.id;
    bookEl.textContent = title;
    bookEl.addEventListener('click', (e) => {
        e.stopPropagation();
        showBookInfoModal(bookData);
    });
    return bookEl;
}

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
                    const displayLimit = booksInCompartment.length > MAX_BOOKS_BEFORE_COUNTING ? MAX_BOOKS_BEFORE_COUNTING : booksInCompartment.length;
                    for (let i = 0; i < displayLimit; i++) {
                        compEl.appendChild(createBookElement(booksInCompartment[i], unit.type));
                    }
                    if (booksInCompartment.length > MAX_BOOKS_BEFORE_COUNTING) {
                        const counter = document.createElement('div');
                        counter.className = 'book-counter';
                        counter.textContent = `+${booksInCompartment.length - MAX_BOOKS_BEFORE_COUNTING}`;
                        compEl.appendChild(counter);
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

export async function loadAndRenderLibrary() {
    try {
        await fetchGenres(); // Pre-fetch genres on initial load
        const [layoutResponse, booksResponse] = await Promise.all([
            fetch('/api/shelves'),
            fetch('/api/books')
        ]);
        if (!layoutResponse.ok || !booksResponse.ok) throw new Error(`Network error`);
        currentLibraryData.layout = await layoutResponse.json();
        allBooks = await booksResponse.json();
        filterAndRender();
        setupGlobalEventListeners();
    } catch (error) {
        console.error("Failed to load library data:", error);
        const libraryContainer = document.getElementById('library-container');
        if (libraryContainer) libraryContainer.innerHTML = `<p class="error-message">Could not load library.</p>`;
    }
}

async function handleAddBook(event) {
    event.preventDefault();
    await generalDescription();
    const form = document.getElementById('add-book-form');
    const formData = new FormData(form);
    const bookData = Object.fromEntries(formData.entries());
    bookData.rowIndex = parseInt(bookData.rowIndex, 10);
    bookData.unitIndex = parseInt(bookData.unitIndex, 10);
    bookData.compIndex = parseInt(bookData.compIndex, 10);
    const ratingContainer = document.getElementById('add-book-rating-container').querySelector('.star-rating-input');
    bookData.rating = ratingContainer ? parseInt(ratingContainer.dataset.rating, 10) : 0;

    try {
        const response = await authenticatedFetch('/api/books', {
            method: 'POST',
            headers: { 'X-Action-Identifier': 'CREATE_BOOK' }, 
            body: JSON.stringify(bookData)
        });
        const newBook = await response.json();
        allBooks.push(newBook);
        filterAndRender();
        hideModal('add-book-modal');
    } catch (error) {
        console.error("Error adding book:", error);
    }
}

async function handleUpdateBook(event) {
    event.preventDefault();
    await generalDescription();   

    if (!currentSelectedBook) return;
    const form = document.getElementById('edit-book-form');
    const formData = new FormData(form);
    const updatedData = Object.fromEntries(formData.entries());
    const ratingContainer = document.getElementById('edit-book-rating-container').querySelector('.star-rating-input');
    updatedData.rating = ratingContainer ? parseInt(ratingContainer.dataset.rating, 10) : 0;
    updatedData.rowIndex = currentSelectedBook.rowIndex;
    updatedData.unitIndex = currentSelectedBook.unitIndex;
    updatedData.compIndex = currentSelectedBook.compIndex;

    try {
        const response = await authenticatedFetch(`/api/books/${currentSelectedBook.id}`, 
            {
            method: 'PUT',
            headers: { 'X-Action-Identifier': 'UPDATE_BOOK' }, 
            body: JSON.stringify(updatedData)
        });
        const updatedBook = await response.json();
        const index = allBooks.findIndex(b => b.id === updatedBook.id);
        if (index !== -1) allBooks[index] = updatedBook;
        filterAndRender();
        hideModal('book-info-modal');
    } catch (error) {
        console.error("Error updating book:", error);
    }
}

async function handleDeleteBook() {
    if (!currentSelectedBook) return;
    if (confirm(`Bạn có chắc chắn muốn xóa sách "${(currentSelectedBook.title || 'Untitled Book')}"?`)) {
        try {
            await authenticatedFetch(`/api/books/${currentSelectedBook.id}`,{
                headers: { 'X-Action-Identifier': 'DELETE_BOOK' }, 
                method: 'DELETE'} );
            allBooks = allBooks.filter(b => b.id !== currentSelectedBook.id);
            filterAndRender();
            hideModal('book-info-modal');
        } catch (error) {
            console.error("Error deleting book:", error);
        }
    }
}

async function generalDescription(){
    const title =document.getElementById('edit-book-title');
    const author = document.getElementById('edit-book-author');
    const description = document.getElementById('edit-book-description')
    if (description.value != '') return;
    let message = `Bạn là chuyên gia phân tích văn học. Bạn tóm tắt giúp tôi tác phần ${title.value} của tác giả ${author.value} trong 100 từ`;
    try {
        const response = await authenticatedFetch('/api/chatbot', {
            method: 'POST',            
            body: JSON.stringify({ message: message }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Network response was not ok');
        description.value = data.reply;
    } catch (error) {
        console.error('Error sending message:', error);
        
    } finally {        
    }
}

function showBookInfoModal(bookData) {
    currentSelectedBook = bookData;
    document.getElementById('modal-view-mode').style.display = 'block';
    document.getElementById('modal-edit-mode').style.display = 'none';
    document.getElementById('modal-book-title-view').textContent = bookData.title || 'Untitled Book';
    document.getElementById('modal-book-author-view').textContent = `Tác giả: ${bookData.author || 'N/A'}`;
    document.getElementById('modal-book-genre-view').textContent = `Thể loại: ${bookData.genre || 'N/A'}`;
    document.getElementById('modal-book-rating-view').innerHTML = renderStars(bookData.rating || 0);
    document.getElementById('modal-book-description-view').textContent = bookData.description || '';
    document.getElementById('modal-book-cover-view').src = bookData.coverImage || '';
    showModal('book-info-modal');
}

async function switchToEditMode() {
    if (!currentSelectedBook) return;
    
    // Populate standard fields
    document.getElementById('edit-book-id').value = currentSelectedBook.id;
    document.getElementById('edit-book-title').value = currentSelectedBook.title || '';
    document.getElementById('edit-book-author').value = currentSelectedBook.author || '';
    document.getElementById('edit-book-description').value = currentSelectedBook.description || '';
    document.getElementById('edit-book-cover').value = currentSelectedBook.coverImage || '';

    // Populate genre dropdown
    const genreContainer = document.getElementById('edit-book-genre-container');
    genreContainer.innerHTML = ''; // Clear previous content
    await fetchGenres(); // Ensure genres are loaded
    const genreDropdown = createGenreDropdown(currentSelectedBook.genre);
    genreContainer.appendChild(genreDropdown);

    // Populate rating input
    const ratingContainer = document.getElementById('edit-book-rating-container');
    ratingContainer.innerHTML = '';
    ratingContainer.appendChild(createStarRatingInput('rating', currentSelectedBook.rating || 0));

    document.getElementById('modal-view-mode').style.display = 'none';
    document.getElementById('modal-edit-mode').style.display = 'block';
}

function cancelEditMode() {
    document.getElementById('modal-view-mode').style.display = 'block';
    document.getElementById('modal-edit-mode').style.display = 'none';
}

async function showAddBookModal(rowIndex, unitIndex, compIndex) {
    document.getElementById('add-book-form').reset();
    document.getElementById('form-row-index').value = rowIndex;
    document.getElementById('form-unit-index').value = unitIndex;
    document.getElementById('form-comp-index').value = compIndex;
    document.getElementById('form-location-text').textContent = `Hàng ${rowIndex + 1}, Kệ ${unitIndex + 1}, Ngăn ${compIndex + 1}`;

    // Populate genre dropdown
    const genreContainer = document.getElementById('add-book-genre-container');
    genreContainer.innerHTML = '';
    await fetchGenres();
    const genreDropdown = createGenreDropdown();
    genreContainer.appendChild(genreDropdown);

    // Populate rating input
    const ratingContainer = document.getElementById('add-book-rating-container');
    ratingContainer.innerHTML = '';
    ratingContainer.appendChild(createStarRatingInput('rating', 0));

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

function filterAndRender() {
    const searchInput = document.getElementById('book-search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    currentLibraryData.books = searchTerm.trim() === '' ? [...allBooks] : allBooks.filter(book => {
        const title = (book.title || '').toLowerCase();
        const author = (book.author || '').toLowerCase();
        return title.includes(searchTerm) || author.includes(searchTerm);
    });
    renderBookshelf();
}

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
