/**
 * SessionManager - Server-side session persistence for Light Deck
 * 
 * Handles:
 * - Session creation and storage (file-based JSON)
 * - User token generation and validation
 * - State persistence (scene, players, NPCs, flags)
 * - Reconnection with state recovery
 * 
 * Session Lifecycle:
 * 1. GM creates session (or auto-created on first connect)
 * 2. Players join with generated tokens stored in localStorage
 * 3. On disconnect, user state preserved in session
 * 4. On reconnect, token matched → state restored
 * 5. Session expires after configurable timeout (default: 24 hours)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SESSIONS_DIR = path.join(__dirname, 'sessions');
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const SAVE_DEBOUNCE_MS = 2000; // Debounce saves to avoid excessive disk writes
const TOKEN_LENGTH = 32;

// ═══════════════════════════════════════════════════════════════════════════
// SESSION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} UserState
 * @property {string} token - Unique reconnection token
 * @property {string} name - Display name
 * @property {string} role - 'player' | 'gm'
 * @property {string} view - Current view mode
 * @property {string|null} characterId - Assigned character ID
 * @property {number} lastSeen - Timestamp of last activity
 * @property {boolean} connected - Currently connected
 */

/**
 * @typedef {Object} NPCState
 * @property {string} id - NPC ID
 * @property {string} status - 'alive' | 'dead' | 'hidden' | 'fled'
 * @property {number} currentStress - Current stress value
 * @property {number} wounds - Current wounds
 * @property {string[]} conditions - Active conditions
 * @property {Object} customData - Any GM-set custom data
 */

/**
 * @typedef {Object} SessionState
 * @property {string} id - Session ID
 * @property {string} adventureId - Current adventure
 * @property {string} currentScene - Active scene ID
 * @property {Object<string, UserState>} users - Token → UserState
 * @property {Object<string, NPCState>} npcStates - NPC ID → NPCState
 * @property {Object<string, boolean|string>} flags - Campaign flags
 * @property {Object} campaignClock - { day, time }
 * @property {Array} chatHistory - Recent chat messages (last 100)
 * @property {number} createdAt - Session creation timestamp
 * @property {number} updatedAt - Last update timestamp
 */

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

// In-memory session cache: sessionId → SessionState
const sessions = new Map();

// Pending save timers: sessionId → timeout
const saveTimers = new Map();

// Token to session lookup: token → { sessionId, userId }
const tokenIndex = new Map();

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize the SessionManager
 * Creates sessions directory if needed, loads existing sessions
 */
function init() {
    // Ensure sessions directory exists
    if (!fs.existsSync(SESSIONS_DIR)) {
        fs.mkdirSync(SESSIONS_DIR, { recursive: true });
        console.log('[SessionManager] Created sessions directory');
    }
    
    // Load existing sessions
    loadAllSessions();
    
    // Start cleanup timer
    setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // Every hour
    
    console.log('[SessionManager] Initialized with', sessions.size, 'sessions');
}

/**
 * Load all sessions from disk
 */
