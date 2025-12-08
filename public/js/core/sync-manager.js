/**
 * SyncManager - Multiplayer synchronization via Socket.io
 * 
 * Handles all network communication for the virtual tabletop:
 * - Presence (who's connected, what they're viewing)
 * - Chat messages (broadcast to all)
 * - Dice rolls (broadcast with attribution)
 * - Scene changes (GM → Players)
 * - State sync (characters, combat - future)
 * 
 * Features:
 * - Self-test mode: spawns virtual peer on startup to validate comms
 * - Automatic reconnection with state recovery
 * - GM/Player role management
 * - Per-player view state tracking (scene vs terminal)
 */

const SyncManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════
    
    const VERSION = '1.0.0';
    
    // Message types for protocol
    const MessageType = {
        // Presence
        JOIN: 'sync:join',
        LEAVE: 'sync:leave',
        PRESENCE: 'sync:presence',
        VIEW_CHANGE: 'sync:view_change',
        
        // Chat
        CHAT: 'sync:chat',
        
        // Dice
        ROLL: 'sync:roll',
        
        // Scene (GM only)
        SCENE_CHANGE: 'sync:scene_change',
        SCENE_REQUEST: 'sync:scene_request',
        
        // State
        STATE_SYNC: 'sync:state',
        STATE_REQUEST: 'sync:state_request',
        
        // System
        PING: 'sync:ping',
        PONG: 'sync:pong',
        ERROR: 'sync:error',
        
        // Self-test
        ECHO_REQUEST: 'sync:echo_request',
        ECHO_RESPONSE: 'sync:echo_response',
        
        // Session persistence
        RECONNECT: 'sync:reconnect',
        TOKEN: 'sync:token',
        NPC_STATE: 'sync:npc_state',
        FLAG_UPDATE: 'sync:flag_update'
    };
    
    // View modes
    const ViewMode = {
        SCENE_VIEWER: 'scene',
        TERMINAL: 'terminal'
    };
    
    // Roles
    const Role = {
        PLAYER: 'player',
        GM: 'gm'
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let initialized = false;
    let socket = null;
    
    // Storage key for session token
    const TOKEN_STORAGE_KEY = 'lightdeck_session_token';
    
    // Local user state
    const localState = {
        id: null,           // Socket ID
        token: null,        // Session persistence token
        name: 'Anonymous',  // Display name
        role: Role.PLAYER,  // 'player' or 'gm'
        view: ViewMode.SCENE_VIEWER,  // Current view mode
        sessionId: null     // Room/session ID
    };
    
    // Connected peers (id → state)
    const peers = new Map();
    
    // Connection state
    const connection = {
        connected: false,
        reconnecting: false,
        lastPing: 0,
        latency: 0
    };
    
    // Self-test state
    const selfTest = {
        enabled: true,      // Run self-test on startup
        passed: false,
        pending: null,      // Pending echo request
        timeout: null
    };
    
    // Callbacks for external handlers
    const handlers = {
        onConnect: null,
        onDisconnect: null,
        onPeerJoin: null,
        onPeerLeave: null,
        onPeerViewChange: null,
        onChat: null,
        onRoll: null,
        onSceneChange: null,
        onStateSync: null,
        onError: null
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Initialize the sync manager
     * @param {Object} options - Configuration
     * @param {string} options.name - Display name
     * @param {string} options.sessionId - Session/room to join
     * @param {boolean} options.selfTest - Run self-test on connect (default: true)
     */
    function init(options = {}) {
        if (initialized) {
            console.warn('[SyncManager] Already initialized');
            return;
        }
        
        // Apply options
        if (options.name) localState.name = options.name;
        if (options.sessionId) localState.sessionId = options.sessionId;
        if (options.selfTest !== undefined) selfTest.enabled = options.selfTest;
        
        // Check for Socket.io
        if (typeof io === 'undefined') {
            console.error('[SyncManager] Socket.io not loaded');
            return;
        }
        
        // Connect to server
        socket = io();
        
        // Set up socket event handlers
        setupSocketHandlers();
        
        // Listen for local events via EventBus
        setupEventBusListeners();
        
        initialized = true;
        console.log('[SyncManager] Initialized', { version: VERSION });
        
        return {
            MessageType,
            ViewMode,
            Role
        };
    }
    
    /**
     * Set up Socket.io event handlers
     */
    function setupSocketHandlers() {
        // Connection established
        socket.on('connect', () => {
            localState.id = socket.id;
            connection.connected = true;
            connection.reconnecting = false;
            
            console.log('[SyncManager] Connected:', socket.id);
            
            // Join session
            sendJoin();
            
            // Run self-test if enabled
            if (selfTest.enabled) {
                runSelfTest();
            }
            
            // Notify handlers
            if (handlers.onConnect) handlers.onConnect(localState);
            
            // Emit to EventBus
            emitEvent('sync:connected', { id: socket.id });
        });
        
        // Disconnected
        socket.on('disconnect', (reason) => {
            connection.connected = false;
            
            console.log('[SyncManager] Disconnected:', reason);
            
            // Notify handlers
            if (handlers.onDisconnect) handlers.onDisconnect(reason);
            
            // Emit to EventBus
            emitEvent('sync:disconnected', { reason });
        });
        
        // Reconnecting
        socket.on('reconnecting', (attempt) => {
            connection.reconnecting = true;
            console.log('[SyncManager] Reconnecting, attempt:', attempt);
        });
        
        // ─────────────────────────────────────────────────────────────────
        // PRESENCE EVENTS
        // ─────────────────────────────────────────────────────────────────
        
        // Peer joined
        socket.on(MessageType.JOIN, (data) => {
            const { id, name, role, view } = data;
            
            // Don't add self
            if (id === localState.id) return;
            
            peers.set(id, { id, name, role, view });
            console.log('[SyncManager] Peer joined:', name, `(${role})`);
            
            if (handlers.onPeerJoin) handlers.onPeerJoin(data);
            emitEvent('sync:peer_joined', data);
        });
        
        // Peer left
        socket.on(MessageType.LEAVE, (data) => {
            const { id } = data;
            const peer = peers.get(id);
            
            if (peer) {
                peers.delete(id);
                console.log('[SyncManager] Peer left:', peer.name);
                
                if (handlers.onPeerLeave) handlers.onPeerLeave(peer);
                emitEvent('sync:peer_left', peer);
            }
        });
        
        // Full presence update (list of all connected users)
        socket.on(MessageType.PRESENCE, (data) => {
            const { users } = data;
            
            peers.clear();
            for (const user of users) {
                if (user.id !== localState.id) {
                    peers.set(user.id, user);
                }
            }
            
            console.log('[SyncManager] Presence update:', peers.size, 'peers');
            emitEvent('sync:presence', { peers: Array.from(peers.values()) });
        });
        
        // Peer changed view
        socket.on(MessageType.VIEW_CHANGE, (data) => {
            const { id, view } = data;
            const peer = peers.get(id);
            
            if (peer) {
                peer.view = view;
                console.log('[SyncManager] Peer view change:', peer.name, '→', view);
                
                if (handlers.onPeerViewChange) handlers.onPeerViewChange(peer);
                emitEvent('sync:peer_view_changed', peer);
            }
        });
        
        // ─────────────────────────────────────────────────────────────────
        // CHAT EVENTS
        // ─────────────────────────────────────────────────────────────────
        
        socket.on(MessageType.CHAT, (data) => {
            const { from, name, role, text, type, timestamp } = data;
            
            // Don't echo our own messages back
            if (from === localState.id) return;
            
            console.log('[SyncManager] Chat from', name + ':', text);
            
            if (handlers.onChat) handlers.onChat(data);
            emitEvent('sync:chat', data);
        });
        
        // ─────────────────────────────────────────────────────────────────
        // DICE EVENTS
        // ─────────────────────────────────────────────────────────────────
        
        socket.on(MessageType.ROLL, (data) => {
            const { from, name, expression, rolls, total, kept } = data;
            
            // Don't echo our own rolls back
            if (from === localState.id) return;
            
            console.log('[SyncManager] Roll from', name + ':', expression, '=', total);
            
            if (handlers.onRoll) handlers.onRoll(data);
            emitEvent('sync:roll', data);
        });
        
        // ─────────────────────────────────────────────────────────────────
        // SCENE EVENTS (GM → Players)
        // ─────────────────────────────────────────────────────────────────
        
        socket.on(MessageType.SCENE_CHANGE, (data) => {
            const { from, scene, transition } = data;
            
            console.log('[SyncManager] Scene change:', scene);
            
            if (handlers.onSceneChange) handlers.onSceneChange(data);
            emitEvent('sync:scene_change', data);
        });
        
        // ─────────────────────────────────────────────────────────────────
        // STATE EVENTS
        // ─────────────────────────────────────────────────────────────────
        
        socket.on(MessageType.STATE_SYNC, (data) => {
            console.log('[SyncManager] State sync received:', data);
            
            // Apply restored state
            if (data.currentScene) {
                console.log('[SyncManager] Restoring scene:', data.currentScene);
                emitEvent('sync:scene_change', { scene: data.currentScene, isRestore: true });
            }
            
            if (data.npcStates) {
                console.log('[SyncManager] Restoring NPC states:', Object.keys(data.npcStates).length, 'NPCs');
                emitEvent('sync:npc_states_restored', { npcStates: data.npcStates });
            }
            
            if (data.flags) {
                console.log('[SyncManager] Restoring flags:', Object.keys(data.flags).length, 'flags');
                emitEvent('sync:flags_restored', { flags: data.flags });
            }
            
            if (handlers.onStateSync) handlers.onStateSync(data);
            emitEvent('sync:state', data);
        });
        
        // ─────────────────────────────────────────────────────────────────
        // SESSION PERSISTENCE EVENTS
        // ─────────────────────────────────────────────────────────────────
        
        // Token received from server (store for reconnection)
        socket.on(MessageType.TOKEN, (data) => {
            if (data.token) {
                storeToken(data.token);
            }
        });
        
        // NPC state update from GM
        socket.on(MessageType.NPC_STATE, (data) => {
            const { from, npcId, ...updates } = data;
            
            // Don't echo our own updates back
            if (from === localState.id) return;
            
            console.log('[SyncManager] NPC state update:', npcId, updates);
            emitEvent('sync:npc_state', { npcId, ...updates });
        });
        
        // Flag update from GM
        socket.on(MessageType.FLAG_UPDATE, (data) => {
            const { from, key, value } = data;
            
            // Don't echo our own updates back
            if (from === localState.id) return;
            
            console.log('[SyncManager] Flag update:', key, '=', value);
            emitEvent('sync:flag_update', { key, value });
        });
        
        // ─────────────────────────────────────────────────────────────────
        // SYSTEM EVENTS
        // ─────────────────────────────────────────────────────────────────
        
        socket.on(MessageType.PONG, (data) => {
            const now = Date.now();
            connection.latency = now - connection.lastPing;
            console.log('[SyncManager] Latency:', connection.latency, 'ms');
        });
        
        socket.on(MessageType.ERROR, (data) => {
            console.error('[SyncManager] Server error:', data.message);
            
            if (handlers.onError) handlers.onError(data);
            emitEvent('sync:error', data);
        });
        
        // ─────────────────────────────────────────────────────────────────
        // SELF-TEST EVENTS
        // ─────────────────────────────────────────────────────────────────
        
        socket.on(MessageType.ECHO_RESPONSE, (data) => {
            if (selfTest.pending && data.token === selfTest.pending) {
                clearTimeout(selfTest.timeout);
                selfTest.passed = true;
                selfTest.pending = null;
                
                const latency = Date.now() - data.sentAt;
                console.log('[SyncManager] Self-test PASSED ✓ (round-trip:', latency, 'ms)');
                
                emitEvent('sync:self_test_passed', { latency });
            }
        });
    }
    
    /**
     * Set up EventBus listeners for local events to broadcast
     */
    function setupEventBusListeners() {
        if (typeof EventBus === 'undefined') return;
        
        // Listen for terminal mode changes
        EventBus.on('terminal:opened', () => {
            broadcastViewChange(ViewMode.TERMINAL);
        });
        
        EventBus.on('terminal:closed', () => {
            broadcastViewChange(ViewMode.SCENE_VIEWER);
        });
        
        // Listen for display mode changes (alternative event)
        EventBus.on('display:mode_changed', (data) => {
            const view = data.mode === 'terminal' ? ViewMode.TERMINAL : ViewMode.SCENE_VIEWER;
            broadcastViewChange(view);
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SELF-TEST
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Run self-test to validate communication
     */
    function runSelfTest() {
        const token = Math.random().toString(36).substring(2);
        selfTest.pending = token;
        selfTest.passed = false;
        
        console.log('[SyncManager] Running self-test...');
        
        // Send echo request
        socket.emit(MessageType.ECHO_REQUEST, {
            token,
            sentAt: Date.now()
        });
        
        // Timeout after 5 seconds
        selfTest.timeout = setTimeout(() => {
            if (!selfTest.passed) {
                // Only warn, don't error - connection might be through a proxy
                console.warn('[SyncManager] Self-test timeout (may be running through proxy)');
                selfTest.pending = null;
                
                // Check if we're actually connected
                if (connection.connected) {
                    // Connected but no echo - likely proxy issue
                    console.log('[SyncManager] Socket connected but echo failed - proxy detected');
                    emitEvent('sync:self_test_failed', { reason: 'proxy', silent: true });
                } else {
                    // Not connected at all
                    emitEvent('sync:self_test_failed', { reason: 'timeout' });
                }
            }
        }, 5000);
    }
    
    /**
     * Check if self-test passed
     */
    function isSelfTestPassed() {
        return selfTest.passed;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SENDING MESSAGES
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Send join message to server
     */
    function sendJoin() {
        if (!socket || !connection.connected) return;
        
        // Try to load existing token from localStorage
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (storedToken) {
            localState.token = storedToken;
            console.log('[SyncManager] Found stored session token, attempting reconnect');
        }
        
        socket.emit(MessageType.JOIN, {
            name: localState.name,
            role: localState.role,
            view: localState.view,
            sessionId: localState.sessionId,
            token: localState.token
        });
    }
    
    /**
     * Store session token received from server
     */
    function storeToken(token) {
        localState.token = token;
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        console.log('[SyncManager] Session token stored');
    }
    
    /**
     * Clear stored session token
     */
    function clearToken() {
        localState.token = null;
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        console.log('[SyncManager] Session token cleared');
    }
    
    /**
     * Request current session state from server
     */
    function requestState() {
        if (!socket || !connection.connected) return;
        socket.emit(MessageType.STATE_REQUEST, {});
    }
    
    /**
     * Broadcast view mode change
     */
    function broadcastViewChange(view) {
        if (!socket || !connection.connected) return;
        
        localState.view = view;
        
        socket.emit(MessageType.VIEW_CHANGE, {
            view
        });
        
        console.log('[SyncManager] Broadcasting view change:', view);
    }
    
    /**
     * Broadcast chat message
     * @param {string} text - Message text
     * @param {string} type - Message type ('player', 'system', etc.)
     */
    function broadcastChat(text, type = 'player') {
        if (!socket || !connection.connected) return;
        
        socket.emit(MessageType.CHAT, {
            text,
            type,
            timestamp: Date.now()
        });
    }
    
    /**
     * Broadcast dice roll
     * @param {Object} rollData - { expression, rolls, total, kept, modifier }
     */
    function broadcastRoll(rollData) {
        if (!socket || !connection.connected) return;
        
        socket.emit(MessageType.ROLL, {
            ...rollData,
            timestamp: Date.now()
        });
    }
    
    /**
     * Broadcast scene change (GM only)
     * @param {string} scene - Scene identifier
     * @param {Object} transition - Transition options
     */
    function broadcastSceneChange(scene, transition = {}) {
        if (!socket || !connection.connected) return;
        if (localState.role !== Role.GM) {
            console.warn('[SyncManager] Only GM can broadcast scene changes');
            return;
        }
        
        socket.emit(MessageType.SCENE_CHANGE, {
            scene,
            transition,
            timestamp: Date.now()
        });
    }
    
    /**
     * Send ping to measure latency
     */
    function ping() {
        if (!socket || !connection.connected) return;
        
        connection.lastPing = Date.now();
        socket.emit(MessageType.PING, { sentAt: connection.lastPing });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // ROLE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Authenticate as GM
     * @param {string} password - GM password
     * @returns {Promise<boolean>} Success
     */
    function authenticateGM(password) {
        return new Promise((resolve) => {
            if (!socket || !connection.connected) {
                resolve(false);
                return;
            }
            
            socket.emit('gm:authenticate', { password }, (response) => {
                if (response.success) {
                    localState.role = Role.GM;
                    console.log('[SyncManager] GM authenticated');
                    emitEvent('sync:gm_authenticated', {});
                    resolve(true);
                } else {
                    console.warn('[SyncManager] GM authentication failed');
                    resolve(false);
                }
            });
        });
    }
    
    /**
     * Logout from GM role
     */
    function logoutGM() {
        localState.role = Role.PLAYER;
        
        if (socket && connection.connected) {
            socket.emit('gm:logout', {});
        }
        
        emitEvent('sync:gm_logout', {});
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Emit event to EventBus if available
     */
    function emitEvent(event, data) {
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(event, data);
        }
    }
    
    /**
     * Set display name
     */
    function setName(name) {
        localState.name = name;
        
        // Re-announce if connected
        if (connection.connected) {
            sendJoin();
        }
    }
    
    /**
     * Register external handlers
     */
    function registerHandlers(newHandlers) {
        Object.assign(handlers, newHandlers);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // GETTERS
    // ═══════════════════════════════════════════════════════════════════
    
    function isConnected() { return connection.connected; }
    function getLocalState() { return { ...localState }; }
    function getPeers() { return Array.from(peers.values()); }
    function getPeerCount() { return peers.size; }
    function getLatency() { return connection.latency; }
    function isGM() { return localState.role === Role.GM; }
    function getSessionId() { return localState.sessionId; }
    
    /**
     * Get GM's current view (for players to see what GM is looking at)
     */
    function getGMView() {
        for (const peer of peers.values()) {
            if (peer.role === Role.GM) {
                return peer.view;
            }
        }
        return null;
    }
    
    /**
     * Get all players' views (for GM to see what players are looking at)
     */
    function getPlayerViews() {
        const views = {};
        for (const peer of peers.values()) {
            if (peer.role === Role.PLAYER) {
                views[peer.id] = {
                    name: peer.name,
                    view: peer.view
                };
            }
        }
        return views;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        // Constants
        MessageType,
        ViewMode,
        Role,
        VERSION,
        
        // Initialization
        init,
        registerHandlers,
        
        // Connection
        isConnected,
        getLatency,
        ping,
        
        // Local state
        getLocalState,
        setName,
        
        // Peers
        getPeers,
        getPeerCount,
        getGMView,
        getPlayerViews,
        
        // Role
        isGM,
        authenticateGM,
        logoutGM,
        
        // Broadcasting
        broadcastChat,
        broadcastRoll,
        broadcastSceneChange,
        broadcastViewChange,
        
        // Session
        getSessionId,
        
        // Session persistence
        clearToken,
        requestState,
        
        // Self-test
        isSelfTestPassed,
        runSelfTest
    };
})();

console.log('[SyncManager] Module loaded');
