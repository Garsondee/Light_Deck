/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DICE MANAGER - 3D Dice Rolling with dice-box
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Wraps @3d-dice/dice-box for 3D physics-based dice rolling.
 * Manages dice appearance settings per player and GM defaults.
 * 
 * Usage:
 *   await DiceManager.init('#dice-box');
 *   const result = await DiceManager.roll('2d6+3');
 * 
 * Events emitted via EventBus:
 *   - dice:rolling - Roll started
 *   - dice:result  - Roll complete with results
 *   - dice:cleared - Dice cleared from view
 */

const DiceManager = (function() {
    'use strict';
    
    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════
    
    let diceBox = null;
    let initialized = false;
    let rolling = false;
    let pendingRollResolve = null;
    
    // Default dice appearance settings
    const DEFAULT_SETTINGS = {
        theme: 'default',
        themeColor: '#5e8cc9',  // Nice blue
        scale: 6,
        gravity: 2,
        mass: 1,
        friction: 0.8,
        restitution: 0.5,
        linearDamping: 0.5,
        angularDamping: 0.4,
        spinForce: 5,
        throwForce: 5,
        startingHeight: 10,
        settleTimeout: 5000
    };
    
    // Current player settings (loaded from localStorage or server)
    let playerSettings = { ...DEFAULT_SETTINGS };
    
    // GM default settings for new players
    let gmDefaultSettings = { ...DEFAULT_SETTINGS };
    
    // Storage key for player dice settings
    const STORAGE_KEY = 'lightdeck_dice_settings';
    
    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * Initialize the dice box
     * @param {string} selector - CSS selector for the dice container
     * @param {Object} options - Optional configuration overrides
     */
    async function init(selector = '#dice-box', options = {}) {
        if (initialized) {
            console.warn('[DiceManager] Already initialized');
            return;
        }
        
        console.log('[DiceManager] Initializing...');
        
        // Try to load GM defaults from server first
        await loadGMDefaults();
        
        // Load player settings from localStorage (or apply GM defaults if first time)
        loadPlayerSettings();
        
        // Merge settings
        const config = {
            assetPath: '/assets/',
            container: selector,
            theme: playerSettings.theme,
            themeColor: playerSettings.themeColor,
            scale: playerSettings.scale,
            gravity: playerSettings.gravity,
            mass: playerSettings.mass,
            friction: playerSettings.friction,
            restitution: playerSettings.restitution,
            linearDamping: playerSettings.linearDamping,
            angularDamping: playerSettings.angularDamping,
            spinForce: playerSettings.spinForce,
            throwForce: playerSettings.throwForce,
            startingHeight: playerSettings.startingHeight,
            settleTimeout: playerSettings.settleTimeout,
            enableShadows: true,
            shadowTransparency: 0.8,
            lightIntensity: 1,
            ...options
        };
        
        try {
            // Dynamically import dice-box (ES module)
            const DiceBoxModule = await import('https://unpkg.com/@3d-dice/dice-box@1.1.3/dist/dice-box.es.min.js');
            const DiceBox = DiceBoxModule.default;
            
            // Create dice box instance
            diceBox = new DiceBox(selector, config);
            
            // Initialize and wait for it to be ready
            await diceBox.init();
            
            // Set up roll complete callback
            diceBox.onRollComplete = handleRollComplete;
            
            // Set up dice removed callback
            diceBox.onDieRemoved = handleDieRemoved;
            
            initialized = true;
            console.log('[DiceManager] Initialized successfully');
            
            // Emit ready event
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('dice:ready');
            }
            
        } catch (error) {
            console.error('[DiceManager] Failed to initialize:', error);
            throw error;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ROLLING
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * Roll dice with 3D animation
     * @param {string} notation - Dice notation like "2d6+3" or "d20"
     * @returns {Promise<Object>} Roll result with total and individual rolls
     */
    async function roll(notation) {
        if (!initialized) {
            console.error('[DiceManager] Not initialized. Call init() first.');
            return null;
        }
        
        if (rolling) {
            console.warn('[DiceManager] Roll already in progress');
            return null;
        }
        
        console.log('[DiceManager] Rolling:', notation);
        rolling = true;
        
        // Emit rolling event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('dice:rolling', { notation });
        }
        
        // Create a promise that will be resolved when roll completes
        return new Promise((resolve) => {
            pendingRollResolve = resolve;
            
            // Perform the roll
            diceBox.roll(notation);
        });
    }
    
    /**
     * Add more dice to current roll
     * @param {string} notation - Additional dice notation
     */
    function add(notation) {
        if (!initialized || !rolling) return;
        diceBox.add(notation);
    }
    
    /**
     * Clear all dice from the box
     */
    function clear() {
        if (!initialized) return;
        
        diceBox.clear();
        rolling = false;
        
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('dice:cleared');
        }
    }
    
    /**
     * Handle roll complete callback from dice-box
     * @param {Array} results - Array of die results
     */
    function handleRollComplete(results) {
        console.log('[DiceManager] Roll complete:', results);
        
        // Parse results into a cleaner format
        const parsed = parseResults(results);
        
        rolling = false;
        
        // Emit result event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('dice:result', parsed);
        }
        
        // Resolve pending promise
        if (pendingRollResolve) {
            pendingRollResolve(parsed);
            pendingRollResolve = null;
        }
        
        // Auto-clear after a delay
        setTimeout(() => {
            if (!rolling) {
                clear();
            }
        }, 3000);
    }
    
    /**
     * Handle die removed callback
     * @param {Object} die - The removed die
     */
    function handleDieRemoved(die) {
        console.log('[DiceManager] Die removed:', die);
    }
    
    /**
     * Parse dice-box results into a cleaner format
     * @param {Array} results - Raw results from dice-box
     * @returns {Object} Parsed result object
     */
    function parseResults(results) {
        const rolls = [];
        let total = 0;
        let modifier = 0;
        
        for (const die of results) {
            if (die.type === 'mod') {
                modifier += die.value;
            } else {
                rolls.push({
                    type: die.type || `d${die.sides}`,
                    sides: die.sides,
                    value: die.value
                });
                total += die.value;
            }
        }
        
        total += modifier;
        
        // Build expression string
        const diceCounts = {};
        for (const r of rolls) {
            const key = r.sides;
            diceCounts[key] = (diceCounts[key] || 0) + 1;
        }
        
        let expression = Object.entries(diceCounts)
            .map(([sides, count]) => `${count}d${sides}`)
            .join('+');
        
        if (modifier !== 0) {
            expression += modifier > 0 ? `+${modifier}` : `${modifier}`;
        }
        
        return {
            expression,
            rolls,
            modifier,
            total,
            raw: results
        };
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // SETTINGS MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * Load GM default settings from server
     */
    async function loadGMDefaults() {
        try {
            const response = await fetch('/api/dice/defaults');
            if (response.ok) {
                const defaults = await response.json();
                gmDefaultSettings = { ...DEFAULT_SETTINGS, ...defaults };
                console.log('[DiceManager] Loaded GM defaults from server');
            }
        } catch (e) {
            console.warn('[DiceManager] Could not load GM defaults:', e);
        }
    }
    
    /**
     * Load player settings from localStorage
     */
    function loadPlayerSettings() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                playerSettings = { ...DEFAULT_SETTINGS, ...parsed };
                console.log('[DiceManager] Loaded player settings:', playerSettings);
            } else {
                // First time - apply GM defaults
                playerSettings = { ...gmDefaultSettings };
                console.log('[DiceManager] Applied GM defaults for new player');
            }
        } catch (e) {
            console.warn('[DiceManager] Failed to load settings:', e);
        }
    }
    
    /**
     * Save player settings to localStorage
     */
    function savePlayerSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(playerSettings));
            console.log('[DiceManager] Saved player settings');
        } catch (e) {
            console.warn('[DiceManager] Failed to save settings:', e);
        }
    }
    
    /**
     * Update player dice settings
     * @param {Object} settings - New settings to apply
     */
    function updateSettings(settings) {
        playerSettings = { ...playerSettings, ...settings };
        savePlayerSettings();
        
        // Apply to dice box if initialized
        if (initialized && diceBox) {
            diceBox.updateConfig(settings);
        }
        
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('dice:settings_changed', playerSettings);
        }
    }
    
    /**
     * Get current player settings
     * @returns {Object} Current settings
     */
    function getSettings() {
        return { ...playerSettings };
    }
    
    /**
     * Reset player settings to defaults (or GM defaults if available)
     */
    function resetSettings() {
        playerSettings = { ...gmDefaultSettings };
        savePlayerSettings();
        
        if (initialized && diceBox) {
            diceBox.updateConfig(playerSettings);
        }
        
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('dice:settings_changed', playerSettings);
        }
    }
    
    /**
     * Set GM default settings (for new players)
     * @param {Object} settings - Default settings
     */
    function setGMDefaults(settings) {
        gmDefaultSettings = { ...DEFAULT_SETTINGS, ...settings };
        console.log('[DiceManager] GM defaults updated:', gmDefaultSettings);
    }
    
    /**
     * Get GM default settings
     * @returns {Object} GM default settings
     */
    function getGMDefaults() {
        return { ...gmDefaultSettings };
    }
    
    /**
     * Apply GM defaults to current player (used on first login)
     */
    function applyGMDefaults() {
        // Only apply if player has no saved settings
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            playerSettings = { ...gmDefaultSettings };
            savePlayerSettings();
            
            if (initialized && diceBox) {
                diceBox.updateConfig(playerSettings);
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // THEME MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * Get available themes
     * @returns {Array<string>} List of theme names
     */
    function getAvailableThemes() {
        // Default themes that come with dice-box
        return ['default'];
    }
    
    /**
     * Set dice theme
     * @param {string} themeName - Theme name
     */
    function setTheme(themeName) {
        updateSettings({ theme: themeName });
    }
    
    /**
     * Set dice color
     * @param {string} color - Hex color string
     */
    function setColor(color) {
        updateSettings({ themeColor: color });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // VISIBILITY
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * Show the dice box container
     */
    function show() {
        const container = document.getElementById('dice-box');
        if (container) {
            container.style.display = 'block';
            container.style.opacity = '1';
        }
    }
    
    /**
     * Hide the dice box container
     */
    function hide() {
        const container = document.getElementById('dice-box');
        if (container) {
            container.style.opacity = '0';
            setTimeout(() => {
                container.style.display = 'none';
            }, 300);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════
    
    return {
        // Initialization
        init,
        
        // Rolling
        roll,
        add,
        clear,
        
        // Settings
        getSettings,
        updateSettings,
        resetSettings,
        setGMDefaults,
        getGMDefaults,
        applyGMDefaults,
        
        // Themes
        getAvailableThemes,
        setTheme,
        setColor,
        
        // Visibility
        show,
        hide,
        
        // State
        isInitialized: () => initialized,
        isRolling: () => rolling,
        
        // Constants
        DEFAULT_SETTINGS
    };
})();

// Make available globally
if (typeof window !== 'undefined') {
    window.DiceManager = DiceManager;
}
