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

// Serve sound effects and other non-music audio files
app.use('/sounds', express.static(path.join(__dirname, '../sounds')));

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

// API endpoint to list available scenes
app.get('/api/scenes', (req, res) => {
    const fs = require('fs');
    const scenesDir = path.join(__dirname, '../assets/scene_backgrounds');
    
    try {
        const files = fs.readdirSync(scenesDir)
            .filter(f => f.endsWith('.json'));
        
        const scenes = files.map(f => {
            try {
                const content = fs.readFileSync(path.join(scenesDir, f), 'utf8');
                const scene = JSON.parse(content);
                return {
                    ...scene,
                    imageUrl: `/assets/scene_backgrounds/${scene.image}`
                };
            } catch (err) {
                console.error(`Error reading scene ${f}:`, err);
                return null;
            }
        }).filter(s => s !== null);
        
        // Sort by adventure, act, chapter, scene
        scenes.sort((a, b) => {
            if (a.adventure !== b.adventure) return a.adventure.localeCompare(b.adventure);
            if (a.act !== b.act) return a.act - b.act;
            if (a.chapter !== b.chapter) return a.chapter - b.chapter;
            return a.scene - b.scene;
        });
        
        res.json(scenes);
    } catch (err) {
        console.error('Error listing scenes:', err);
        res.json([]);
    }
});

// API endpoint to get a specific scene
app.get('/api/scenes/:id', (req, res) => {
    const fs = require('fs');
    const scenesDir = path.join(__dirname, '../assets/scene_backgrounds');
    const sceneFile = path.join(scenesDir, `${req.params.id}.json`);
    
    try {
        const content = fs.readFileSync(sceneFile, 'utf8');
        const scene = JSON.parse(content);
        scene.imageUrl = `/assets/scene_backgrounds/${scene.image}`;
        res.json(scene);
    } catch (err) {
        res.status(404).json({ error: 'Scene not found' });
    }
});

// API endpoint to list adventure guides
app.get('/api/guides', (req, res) => {
    const fs = require('fs');
    const guidesDir = path.join(__dirname, '../assets/adventures');
    
    try {
        if (!fs.existsSync(guidesDir)) {
            return res.json([]);
        }
        
        const files = fs.readdirSync(guidesDir)
            .filter(f => f.endsWith('.json'));
        
        const guides = files.map(f => {
            try {
                const content = fs.readFileSync(path.join(guidesDir, f), 'utf8');
                const guide = JSON.parse(content);
                return {
                    id: guide.id,
                    adventure: guide.adventure,
                    version: guide.version,
                    lastUpdated: guide.lastUpdated,
                    overview: guide.overview
                };
            } catch (err) {
                console.error(`Error reading guide ${f}:`, err);
                return null;
            }
        }).filter(g => g !== null);
        
        res.json(guides);
    } catch (err) {
        console.error('Error listing guides:', err);
        res.json([]);
    }
});

// API endpoint to get a specific adventure guide
app.get('/api/guides/:id', (req, res) => {
    const fs = require('fs');
    const guidesDir = path.join(__dirname, '../assets/adventures');
    const guideFile = path.join(guidesDir, `${req.params.id}.json`);
    
    try {
        const content = fs.readFileSync(guideFile, 'utf8');
        const guide = JSON.parse(content);
        res.json(guide);
    } catch (err) {
        res.status(404).json({ error: 'Guide not found' });
    }
});

// API endpoint to get a specific section from a guide
app.get('/api/guides/:id/section/:sectionId', (req, res) => {
    const fs = require('fs');
    const guidesDir = path.join(__dirname, '../assets/adventures');
    const guideFile = path.join(guidesDir, `${req.params.id}.json`);
    
    try {
        const content = fs.readFileSync(guideFile, 'utf8');
        const guide = JSON.parse(content);
        
        const sectionId = req.params.sectionId;
        if (guide.content && guide.content[sectionId]) {
            res.json({
                id: sectionId,
                ...guide.content[sectionId]
            });
        } else {
            res.status(404).json({ error: 'Section not found' });
        }
    } catch (err) {
        res.status(404).json({ error: 'Guide not found' });
    }
});

