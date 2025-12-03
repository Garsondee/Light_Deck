require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve assets from assets directory
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Serve music files
app.use('/music', express.static(path.join(__dirname, '../music')));

// API endpoint to list available music tracks
app.get('/api/music', (req, res) => {
    const fs = require('fs');
    const musicDir = path.join(__dirname, '../music');
    
    try {
        const files = fs.readdirSync(musicDir)
            .filter(f => f.endsWith('.mp3') || f.endsWith('.mid'))
            .map(f => {
                // Clean up the name: remove extension, track number, and parenthetical prefixes
                let name = f.replace(/\.(mp3|mid)$/i, '');
                name = name.replace(/^\d+\.\s*/, '');  // Remove "01. " prefix
                name = name.replace(/^\d+\s*-\s*/, ''); // Remove "01 - " prefix
                
                return {
                    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
                    filename: f,
                    name: name,
                    url: `/music/${encodeURIComponent(f)}`,
                    type: f.endsWith('.mp3') ? 'mp3' : 'midi'
                };
            });
        res.json(files);
    } catch (err) {
        res.json([]);
    }
});

// Basic health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Socket.io connection handling (placeholder for now)
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
httpServer.listen(PORT, () => {
    console.log(`Light Deck running at http://localhost:${PORT}`);
});
