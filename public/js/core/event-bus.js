/**
 * EventBus - Central event system for inter-manager communication
 * 
 * Event naming convention: 'domain:action'
 * Examples:
 *   'display:mode_changed'
 *   'character:hp_changed'
 *   'combat:turn_changed'
 *   'gm:skill_check_triggered'
 *   'animation:caret_tick'
 */

const EventBus = (function() {
    // Map of event names to Sets of callback functions
    const listeners = new Map();
    
    // Debug mode for logging events
    let debugMode = false;
    
    /**
     * Subscribe to an event
     * @param {string} event - Event name (e.g., 'display:mode_changed')
     * @param {Function} callback - Function to call when event fires
     * @returns {Function} Unsubscribe function
     */
    function on(event, callback) {
        if (typeof callback !== 'function') {
            console.error('[EventBus] Callback must be a function');
            return () => {};
        }
        
        if (!listeners.has(event)) {
            listeners.set(event, new Set());
        }
        
        listeners.get(event).add(callback);
        
        if (debugMode) {
            console.log(`[EventBus] Subscribed to '${event}'`);
        }
        
        // Return unsubscribe function
        return () => off(event, callback);
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - The callback to remove
     */
    function off(event, callback) {
        if (!listeners.has(event)) return;
        
        listeners.get(event).delete(callback);
        
        // Clean up empty Sets
        if (listeners.get(event).size === 0) {
            listeners.delete(event);
        }
        
        if (debugMode) {
            console.log(`[EventBus] Unsubscribed from '${event}'`);
        }
    }
    
    /**
     * Emit an event with data
     * @param {string} event - Event name
     * @param {*} data - Data to pass to callbacks
     */
    function emit(event, data) {
        if (debugMode) {
            console.log(`[EventBus] Emit '${event}'`, data);
        }
        
        if (!listeners.has(event)) return;
        
        // Create a copy of listeners to avoid issues if callbacks modify the set
        const callbacks = [...listeners.get(event)];
        
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBus] Error in '${event}' handler:`, error);
            }
        });
    }
    
    /**
     * Subscribe to an event for a single emission only
     * @param {string} event - Event name
     * @param {Function} callback - Function to call once
     * @returns {Function} Unsubscribe function
     */
    function once(event, callback) {
        const wrapper = (data) => {
            off(event, wrapper);
            callback(data);
        };
        return on(event, wrapper);
    }
    
    /**
     * Check if an event has any listeners
     * @param {string} event - Event name
     * @returns {boolean}
     */
    function hasListeners(event) {
        return listeners.has(event) && listeners.get(event).size > 0;
    }
    
    /**
     * Get count of listeners for an event
     * @param {string} event - Event name
     * @returns {number}
     */
    function listenerCount(event) {
        if (!listeners.has(event)) return 0;
        return listeners.get(event).size;
    }
    
    /**
     * Remove all listeners for an event, or all events if no event specified
     * @param {string} [event] - Optional event name
     */
    function clear(event) {
        if (event) {
            listeners.delete(event);
            if (debugMode) {
                console.log(`[EventBus] Cleared listeners for '${event}'`);
            }
        } else {
            listeners.clear();
            if (debugMode) {
                console.log('[EventBus] Cleared all listeners');
            }
        }
    }
    
    /**
     * Enable or disable debug logging
     * @param {boolean} enabled
     */
    function setDebug(enabled) {
        debugMode = enabled;
        console.log(`[EventBus] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Get list of all registered event names (for debugging)
     * @returns {string[]}
     */
    function getEventNames() {
        return [...listeners.keys()];
    }
    
    // Public API
    return {
        on,
        off,
        emit,
        once,
        hasListeners,
        listenerCount,
        clear,
        setDebug,
        getEventNames
    };
})();

// Standard event names (for documentation and consistency)
EventBus.Events = {
    // Display events
    DISPLAY_MODE_CHANGED: 'display:mode_changed',
    DISPLAY_EFFECT_TRIGGERED: 'display:effect_triggered',
    
    // Animation events
    ANIMATION_TICK: 'animation:tick',
    ANIMATION_CARET_TICK: 'animation:caret_tick',
    
    // Input events
    INPUT_MODE_CHANGED: 'input:mode_changed',
    INPUT_FOCUS_CHANGED: 'input:focus_changed',
    
    // Terminal events
    TERMINAL_OPENED: 'terminal:opened',
    TERMINAL_CLOSED: 'terminal:closed',
    TERMINAL_COMMAND: 'terminal:command',
    TERMINAL_OUTPUT: 'terminal:output',
    
    // Scene events
    SCENE_CHANGED: 'scene:changed',
    SCENE_LOADING: 'scene:loading',
    SCENE_LOADED: 'scene:loaded',
    
    // Audio events
    AUDIO_PLAY: 'audio:play',
    AUDIO_STOP: 'audio:stop',
    AUDIO_VOLUME_CHANGED: 'audio:volume_changed',
    
    // Chat events
    CHAT_MESSAGE: 'chat:message',
    CHAT_ROLL: 'chat:roll',
    
    // GM events
    GM_AUTHENTICATED: 'gm:authenticated',
    GM_LOGOUT: 'gm:logout',
    GM_TRIGGER: 'gm:trigger',
    
    // Effect events
    EFFECT_GLITCH: 'effect:glitch',
    EFFECT_TRANSITION: 'effect:transition',
    
    // Sync events (multiplayer)
    SYNC_CONNECTED: 'sync:connected',
    SYNC_DISCONNECTED: 'sync:disconnected',
    SYNC_PEER_JOINED: 'sync:peer_joined',
    SYNC_PEER_LEFT: 'sync:peer_left',
    SYNC_PEER_VIEW_CHANGED: 'sync:peer_view_changed',
    SYNC_PRESENCE: 'sync:presence',
    SYNC_CHAT: 'sync:chat',
    SYNC_ROLL: 'sync:roll',
    SYNC_SCENE_CHANGE: 'sync:scene_change',
    SYNC_STATE: 'sync:state',
    SYNC_ERROR: 'sync:error',
    SYNC_SELF_TEST_PASSED: 'sync:self_test_passed',
    SYNC_SELF_TEST_FAILED: 'sync:self_test_failed',
    SYNC_GM_AUTHENTICATED: 'sync:gm_authenticated',
    SYNC_GM_LOGOUT: 'sync:gm_logout'
};