// API endpoint to get NPC statblock
app.get('/api/npcs/:id', (req, res) => {
    const fs = require('fs');
    const npcsDir = path.join(__dirname, '../assets/characters/npcs');
    const npcFile = path.join(npcsDir, `${req.params.id}.json`);
    
    try {
        const content = fs.readFileSync(npcFile, 'utf8');
        const npc = JSON.parse(content);
        res.json(npc);
    } catch (err) {
        res.status(404).json({ error: 'NPC not found' });
    }
});

// API endpoint to list all NPCs
app.get('/api/npcs', (req, res) => {
    const fs = require('fs');
    const npcsDir = path.join(__dirname, '../assets/characters/npcs');
    
    try {
        if (!fs.existsSync(npcsDir)) {
            return res.json([]);
        }
        
        const files = fs.readdirSync(npcsDir)
            .filter(f => f.endsWith('.json'));
        
        const npcs = files.map(f => {
            try {
                const content = fs.readFileSync(path.join(npcsDir, f), 'utf8');
                const npc = JSON.parse(content);
                return {
                    id: npc.id,
                    name: npc.name,
                    type: npc.type,
                    archetype: npc.archetype,
                    description: npc.description
                };
            } catch (err) {
                console.error(`Error reading NPC ${f}:`, err);
                return null;
            }
        }).filter(n => n !== null);
        
        res.json(npcs);
    } catch (err) {
        console.error('Error listing NPCs:', err);
        res.json([]);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// SYNC SYSTEM - Multiplayer state synchronization
// ═══════════════════════════════════════════════════════════════════════════

// Connected users: socketId → { id, name, role, view, sessionId }
const users = new Map();

// Sessions/rooms: sessionId → { gm: socketId, players: Set<socketId> }
const sessions = new Map();

// GM password (in production, use environment variable)
const GM_PASSWORD = process.env.GM_PASSWORD || 'gm123';

// Message types (must match client)
const MessageType = {
    JOIN: 'sync:join',
    LEAVE: 'sync:leave',
    PRESENCE: 'sync:presence',
    VIEW_CHANGE: 'sync:view_change',
    CHAT: 'sync:chat',
    ROLL: 'sync:roll',
    SCENE_CHANGE: 'sync:scene_change',
    SCENE_REQUEST: 'sync:scene_request',
    STATE_SYNC: 'sync:state',
    STATE_REQUEST: 'sync:state_request',
    PING: 'sync:ping',
    PONG: 'sync:pong',
    ERROR: 'sync:error',
    ECHO_REQUEST: 'sync:echo_request',
    ECHO_RESPONSE: 'sync:echo_response'
};

/**
 * Get or create a session
 */
function getSession(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            gm: null,
            players: new Set(),
            scene: null,
            state: {}
        });
    }
    return sessions.get(sessionId);
}

/**
 * Broadcast presence update to all users in a session
 */
