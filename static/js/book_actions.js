import { authenticatedFetch } from './utils.js';
import { createStarRatingInput } from './components/uiStars.js';

let allGenres = []; // Cache for genres
let currentSelectedBook = null;
let allBooks = []; // This will be a local cache, might be partial

/**
 * Fetches genres from the API and caches them.
 */
async function fetchGenres() {
    if (allGenres.length > 0) return; // Use cached genres
    try {
        const response = await fetch('/api/genres/');
        if (!response.ok) throw new Error('Could not fetch genres.');
        allGenres = await response.json();
    } catch (error) {
        console.error('Error fetching genres:', error);
    }
}

/**
 * Creates a <select> dropdown for genres.
 */
function createGenreDropdown(currentGenre = '') {
    const select = document.createElement('select');
    select.name = 'genre';
    select.id = 'book-genre-select';
    select.className = 'form-input-add';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Chọn thể loại --';
    select.appendChild(defaultOption);

    allGenres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre.name;
        option.textContent = genre.name;
        if (genre.name === currentGenre) option.selected = true;
        select.appendChild(option);
    });

    return select;
}

/**
 * Populates genre dropdown and rating input for a form.
 */
async function populateGenreAndRating(genreContainerId, ratingContainerId, currentGenre = '', currentRating = 0) {
    await fetchGenres();
    
    const genreContainer = document.getElementById(genreContainerId);
    if (genreContainer) {
        genreContainer.innerHTML = '';
        genreContainer.appendChild(createGenreDropdown(currentGenre));
    }

    const ratingContainer = document.getElementById(ratingContainerId);
    if (ratingContainer) {
        ratingContainer.innerHTML = '';
        ratingContainer.appendChild(createStarRatingInput('rating', currentRating));
    }
}

/**
 * Shows a modal by its ID.
 */
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show');
}

/**
 * Hides a modal by its ID.
 */
export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
    if (modalId === 'book-info-modal') {
        currentSelectedBook = null;
        const viewMode = document.getElementById('modal-view-mode');
        const editMode = document.getElementById('modal-edit-mode');
        if (viewMode) viewMode.style.display = 'block';
        if (editMode) editMode.style.display = 'none';
    }
}

async function generateDescription(titleFieldId, authorFieldId, descriptionFieldId) {
    const titleField = document.getElementById(titleFieldId);
    const authorField = document.getElementById(authorFieldId);
    const descriptionField = document.getElementById(descriptionFieldId);
    
    if (!titleField?.value || !authorField?.value) return;
    
    const message = `Bạn là chuyên gia phân tích văn học. Bạn tóm tắt giúp tôi tác phẩm ${titleField.value} của tác giả ${authorField.value} trong 100 từ`;
    
    try {
        const response = await authenticatedFetch('/api/chatbot', {
            method: 'POST',
            body: JSON.stringify({ message, saveHistory: false }),
        });
        const data = await response.json();
        if (data.reply) descriptionField.value = data.reply;
    } catch (error) {
        console.error('Error generating description:', error);
    }
}

async function handleUpdateBook(event) {
    event.preventDefault();
    if (!currentSelectedBook) return;

    const form = document.getElementById('edit-book-form');
    const formData = new FormData(form);
    const updatedData = Object.fromEntries(formData.entries());
    const ratingContainer = document.getElementById('edit-book-rating-container').querySelector('.star-rating-input');
    updatedData.rating = ratingContainer ? parseInt(ratingContainer.dataset.rating, 10) : 0;
    // Preserve location if it exists
    updatedData.rowIndex = currentSelectedBook.rowIndex;
    updatedData.unitIndex = currentSelectedBook.unitIndex;
    updatedData.compIndex = currentSelectedBook.compIndex;

    try {
        const response = await authenticatedFetch(`/api/books/${currentSelectedBook.id}`, {
            method: 'PUT',
            headers: { 'X-Action-Identifier': 'UPDATE_BOOK' },
            body: JSON.stringify(updatedData)
        });
        const updatedBook = await response.json();
        
        // Update local cache
        const index = allBooks.findIndex(b => b.id === updatedBook.id);
        if (index !== -1) allBooks[index] = updatedBook;

        hideModal('book-info-modal');
        
        // Reload page to show updated details
        window.location.reload();

    } catch (error) {
        console.error("Error updating book:", error);
    }
}

