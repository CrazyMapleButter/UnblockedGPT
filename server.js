const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const multer = require('multer');

// For Vercel, we don't need dotenv in production
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads (using memory storage for serverless)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Helper function to encode image buffer to base64
function encodeImageToBase64(buffer) {
    return buffer.toString('base64');
}

// Helper function to get mime type from filename
function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/jpeg';
}

// Memory storage - no need to create directories

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Chat endpoint
app.post('/api/chat', upload.array('images', 10), async (req, res) => {
    try {
        const { message } = req.body;
        const images = req.files || [];
        
        if (!message && images.length === 0) {
            return res.status(400).json({ error: 'Message or images are required' });
        }
        
        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ 
                error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.' 
            });
        }
        
        // Prepare message content
        let messageContent = [];
        
        // Add text content if present
        if (message && message.trim()) {
            messageContent.push({
                type: 'text',
                text: message
            });
        }
        
        // Add image content if present
        for (const image of images) {
            const base64Image = encodeImageToBase64(image.buffer);
            const mimeType = getMimeType(image.originalname);
            
            messageContent.push({
                type: 'image_url',
                image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                }
            });
        }
        
        // Choose model based on whether images are present
        const model = images.length > 0 ? 'gpt-4-vision-preview' : 'gpt-3.5-turbo';
        
        // Make request to OpenAI API
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: model,
            messages: [
                {
                    role: 'user',
                    content: messageContent.length === 1 && messageContent[0].type === 'text' 
                        ? messageContent[0].text 
                        : messageContent
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const aiResponse = response.data.choices[0].message.content;
        res.json({ response: aiResponse });
        
    } catch (error) {
        console.error('Error calling OpenAI API:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            res.status(401).json({ 
                error: 'Invalid OpenAI API key. Please check your OPENAI_API_KEY in the .env file.' 
            });
        } else if (error.response?.status === 429) {
            res.status(429).json({ 
                error: 'Rate limit exceeded. Please try again later.' 
            });
        } else if (error.response?.status === 400) {
            res.status(400).json({ 
                error: 'Invalid request to OpenAI API. Please check your message.' 
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to get response from ChatGPT. Please try again.' 
            });
        }
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        apiKeyConfigured: !!process.env.OPENAI_API_KEY
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
    if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  Warning: OPENAI_API_KEY not found in environment variables.');
        console.log('   Please create a .env file and add your OpenAI API key.');
    }
});