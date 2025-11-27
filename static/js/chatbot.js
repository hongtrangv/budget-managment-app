import { showAlert } from './utils.js';

// This single function will initialize the entire chatbot widget logic.
export function initializeChatbotWidget() {
    // Widget elements
    const chatbotWidget = document.getElementById('chatbot-widget');
    const openWidgetBtn = document.getElementById('open-chatbot-widget'); // Button in the main menu
    const closeWidgetBtn = document.getElementById('close-chatbot-widget');
    
    // Chat elements
    const chatHistory = document.getElementById('chatbot-history');
    const chatInput = document.getElementById('chatbot-input');
    const sendButton = document.getElementById('chatbot-send-btn');

    let historyLoaded = false;

    // --- FUNCTIONS ---

    function toggleWidget(isOpen) {
        if (isOpen) {
            chatbotWidget.classList.add('is-open');
            chatInput.focus();
            // Load history only on the first time the widget is opened
            if (!historyLoaded) {
                loadHistory();
                historyLoaded = true;
            }
        } else {
            chatbotWidget.classList.remove('is-open');
        }
    }

    function appendMessage(text, sender) {
        const messageElement = document.createElement('div');
        const bubble = document.createElement('div');
        messageElement.classList.add('flex', 'mb-4');
        bubble.classList.add('py-2', 'px-4', 'rounded-lg', 'shadow-md', 'max-w-lg');

        if (sender === 'user') {
            messageElement.classList.add('justify-end');
            bubble.classList.add('bg-green-500', 'text-white');
        } else {
            messageElement.classList.add('justify-start');
            bubble.classList.add('bg-white', 'text-gray-800');
        }
        bubble.innerText = text;
        messageElement.appendChild(bubble);
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

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
            if (!response.ok) throw new Error(data.error || 'Network response was not ok');
            appendMessage(data.reply, 'bot');
        } catch (error) {
            console.error('Error sending message:', error);
            appendMessage(`Lỗi: ${error.message}`, 'bot');
        } finally {
            sendButton.disabled = false;
            chatInput.disabled = false;
            chatInput.focus();
        }
    }

    async function loadHistory() {
        chatHistory.innerHTML = '<p class="text-center text-gray-500">Đang tải lịch sử...</p>';
        try {
            const response = await fetch('/api/chatbot/history');
            if (!response.ok) throw new Error('Failed to load chat history');
            const history = await response.json();
            chatHistory.innerHTML = ''; // Clear loading message

            if (history.length === 0) {
                appendMessage('Xin chào! Bạn cần hỗ trợ gì về tài chính hôm nay?', 'bot');
            } else {
                history.forEach(item => {
                    if (item.message) appendMessage(item.message, 'user');
                    if (item.reply) appendMessage(item.reply, 'bot');
                });
            }
        } catch (error) {
            console.error('Error loading history:', error);
            chatHistory.innerHTML = '';
            showAlert('error', 'Không thể tải lịch sử trò chuyện.');
        }
    }

    // --- EVENT LISTENERS ---
    if (openWidgetBtn) {
        openWidgetBtn.addEventListener('click', () => toggleWidget(true));
    }
    if (closeWidgetBtn) {
        closeWidgetBtn.addEventListener('click', () => toggleWidget(false));
    }

    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    console.log('Chatbot Widget Initialized');
}
