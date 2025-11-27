import { showAlert } from './utils.js';

// This function will be called by app.js after the chatbot.html page is loaded.
export function loadChatbotPage() {
    const chatHistory = document.getElementById('chat-history');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('chat-send-btn');

    // --- FUNCTIONS ---

    /**
     * Appends a message to the chat history UI.
     * @param {string} text The message text.
     * @param {string} sender 'user' or 'bot'.
     */
    function appendMessage(text, sender) {
        const messageElement = document.createElement('div');
        const bubble = document.createElement('div');
        
        messageElement.classList.add('flex', 'mb-4');
        bubble.classList.add('py-2', 'px-4', 'rounded-lg', 'shadow-md', 'max-w-lg', 'md:max-w-xl');

        if (sender === 'user') {
            messageElement.classList.add('justify-end');
            bubble.classList.add('bg-green-500', 'text-white');
        } else {
            messageElement.classList.add('justify-start');
            bubble.classList.add('bg-white', 'text-gray-800'); // Changed for better contrast
        }

        // Use innerText to prevent HTML injection issues
        bubble.innerText = text;
        messageElement.appendChild(bubble);
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight; // Auto-scroll
    }

    /**
     * Sends a message to the backend and displays the response.
     */
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        appendMessage(message, 'user');
        chatInput.value = '';
        sendButton.disabled = true;
        chatInput.disabled = true;

        try {
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message }),
            });

            const data = await response.json();
            
            if (!response.ok) {
                 // Use the error from the JSON response if available
                throw new Error(data.error || 'Network response was not ok');
            }

            appendMessage(data.reply, 'bot');

        } catch (error) {
            console.error('Error sending message:', error);
            appendMessage(`Lỗi: ${error.message}`, 'bot'); // Show error in chat
        } finally {
            sendButton.disabled = false;
            chatInput.disabled = false;
            chatInput.focus();
        }
    }

    /**
     * Fetches chat history from the server and displays it.
     */
    async function loadHistory() {
        // Show a temporary loading message
        chatHistory.innerHTML = '<p class="text-center text-gray-500">Đang tải lịch sử trò chuyện...</p>';
        try {
            const response = await fetch('/api/chatbot/history');
            if (!response.ok) {
                throw new Error('Failed to load chat history');
            }
            const history = await response.json();
            
            chatHistory.innerHTML = ''; // Clear loading message

            if (history.length === 0) {
                appendMessage('Xin chào! Bạn muốn hỏi gì về tài chính hôm nay?', 'bot');
            } else {
                history.forEach(item => {
                    // Ensure both fields exist before appending
                    if (item.message) appendMessage(item.message, 'user');
                    if (item.reply) appendMessage(item.reply, 'bot');
                });
            }
        } catch (error) {
            console.error('Error loading history:', error);
            chatHistory.innerHTML = ''; // Clear loading message
            showAlert('error', 'Không thể tải lịch sử trò chuyện. Vui lòng làm mới trang.');
        }
    }

    // --- EVENT LISTENERS ---

    // Check if listeners already exist to avoid duplication
    if (!sendButton.hasAttribute('data-listener-attached')) {
        sendButton.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        sendButton.setAttribute('data-listener-attached', 'true');
    }

    // --- INITIALIZATION ---
    loadHistory();
}
