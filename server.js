cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Serve static files from current directory
app.use(express.static(__dirname));

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ 
        status: 'Server is running!', 
        time: new Date().toISOString(),
        message: 'Your Railway app is working correctly'
    });
});

// Root route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all for debugging
app.get('*', (req, res) => {
    res.status(404).json({ 
        error: 'Not found', 
        url: req.url,
        available: ['/', '/test']
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
});
EOF
