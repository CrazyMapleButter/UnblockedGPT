class ChatApp {
    constructor() {
        // DOM elements
        this.chatHistory = document.getElementById('chat-history');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.loadingElement = document.getElementById('loading');
        this.imageInput = document.getElementById('image-input');
        this.imageButton = document.getElementById('image-button');
        this.imagePreviewContainer = document.getElementById('image-preview-container');
        
        // Sidebar elements
        this.sidebar = document.getElementById('sidebar');
        this.sidebarOverlay = document.getElementById('sidebar-overlay');
        this.menuBtn = document.getElementById('menu-btn');
        this.sidebarToggle = document.getElementById('sidebar-toggle');
        this.newChatBtn = document.getElementById('new-chat-btn');
        this.chatList = document.getElementById('chat-list');
        this.mainContent = document.querySelector('.main-content');
        
        // App state
        this.selectedImages = [];
        this.chats = new Map();
        this.currentChatId = null;
        this.isMobile = window.innerWidth <= 768;
        
        this.initializeApp();
    }
    
    initializeApp() {
        this.loadChatsFromStorage();
        this.initializeEventListeners();
        this.handleResize();
        
        // Create first chat if none exist
        if (this.chats.size === 0) {
            this.createNewChat();
        } else {
            // Load the most recent chat
            const chatIds = Array.from(this.chats.keys());
            this.switchToChat(chatIds[chatIds.length - 1]);
        }
    }
    
    initializeEventListeners() {
        // Message sending
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.userInput.addEventListener('input', () => {
            this.adjustTextareaHeight();
        });
        
        // Image handling
        this.imageButton.addEventListener('click', () => {
            this.imageInput.click();
        });
        
        this.imageInput.addEventListener('change', (e) => {
            this.handleImageSelect(e);
        });
        
        // Sidebar controls
        this.menuBtn.addEventListener('click', () => this.toggleSidebar());
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());
        this.newChatBtn.addEventListener('click', () => this.createNewChat());
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }
    
    // ==================== CHAT MANAGEMENT ====================
    
    createNewChat() {
        const chatId = 'chat_' + Date.now();
        const chat = {
            id: chatId,
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.chats.set(chatId, chat);
        this.currentChatId = chatId;
        this.saveChatsToStorage();
        this.renderChatList();
        this.clearChatHistory();
        this.focusInput();
        
        if (this.isMobile) {
            this.closeSidebar();
        }
    }
    
    switchToChat(chatId) {
        if (!this.chats.has(chatId)) return;
        
        this.currentChatId = chatId;
        const chat = this.chats.get(chatId);
        this.renderChatHistory(chat.messages);
        this.renderChatList();
        
        if (this.isMobile) {
            this.closeSidebar();
        }
        
        this.focusInput();
    }
    
    deleteChat(chatId, event) {
        event.stopPropagation();
        
        if (this.chats.size <= 1) {
            return; // Don't delete the last chat
        }
        
        this.chats.delete(chatId);
        
        if (this.currentChatId === chatId) {
            // Switch to another chat
            const remainingChats = Array.from(this.chats.keys());
            this.switchToChat(remainingChats[remainingChats.length - 1]);
        }
        
        this.saveChatsToStorage();
        this.renderChatList();
    }
    
    updateChatTitle(chatId, newTitle) {
        if (!this.chats.has(chatId)) return;
        
        const chat = this.chats.get(chatId);
        chat.title = newTitle;
        chat.updatedAt = new Date().toISOString();
        this.chats.set(chatId, chat);
        this.saveChatsToStorage();
        this.renderChatList();
    }
    
    getCurrentChat() {
        return this.chats.get(this.currentChatId);
    }
    
    // ==================== SIDEBAR MANAGEMENT ====================
    
    toggleSidebar() {
        if (this.isMobile) {
            this.sidebar.classList.toggle('open');
            this.sidebarOverlay.classList.toggle('show');
        } else {
            this.sidebar.classList.toggle('closed');
            this.mainContent.classList.toggle('sidebar-closed');
        }
    }
    
    closeSidebar() {
        if (this.isMobile) {
            this.sidebar.classList.remove('open');
            this.sidebarOverlay.classList.remove('show');
        }
    }
    
    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== this.isMobile) {
            // Reset sidebar state when switching between mobile/desktop
            this.sidebar.classList.remove('open', 'closed');
            this.sidebarOverlay.classList.remove('show');
            this.mainContent.classList.remove('sidebar-closed');
        }
    }
    
    renderChatList() {
        this.chatList.innerHTML = '';
        
        const sortedChats = Array.from(this.chats.values())
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        sortedChats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            
            const title = document.createElement('div');
            title.className = 'chat-title';
            title.textContent = chat.title;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'chat-delete';
            deleteBtn.innerHTML = '✕';
            deleteBtn.onclick = (e) => this.deleteChat(chat.id, e);
            
            chatItem.appendChild(title);
            if (this.chats.size > 1) {
                chatItem.appendChild(deleteBtn);
            }
            
            chatItem.onclick = () => this.switchToChat(chat.id);
            this.chatList.appendChild(chatItem);
        });
    }
    
    // ==================== STORAGE MANAGEMENT ====================
    
    saveChatsToStorage() {
        try {
            const chatsData = Array.from(this.chats.entries());
            localStorage.setItem('unblockedgpt_chats', JSON.stringify(chatsData));
            localStorage.setItem('unblockedgpt_current_chat', this.currentChatId);
        } catch (error) {
            console.error('Failed to save chats:', error);
        }
    }
    
    loadChatsFromStorage() {
        try {
            const chatsData = localStorage.getItem('unblockedgpt_chats');
            const currentChatId = localStorage.getItem('unblockedgpt_current_chat');
            
            if (chatsData) {
                const parsedData = JSON.parse(chatsData);
                this.chats = new Map(parsedData);
                this.currentChatId = currentChatId;
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
            this.chats = new Map();
        }
    }
    
    // ==================== UI HELPERS ====================
    
    adjustTextareaHeight() {
        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
    }
    
    focusInput() {
        setTimeout(() => {
            this.userInput.focus();
        }, 100);
    }
    
    clearChatHistory() {
        this.chatHistory.innerHTML = '';
    }
    
    renderChatHistory(messages) {
        this.clearChatHistory();
        messages.forEach(message => {
            this.addMessage(message.text, message.sender, message.images);
        });
    }
    
    // ==================== IMAGE HANDLING ====================
    
    handleImageSelect(e) {
        const files = Array.from(e.target.files);
        
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                this.addImagePreview(file);
            }
        });
        
        // Clear the input so the same file can be selected again
        e.target.value = '';
    }
    
    addImagePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = {
                file: file,
                dataUrl: e.target.result,
                name: file.name
            };
            
            this.selectedImages.push(imageData);
            this.renderImagePreviews();
        };
        reader.readAsDataURL(file);
    }
    
    renderImagePreviews() {
        if (this.selectedImages.length === 0) {
            this.imagePreviewContainer.style.display = 'none';
            return;
        }
        
        this.imagePreviewContainer.style.display = 'flex';
        this.imagePreviewContainer.innerHTML = '';
        
        this.selectedImages.forEach((imageData, index) => {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview';
            
            const img = document.createElement('img');
            img.src = imageData.dataUrl;
            img.alt = imageData.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => this.removeImage(index);
            
            previewDiv.appendChild(img);
            previewDiv.appendChild(removeBtn);
            this.imagePreviewContainer.appendChild(previewDiv);
        });
    }
    
    removeImage(index) {
        this.selectedImages.splice(index, 1);
        this.renderImagePreviews();
    }
    
    async sendMessage() {
        const message = this.userInput.value.trim();
        
        if (!message && this.selectedImages.length === 0) {
            return;
        }
        
        const currentChat = this.getCurrentChat();
        if (!currentChat) return;
        
        // Disable input while processing
        this.setInputState(false);
        
        // Save current images before clearing
        const messagImages = [...this.selectedImages];
        
        // Add user message to chat
        const userMessage = {
            text: message,
            sender: 'user',
            images: messagImages,
            timestamp: new Date().toISOString()
        };
        
        currentChat.messages.push(userMessage);
        this.addMessage(message, 'user', messagImages);
        
        // Update chat title if this is the first message
        if (currentChat.messages.length === 1 && message) {
            const title = message.length > 30 ? message.substring(0, 30) + '...' : message;
            this.updateChatTitle(currentChat.id, title);
        }
        
        // Clear input and images
        this.userInput.value = '';
        this.adjustTextareaHeight();
        this.selectedImages = [];
        this.renderImagePreviews();
        
        // Show loading indicator
        this.showLoading(true);
        
        try {
            let requestBody;
            let headers = {};
            
            // Get conversation history (exclude current message)
            const conversationHistory = currentChat.messages.slice(0, -1);
            
            if (messagImages.length > 0) {
                // Use FormData for image uploads
                const formData = new FormData();
                formData.append('message', message);
                formData.append('conversation', JSON.stringify(conversationHistory));
                
                messagImages.forEach((imageData) => {
                    formData.append(`images`, imageData.file);
                });
                
                requestBody = formData;
            } else {
                // Use JSON for text-only messages
                headers['Content-Type'] = 'application/json';
                requestBody = JSON.stringify({ 
                    message: message,
                    conversation: conversationHistory
                });
            }
            
            // Send request to backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: headers,
                body: requestBody
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Add assistant response to chat
            const assistantMessage = {
                text: data.response,
                sender: 'assistant',
                images: [],
                timestamp: new Date().toISOString()
            };
            
            currentChat.messages.push(assistantMessage);
            currentChat.updatedAt = new Date().toISOString();
            this.saveChatsToStorage();
            this.renderChatList();
            
            this.addMessage(data.response, 'assistant');
            
        } catch (error) {
            console.error('Error:', error);
            this.addErrorMessage(`Error: ${error.message}`);
        } finally {
            // Re-enable input and hide loading
            this.setInputState(true);
            this.showLoading(false);
            this.focusInput();
        }
    }
    
    addMessage(text, sender, images = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Add images if present
        if (images && images.length > 0) {
            images.forEach(imageData => {
                const img = document.createElement('img');
                img.className = 'message-image';
                img.src = imageData.dataUrl;
                img.alt = imageData.name;
                img.onclick = () => this.openImageModal(imageData.dataUrl);
                contentDiv.appendChild(img);
            });
        }
        
        // Add text if present
        if (text) {
            const textDiv = document.createElement('div');
            textDiv.textContent = text;
            contentDiv.appendChild(textDiv);
        }
        
        messageDiv.appendChild(contentDiv);
        this.chatHistory.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    openImageModal(imageSrc) {
        // Simple modal to view full-size image
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            cursor: pointer;
        `;
        
        const img = document.createElement('img');
        img.src = imageSrc;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;
        
        modal.appendChild(img);
        modal.onclick = () => document.body.removeChild(modal);
        document.body.appendChild(modal);
    }
    
    addErrorMessage(text) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = text;
        
        this.chatHistory.appendChild(errorDiv);
        this.scrollToBottom();
    }
    
    setInputState(enabled) {
        this.userInput.disabled = !enabled;
        this.sendButton.disabled = !enabled;
    }
    
    showLoading(show) {
        if (show) {
            this.loadingElement.classList.remove('hidden');
        } else {
            this.loadingElement.classList.add('hidden');
        }
    }
    
    scrollToBottom() {
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});