async function handleDeleteBook() {
    if (!currentSelectedBook) return;
    if (confirm(`Bạn có chắc chắn muốn xóa sách "${(currentSelectedBook.title || 'Untitled Book')}"?`)) {
        try {
            await authenticatedFetch(`/api/books/${currentSelectedBook.id}`, {
                method: 'DELETE',
                headers: { 'X-Action-Identifier': 'DELETE_BOOK' },
            });
            
            // Remove from local cache
            allBooks = allBooks.filter(b => b.id !== currentSelectedBook.id);
            hideModal('book-info-modal');
            
            // Navigate to the main library page after deletion
            window.location.href = '/bookstore';

        } catch (error) {
            console.error("Error deleting book:", error);
        }
    }
}

async function switchToEditMode() {
    if (!currentSelectedBook) return;
    
    document.getElementById('edit-book-id').value = currentSelectedBook.id;
    document.getElementById('edit-book-title').value = currentSelectedBook.title || '';
    document.getElementById('edit-book-author').value = currentSelectedBook.author || '';
    document.getElementById('edit-book-description').value = currentSelectedBook.description || '';
    document.getElementById('edit-book-cover').value = currentSelectedBook.coverImage || '';

    await populateGenreAndRating('edit-book-genre-container', 'edit-book-rating-container', currentSelectedBook.genre, currentSelectedBook.rating);
    
    document.getElementById('modal-view-mode').style.display = 'none';
    document.getElementById('modal-edit-mode').style.display = 'block';
}

function cancelEditMode() {
    document.getElementById('modal-view-mode').style.display = 'block';
    document.getElementById('modal-edit-mode').style.display = 'none';
}

// This function will be called from books.js
export async function showAddBookModal(rowIndex, unitIndex, compIndex) {
    document.getElementById('add-book-form').reset();
    document.getElementById('form-row-index').value = rowIndex;
    document.getElementById('form-unit-index').value = unitIndex;
    document.getElementById('form-comp-index').value = compIndex;
    document.getElementById('form-location-text').textContent = `Hàng ${rowIndex + 1}, Kệ ${unitIndex + 1}, Ngăn ${compIndex + 1}`;

    await populateGenreAndRating('add-book-genre-container', 'add-book-rating-container');

    showModal('add-book-modal');
}

/**
 * Main initialization function for all book-related actions and modals.
 */
export function initializeBookActions() {
    // Listener for modal close buttons
    document.querySelectorAll('.modal-close-btn, .modal-close-btn-add').forEach(btn => {
        btn.onclick = (e) => {
            const modal = e.target.closest('.book-modal');
            if (modal) hideModal(modal.id);
        };
    });

    // Listener to close modal when clicking on the background
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('book-modal')) {
            hideModal(event.target.id);
        }
    });

    // Form submission listeners
    document.getElementById('edit-book-form').addEventListener('submit', handleUpdateBook);

    // Button listeners within modals
    document.getElementById('modal-edit-btn').addEventListener('click', switchToEditMode);
    document.getElementById('modal-cancel-btn').addEventListener('click', cancelEditMode);
    document.getElementById('modal-delete-btn').addEventListener('click', handleDeleteBook);

    // Description generator listeners
    document.getElementById('add-generate-description-btn').addEventListener('click', () => {
        generateDescription('add-book-title', 'add-book-author', 'add-book-description');
    });
    document.getElementById('edit-generate-description-btn').addEventListener('click', () => {
        generateDescription('edit-book-title', 'edit-book-author', 'edit-book-description');
    });

    // Event delegation for buttons on the book detail page
    document.addEventListener('click', async (event) => {
        const bookDetailContainer = event.target.closest('.book-detail-container');
        if (!bookDetailContainer) return;

        const bookId = bookDetailContainer.dataset.bookId;
        if (!bookId) return;

        // Fetch the book details to ensure we have the latest data
        try {
            const response = await fetch(`/api/books/${bookId}`);
            if (!response.ok) throw new Error('Book not found');
            currentSelectedBook = await response.json();

            // Now that we have the book, handle the button click
            if (event.target.id === 'detail-edit-btn') {
                // Pre-fill and show the edit modal
                await switchToEditMode();
                showModal('book-info-modal');
            } else if (event.target.id === 'detail-delete-btn') {
                handleDeleteBook();
            }
        } catch (error) {
            console.error('Failed to fetch book details for action:', error);
        }
    });
}