function loadAllSessions() {
    try {
        const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
            try {
                const filePath = path.join(SESSIONS_DIR, file);
                const data = fs.readFileSync(filePath, 'utf8');
                const session = JSON.parse(data);
                
                // Check if expired
                if (Date.now() - session.updatedAt > SESSION_EXPIRY_MS) {
                    fs.unlinkSync(filePath);
                    console.log('[SessionManager] Removed expired session:', session.id);
                    continue;
                }
                
                // Add to cache
                sessions.set(session.id, session);
                
                // Index tokens
                for (const [token, user] of Object.entries(session.users)) {
                    tokenIndex.set(token, { sessionId: session.id, userId: token });
                }
                
            } catch (err) {
                console.error('[SessionManager] Failed to load session file:', file, err);
            }
        }
    } catch (err) {
        console.error('[SessionManager] Failed to read sessions directory:', err);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get or create a session
 * @param {string} sessionId - Session identifier
 * @returns {SessionState}
 */
function getOrCreateSession(sessionId) {
    if (sessions.has(sessionId)) {
        return sessions.get(sessionId);
    }
    
    const session = {
        id: sessionId,
        adventureId: null,
        currentScene: null,
        users: {},
        npcStates: {},
        flags: {},
        campaignClock: { day: 1, time: '00:00' },
        chatHistory: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    
    sessions.set(sessionId, session);
    scheduleSave(sessionId);
    
    console.log('[SessionManager] Created new session:', sessionId);
    return session;
}

/**
 * Get session by ID
 * @param {string} sessionId
 * @returns {SessionState|null}
 */
function getSession(sessionId) {
    return sessions.get(sessionId) || null;
}

/**
 * Delete a session
 * @param {string} sessionId
 */
function deleteSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return;
    
    // Remove token index entries
    for (const token of Object.keys(session.users)) {
        tokenIndex.delete(token);
    }
    
    // Remove from cache
    sessions.delete(sessionId);
    
    // Delete file
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    
    console.log('[SessionManager] Deleted session:', sessionId);
}

// ═══════════════════════════════════════════════════════════════════════════
// USER/TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a new user token
 * @returns {string}
 */
function generateToken() {
    return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Register a new user in a session
 * @param {string} sessionId
 * @param {Object} userData - { name, role, view, characterId }
 * @returns {{ token: string, user: UserState }}
 */
function registerUser(sessionId, userData) {
    const session = getOrCreateSession(sessionId);
    const token = generateToken();
    
    const user = {
        token,
        name: userData.name || 'Anonymous',
        role: userData.role || 'player',
        view: userData.view || 'scene',
        characterId: userData.characterId || null,
        lastSeen: Date.now(),
        connected: true,
    };
    
    session.users[token] = user;
    tokenIndex.set(token, { sessionId, userId: token });
    
    session.updatedAt = Date.now();
    scheduleSave(sessionId);
    
    console.log('[SessionManager] Registered user:', user.name, 'in session:', sessionId);
    return { token, user };
}

/**
 * Validate a token and get user state
 * @param {string} token
 * @returns {{ session: SessionState, user: UserState }|null}
 */
function validateToken(token) {
    const lookup = tokenIndex.get(token);
    if (!lookup) return null;
    
    const session = sessions.get(lookup.sessionId);
    if (!session) {
        tokenIndex.delete(token);
        return null;
    }
    
    const user = session.users[token];
    if (!user) {
        tokenIndex.delete(token);
        return null;
    }
    
    return { session, user };
}

/**
 * Update user state
 * @param {string} token
 * @param {Partial<UserState>} updates
 */
function updateUser(token, updates) {
    const result = validateToken(token);
    if (!result) return null;
    
    const { session, user } = result;
    
    Object.assign(user, updates, { lastSeen: Date.now() });
    session.updatedAt = Date.now();
    scheduleSave(session.id);
    
    return user;
}

/**
 * Mark user as disconnected (but preserve state)
 * @param {string} token
 */
function disconnectUser(token) {
    return updateUser(token, { connected: false });
}

/**
 * Mark user as reconnected
 * @param {string} token
 * @returns {{ session: SessionState, user: UserState }|null}
 */
function reconnectUser(token) {
    const result = validateToken(token);
    if (!result) return null;
    
    const { session, user } = result;
    user.connected = true;
    user.lastSeen = Date.now();
    session.updatedAt = Date.now();
    scheduleSave(session.id);
    
    console.log('[SessionManager] User reconnected:', user.name);
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update session scene
 * @param {string} sessionId
 * @param {string} sceneId
 */
function setScene(sessionId, sceneId) {
    const session = getSession(sessionId);
    if (!session) return;
    
    session.currentScene = sceneId;
    session.updatedAt = Date.now();
    scheduleSave(sessionId);
    
    console.log('[SessionManager] Scene changed:', sceneId);
}

/**
 * Update NPC state
 * @param {string} sessionId
 * @param {string} npcId
 * @param {Partial<NPCState>} updates
 */
function updateNPCState(sessionId, npcId, updates) {
    const session = getSession(sessionId);
    if (!session) return;
    
    if (!session.npcStates[npcId]) {
        session.npcStates[npcId] = {
            id: npcId,
            status: 'alive',
            currentStress: 0,
            wounds: 0,
            conditions: [],
            customData: {},
        };
    }
    
    Object.assign(session.npcStates[npcId], updates);
    session.updatedAt = Date.now();
    scheduleSave(sessionId);
}

/**
 * Get NPC state
 * @param {string} sessionId
 * @param {string} npcId
 * @returns {NPCState|null}
 */
function getNPCState(sessionId, npcId) {
    const session = getSession(sessionId);
    if (!session) return null;
    return session.npcStates[npcId] || null;
}

/**
 * Get all NPC states for a session
 * @param {string} sessionId
 * @returns {Object<string, NPCState>}
 */
function getAllNPCStates(sessionId) {
    const session = getSession(sessionId);
    if (!session) return {};
    return { ...session.npcStates };
}

/**
 * Update campaign flags
 * @param {string} sessionId
 * @param {string} key
 * @param {boolean|string} value
 */
function setFlag(sessionId, key, value) {
    const session = getSession(sessionId);
    if (!session) return;
    
    session.flags[key] = value;
    session.updatedAt = Date.now();
    scheduleSave(sessionId);
}

/**
 * Get all flags
 * @param {string} sessionId
 * @returns {Object<string, boolean|string>}
 */
function getFlags(sessionId) {
    const session = getSession(sessionId);
    if (!session) return {};
    return { ...session.flags };
}

/**
 * Update campaign clock
 * @param {string} sessionId
 * @param {Object} clock - { day, time }
 */
function setCampaignClock(sessionId, clock) {
    const session = getSession(sessionId);
    if (!session) return;
    
    session.campaignClock = clock;
    session.updatedAt = Date.now();
    scheduleSave(sessionId);
}

/**
 * Add chat message to history
 * @param {string} sessionId
 * @param {Object} message
 */
function addChatMessage(sessionId, message) {
    const session = getSession(sessionId);
    if (!session) return;
    
    session.chatHistory.push({
        ...message,
        timestamp: message.timestamp || Date.now(),
    });
    
    // Keep only last 100 messages
    if (session.chatHistory.length > 100) {
        session.chatHistory = session.chatHistory.slice(-100);
    }
    
    session.updatedAt = Date.now();
    scheduleSave(sessionId);
}

/**
 * Get chat history
 * @param {string} sessionId
 * @param {number} limit
 * @returns {Array}
 */
function getChatHistory(sessionId, limit = 50) {
    const session = getSession(sessionId);
    if (!session) return [];
    return session.chatHistory.slice(-limit);
}

/**
 * Get full session state for reconnection
 * @param {string} sessionId
 * @returns {Object}
 */
function getSessionState(sessionId) {
    const session = getSession(sessionId);
    if (!session) return null;
    
    return {
        currentScene: session.currentScene,
        npcStates: session.npcStates,
        flags: session.flags,
        campaignClock: session.campaignClock,
        chatHistory: session.chatHistory.slice(-50),
        connectedUsers: Object.values(session.users)
            .filter(u => u.connected)
            .map(u => ({ name: u.name, role: u.role, view: u.view })),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schedule a debounced save for a session
 * @param {string} sessionId
 */
function scheduleSave(sessionId) {
    // Clear existing timer
    if (saveTimers.has(sessionId)) {
        clearTimeout(saveTimers.get(sessionId));
    }
    
    // Schedule new save
    const timer = setTimeout(() => {
        saveSession(sessionId);
        saveTimers.delete(sessionId);
    }, SAVE_DEBOUNCE_MS);
    
    saveTimers.set(sessionId, timer);
}

/**
 * Save session to disk
 * @param {string} sessionId
 */
function saveSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return;
    
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    
    try {
        fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
        console.log('[SessionManager] Saved session:', sessionId);
    } catch (err) {
        console.error('[SessionManager] Failed to save session:', sessionId, err);
    }
}

/**
 * Force save all sessions (for shutdown)
 */
function saveAllSessions() {
    for (const sessionId of sessions.keys()) {
        // Clear any pending timers
        if (saveTimers.has(sessionId)) {
            clearTimeout(saveTimers.get(sessionId));
            saveTimers.delete(sessionId);
        }
        saveSession(sessionId);
    }
    console.log('[SessionManager] Saved all sessions');
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, session] of sessions) {
        if (now - session.updatedAt > SESSION_EXPIRY_MS) {
            deleteSession(sessionId);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log('[SessionManager] Cleaned up', cleaned, 'expired sessions');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
    // Initialization
    init,
    saveAllSessions,
    
    // Session management
    getOrCreateSession,
    getSession,
    deleteSession,
    
    // User/token management
    generateToken,
    registerUser,
    validateToken,
    updateUser,
    disconnectUser,
    reconnectUser,
    
    // State management
    setScene,
    updateNPCState,
    getNPCState,
    getAllNPCStates,
    setFlag,
    getFlags,
    setCampaignClock,
    addChatMessage,
    getChatHistory,
    getSessionState,
    
    // Constants
    SESSION_EXPIRY_MS,
};
