class ChatApp {
    constructor() {
        this.chatHistory = document.getElementById('chat-history');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.loadingElement = document.getElementById('loading');
        this.imageInput = document.getElementById('image-input');
        this.imageButton = document.getElementById('image-button');
        this.imagePreviewContainer = document.getElementById('image-preview-container');
        
        this.selectedImages = [];
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
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
        
        this.imageButton.addEventListener('click', () => {
            this.imageInput.click();
        });
        
        this.imageInput.addEventListener('change', (e) => {
            this.handleImageSelect(e);
        });
    }
    
    adjustTextareaHeight() {
        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
    }
    
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
        
        // Disable input while processing
        this.setInputState(false);
        
        // Add user message to chat
        this.addMessage(message, 'user', this.selectedImages);
        
        // Clear input and images
        this.userInput.value = '';
        this.adjustTextareaHeight();
        
        // Show loading indicator
        this.showLoading(true);
        
        try {
            let requestBody;
            let headers = {};
            
            if (this.selectedImages.length > 0) {
                // Use FormData for image uploads
                const formData = new FormData();
                formData.append('message', message);
                
                this.selectedImages.forEach((imageData, index) => {
                    formData.append(`images`, imageData.file);
                });
                
                requestBody = formData;
                // Don't set Content-Type header for FormData - let browser set it
            } else {
                // Use JSON for text-only messages
                headers['Content-Type'] = 'application/json';
                requestBody = JSON.stringify({ message: message });
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
            this.addMessage(data.response, 'assistant');
            
        } catch (error) {
            console.error('Error:', error);
            this.addErrorMessage(`Error: ${error.message}`);
        } finally {
            // Clear selected images and hide preview
            this.selectedImages = [];
            this.renderImagePreviews();
            
            // Re-enable input and hide loading
            this.setInputState(true);
            this.showLoading(false);
            this.userInput.focus();
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