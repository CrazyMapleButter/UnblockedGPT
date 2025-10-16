const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

// For Vercel, we don't need dotenv in production
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ 
                error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.' 
            });
        }
        
        // Make request to OpenAI API
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'user',
                    content: message
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