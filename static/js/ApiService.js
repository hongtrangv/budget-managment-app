/**
 * @fileoverview A service class for making authenticated API requests to the backend.
 * It encapsulates fetch logic, error handling, and authentication headers.
 */

/**
 * A wrapper class for making authenticated API requests.
 */
class ApiService {
    /**
     * @param {string} apiKey The API key for authentication.
     */
    constructor(apiKey) {
        if (!apiKey) {
            console.warn('API key is not set. API requests may fail.');
        }
        this.apiKey = apiKey;
    }

    /**
     * Performs a generic authenticated fetch request.
     * This is the base method used by get, post, put, delete.
     * @param {string} url - The URL to fetch.
     * @param {object} options - The options for the fetch request.
     * @param {string} [actionIdentifier] - The specific action being performed, if any.
     * @returns {Promise<any>} - The JSON response from the server.
     * @throws {Error} - Throws an error if the request fails.
     */
    async _fetch(url, options = {}, actionIdentifier = null) {
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };

        if (actionIdentifier) {
            headers['X-Action-Identifier'] = actionIdentifier;
        }

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'An unknown server error occurred.' }));
                const errorMessage = errorData.error || errorData.message || `Request failed with status ${response.status}`;
                
                if (window.showAlert) {
                    window.showAlert('error', `Lỗi API: ${errorMessage}`);
                } else {
                    console.error(`API Error: ${errorMessage}`);
                }
                throw new Error(errorMessage);
            }

            if (response.status === 204) { // No Content
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error.message);
            if (window.showAlert && !error.message.startsWith('Lỗi API')) {
                window.showAlert('error', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.');
            }
            throw error;
        }
    }

    /**
     * Performs a GET request.
     * @param {string} url - The URL for the GET request.
     * @returns {Promise<any>}
     */
    get(url) {
        return this._fetch(url, { method: 'GET' });
    }

    /**
     * Performs a POST request.
     * @param {string} url - The URL for the POST request.
     * @param {object} body - The body of the request.
     * @param {string} [actionIdentifier] - The action identifier for the request.
     * @returns {Promise<any>}
     */
    post(url, body, actionIdentifier = null) {
        return this._fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
        }, actionIdentifier);
    }

    /**
     * Performs a PUT request.
     * @param {string} url - The URL for the PUT request.
     * @param {object} body - The body of the request.
     * @param {string} [actionIdentifier] - The action identifier for the request.
     * @returns {Promise<any>}
     */
    put(url, body, actionIdentifier = null) {
        return this._fetch(url, {
            method: 'PUT',
            body: JSON.stringify(body),
        }, actionIdentifier);
    }

    /**
     * Performs a DELETE request.
     * @param {string} url - The URL for the DELETE request.
     * @param {string} [actionIdentifier] - The action identifier for the request.
     * @returns {Promise<any>}
     */
    delete(url, actionIdentifier = null) {
        return this._fetch(url, {
            method: 'DELETE',
        }, actionIdentifier);
    }
}

// Create and export a singleton instance of the ApiService.
// It relies on window.API_KEY being set in the main HTML file.
const apiService = new ApiService(window.API_KEY);

export default apiService;