function broadcastPresence(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return;
    
    const userList = [];
    for (const [id, user] of users) {
        if (user.sessionId === sessionId) {
            userList.push({
                id: user.id,
                name: user.name,
                role: user.role,
                view: user.view
            });
        }
    }
    
    io.to(sessionId).emit(MessageType.PRESENCE, { users: userList });
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('[Sync] Client connected:', socket.id);
    
    // ─────────────────────────────────────────────────────────────────────
    // SELF-TEST: Echo request/response for connection validation
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on(MessageType.ECHO_REQUEST, (data) => {
        // Immediately echo back with the same token
        socket.emit(MessageType.ECHO_RESPONSE, {
            token: data.token,
            sentAt: data.sentAt,
            serverTime: Date.now()
        });
        console.log('[Sync] Echo request from', socket.id);
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // PRESENCE: Join, leave, view changes
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on(MessageType.JOIN, (data) => {
        const { name, role, view, sessionId } = data;
        const roomId = sessionId || 'default';
        
        // Store user
        users.set(socket.id, {
            id: socket.id,
            name: name || 'Anonymous',
            role: role || 'player',
            view: view || 'scene',
            sessionId: roomId
        });
        
        // Join socket.io room
        socket.join(roomId);
        
        // Add to session
        const session = getSession(roomId);
        session.players.add(socket.id);
        
        console.log('[Sync] User joined:', name, `(${role})`, 'in session:', roomId);
        
        // Broadcast join to others in session
        socket.to(roomId).emit(MessageType.JOIN, {
            id: socket.id,
            name,
            role,
            view
        });
        
        // Send full presence to the joining user
        broadcastPresence(roomId);
    });
    
    socket.on(MessageType.VIEW_CHANGE, (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        user.view = data.view;
        
        // Broadcast to session
        socket.to(user.sessionId).emit(MessageType.VIEW_CHANGE, {
            id: socket.id,
            view: data.view
        });
        
        console.log('[Sync] View change:', user.name, '→', data.view);
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // CHAT: Broadcast messages to session
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on(MessageType.CHAT, (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        const message = {
            from: socket.id,
            name: user.name,
            role: user.role,
            text: data.text,
            type: data.type || 'player',
            timestamp: data.timestamp || Date.now()
        };
        
        // Broadcast to everyone in session (including sender for confirmation)
        io.to(user.sessionId).emit(MessageType.CHAT, message);
        
        console.log('[Sync] Chat:', user.name, ':', data.text);
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // DICE: Broadcast rolls to session
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on(MessageType.ROLL, (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        const roll = {
            from: socket.id,
            name: user.name,
            expression: data.expression,
            rolls: data.rolls,
            total: data.total,
            kept: data.kept,
            modifier: data.modifier,
            timestamp: data.timestamp || Date.now()
        };
        
        // Broadcast to everyone in session
        io.to(user.sessionId).emit(MessageType.ROLL, roll);
        
        console.log('[Sync] Roll:', user.name, ':', data.expression, '=', data.total);
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // SCENE: GM pushes scene changes to players
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on(MessageType.SCENE_CHANGE, (data) => {
        const user = users.get(socket.id);
        if (!user || user.role !== 'gm') {
            socket.emit(MessageType.ERROR, { message: 'Only GM can change scenes' });
            return;
        }
        
        const session = sessions.get(user.sessionId);
        if (session) {
            session.scene = data.scene;
        }
        
        // Broadcast to all players in session
        io.to(user.sessionId).emit(MessageType.SCENE_CHANGE, {
            from: socket.id,
            scene: data.scene,
            transition: data.transition
        });
        
        console.log('[Sync] Scene change:', data.scene);
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // GM AUTHENTICATION
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on('gm:authenticate', (data, callback) => {
        const user = users.get(socket.id);
        if (!user) {
            callback({ success: false, message: 'Not connected' });
            return;
        }
        
        if (data.password === GM_PASSWORD) {
            user.role = 'gm';
            
            const session = sessions.get(user.sessionId);
            if (session) {
                session.gm = socket.id;
            }
            
            console.log('[Sync] GM authenticated:', user.name);
            
            // Broadcast role change
            broadcastPresence(user.sessionId);
            
            callback({ success: true });
        } else {
            console.log('[Sync] GM auth failed for:', user.name);
            callback({ success: false, message: 'Invalid password' });
        }
    });
    
    socket.on('gm:logout', () => {
        const user = users.get(socket.id);
        if (!user) return;
        
        user.role = 'player';
        
        const session = sessions.get(user.sessionId);
        if (session && session.gm === socket.id) {
            session.gm = null;
        }
        
        broadcastPresence(user.sessionId);
        console.log('[Sync] GM logout:', user.name);
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // PING/PONG for latency measurement
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on(MessageType.PING, (data) => {
        socket.emit(MessageType.PONG, { sentAt: data.sentAt });
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        
        if (user) {
            const session = sessions.get(user.sessionId);
            if (session) {
                session.players.delete(socket.id);
                if (session.gm === socket.id) {
                    session.gm = null;
                }
            }
            
            // Broadcast leave to session
            socket.to(user.sessionId).emit(MessageType.LEAVE, {
                id: socket.id
            });
            
            console.log('[Sync] User left:', user.name);
            users.delete(socket.id);
        } else {
            console.log('[Sync] Client disconnected:', socket.id);
        }
    });
});

// Start server
httpServer.listen(PORT, () => {
    console.log(`Light Deck running at http://localhost:${PORT}`);
});
