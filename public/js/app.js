/**
 * Light Deck - Main Application
 */

const App = (function() {
    // Application state
    const state = {
        mode: 'player',
        connected: false,
        diceQueue: [],
        chatLog: []
    };
    
    let socket;
    const TERMINAL_STARTUP_SOUND_URL = '/sounds/terminal/Terminal_Startup.mp3';
    let terminalStartupSound = null;
    
    function init() {
        console.log('[APP] Initializing Light Deck...');
        
        // Initialize AnimationManager (central animation loop)
        if (typeof AnimationManager !== 'undefined') {
            AnimationManager.init();
            console.log('[APP] AnimationManager initialized');
        }
        
        // Initialize DisplayManager (coordinates Scene Viewer / Terminal)
        if (typeof DisplayManager !== 'undefined') {
            DisplayManager.init();
            console.log('[APP] DisplayManager initialized');
        }
        
        // Initialize Three.js
        ThreeSetup.init();
        
        // Initialize LayoutManager FIRST - single source of truth for all positions
        if (typeof LayoutManager !== 'undefined') {
            const camera = ThreeSetup.getCamera();
            LayoutManager.init(camera);
            console.log('[APP] LayoutManager initialized');
            
            // Now update ThreeSetup's scene plane position from LayoutManager
            ThreeSetup.updateScenePlanePosition();
        }
        
        // Initialize TerminalManager (canvas-based terminal)
        if (typeof TerminalManager !== 'undefined') {
            const scene = ThreeSetup.getScene();
            TerminalManager.init(scene, {
                phosphor: 'p3',
                fontSize: 16,
                glowIntensity: 0.8
            });
            console.log('[APP] TerminalManager initialized');
        }
        
        // Initialize ChatManager (canvas-based chat log - replaces DOM sidebar)
        // Now reads position from LayoutManager
        if (typeof ChatManager !== 'undefined') {
            const scene = ThreeSetup.getScene();
            ChatManager.init(scene, {
                phosphor: 'p3',
                fontSize: 15,
                glowIntensity: 0.9
            });
            
            // Default focus: chat input active with caret ready
            if (typeof ChatManager.setInputActive === 'function') {
                ChatManager.setInputActive(true);
            }
            console.log('[APP] ChatManager initialized');
        }
        
        // Initialize ChassisManager (retro-futuristic hardware frame)
        // Now reads layout from LayoutManager
        if (typeof ChassisManager !== 'undefined') {
            const scene = ThreeSetup.getScene();
            ChassisManager.init(scene);
            console.log('[APP] ChassisManager initialized');
        }
        
        // Initialize ControlPanelManager (physical buttons and dials)
        // Now reads layout from LayoutManager
        if (typeof ControlPanelManager !== 'undefined') {
            const scene = ThreeSetup.getScene();
            ControlPanelManager.init(scene);
            console.log('[APP] ControlPanelManager initialized');
        }
        
        // Initialize UIManager (raycasting for clickable UI elements)
        if (typeof UIManager !== 'undefined') {
            UIManager.init({
                camera: ThreeSetup.getCamera(),
                scene: ThreeSetup.getScene(),
                renderer: ThreeSetup.getRenderer()
            });
            
            // Register chat panel for click handling
            if (typeof ChatManager !== 'undefined') {
                const chatLayout = ChatManager.getLayout();
                UIManager.registerPanel('chat', ChatManager.getPlane(), ChatManager, {
                    width: chatLayout.width,
                    height: chatLayout.height
                });
            }
            
            console.log('[APP] UIManager initialized');
        }
        
        // Initialize Debug UI (Tweakpane) - Scene Viewer controls
        DebugUI.init();
        
        // Initialize Terminal UI (Tweakpane) - Terminal controls
        TerminalUI.init();
        
        // Initialize Socket.io
        initSocket();
        
        // Set up UI event listeners
        initDicePanel();
        initGMButton();
        initTermButton();
        initChatInput();
        
        // Initialize Input Manager for mode-aware keyboard routing
        // All input now handled by canvas-based managers (ChatManager, TerminalManager)
        InputManager.init({
            chatInput: null,
            terminalInput: null
        });
        
        // Register action handlers with InputManager
        // This is the ONLY place keyboard actions are wired up
        InputManager.registerHandlers({
            onDebugUIToggle: () => {
                // Toggle Scene Viewer Tweakpane
                if (typeof DebugUI !== 'undefined') {
                    DebugUI.toggleVisibility();
                }

                // Keep [OPTIONS] header text brightness/state in sync when the
                // backtick key is used (instead of the physical/chat button).
                if (typeof ChatManager !== 'undefined' &&
                    typeof ChatManager.getControlState === 'function' &&
                    typeof ChatManager.setControlState === 'function') {
                    const current = ChatManager.getControlState('options');
                    const next = !current;
                    ChatManager.setControlState('options', next);
                }
            },
            onTerminalUIToggle: () => TerminalUI.toggleVisibility(),
            onCaretReset: () => {
                if (typeof AnimationManager !== 'undefined') {
                    AnimationManager.resetCaretPhase();
                }
            },
            onEscape: () => {
                // Exit terminal mode if active
                if (ThreeSetup.isTerminalMode()) {
                    const btn = document.getElementById('term-btn');
                    if (btn) btn.click();
                }
            }
        });
        
        // Check if we should run the startup boot sequence
        if (typeof StartupManager !== 'undefined' && StartupManager.shouldRunBoot()) {
            // Run startup boot sequence (first time load)
            console.log('[APP] Running first-time startup sequence...');
            StartupManager.runBootSequence().then(() => {
                // After boot, show welcome messages
                addChatMessage('system', 'Systems online. Awaiting input.');
                addChatMessage('system', 'Press ` to toggle Scene Viewer controls.');
                addChatMessage('system', 'Press ~ to toggle Terminal controls.');
            });
        } else {
            // Normal startup - show messages immediately
            addChatMessage('system', 'Systems online. Awaiting input.');
            addChatMessage('system', 'Press ` to toggle Scene Viewer controls.');
            addChatMessage('system', 'Press ~ to toggle Terminal controls.');
        }
    }

    function initTermButton() {
        // DOM TERM button has been removed - terminal toggle is now via:
        // 1. ChatManager clickable [TERM] element
        // 2. EventBus 'ui:terminal-toggle' event
        // 3. Direct call to toggleTerminalMode()
        
        // Register event handler for terminal toggle
        if (typeof EventBus !== 'undefined') {
            EventBus.on('ui:terminal-toggle', toggleTerminalMode);
        }
        
        console.log('[APP] Terminal button now integrated into ChatManager');
    }
    
    /**
     * Toggle terminal mode (called by EventBus or ChatManager)
     */
    function toggleTerminalMode() {
        if (typeof TerminalManager === 'undefined') {
            console.warn('[APP] TerminalManager not available');
            return;
        }
        
        const isCurrentlyVisible = TerminalManager.isVisible();
        
        if (!isCurrentlyVisible && !TerminalManager.isBootComplete()) {
            // First time entering terminal - fade to black, then boot
            const originalBrightness = CRTShader.config.brightness;
            const fadeDuration = 700;
            const startTime = performance.now();
            
            const runFade = (now) => {
                const t = Math.min(1, (now - startTime) / fadeDuration);
                CRTShader.config.brightness = originalBrightness * (1 - t);
                
                if (t < 1) {
                    requestAnimationFrame(runFade);
                } else {
                    CRTShader.config.brightness = originalBrightness;
                    
                    // Play startup sound
                    playTerminalStartupSound();
                    
                    // Show terminal and run boot sequence
                    TerminalManager.runBootSequence();
                    
                    // Update UI state
                    InputManager.setMode(InputManager.Mode.TERMINAL);
                    if (typeof ChatManager !== 'undefined' && typeof ChatManager.setInputActive === 'function') {
                        ChatManager.setInputActive(false);
                    }
                    
                    console.log('[APP] Terminal mode enabled');
                }
            };
            
            requestAnimationFrame(runFade);
        } else if (!isCurrentlyVisible) {
            // Re-entering terminal after boot complete
            TerminalManager.show();
            InputManager.setMode(InputManager.Mode.TERMINAL);
            if (typeof ChatManager !== 'undefined' && typeof ChatManager.setInputActive === 'function') {
                ChatManager.setInputActive(false);
            }
            console.log('[APP] Terminal shown');
        } else {
            // Exiting terminal
            TerminalManager.hide();
            InputManager.setMode(InputManager.Mode.SCENE_VIEWER);
            console.log('[APP] Terminal hidden');
        }
    }
    
    function initSocket() {
        socket = io();
        
        socket.on('connect', () => {
            state.connected = true;
            console.log('[SOCKET] Connected');
            addChatMessage('system', 'Network link established.');
        });
        
        socket.on('disconnect', () => {
            state.connected = false;
            console.log('[SOCKET] Disconnected');
            addChatMessage('system', 'WARNING: Network link lost.');
        });
    }
    
    function initDicePanel() {
        // DOM dice panel has been removed - dice rolling is now via ChatManager
        // This function is kept for legacy compatibility but does nothing
        console.log('[APP] Dice panel now integrated into ChatManager (use /roll command)');
    }
    
    function addDieToQueue(die) {
        state.diceQueue.push(die);
        updateDiceQueueDisplay();
    }
    
    function clearDiceQueue() {
        state.diceQueue = [];
        updateDiceQueueDisplay();
    }
    
    function updateDiceQueueDisplay() {
        // DOM dice queue display has been removed
        // This function is kept for legacy compatibility but does nothing
    }
    
    function rollDice() {
        // Legacy dice rolling - now handled by ChatManager
        // This function is kept for compatibility but dice rolling
        // should be done via ChatManager's /roll command
        if (state.diceQueue.length === 0) {
            addChatMessage('system', 'No dice selected. Use /roll XdY in chat.');
            return;
        }
        
        const modifier = 0;  // Modifier input removed with DOM
        const results = state.diceQueue.map(die => ({
            die,
            result: Math.floor(Math.random() * die) + 1
        }));
        
        const total = results.reduce((sum, r) => sum + r.result, 0) + modifier;
        
        // Format output
        const diceStr = results.map(r => `[${r.result}]`).join(' ');
        const modStr = modifier !== 0 ? ` ${modifier >= 0 ? '+' : ''}${modifier}` : '';
        
        // Build queue display from state
        const counts = {};
        state.diceQueue.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
        const queueDisplay = Object.entries(counts).map(([die, count]) => 
            count > 1 ? `${count}d${die}` : `d${die}`
        ).join(' + ');
        
        addChatMessage('roll', `ROLL: ${queueDisplay}${modStr} → ${diceStr}${modStr} = ${total}`);
        
        // Clear queue after roll
        clearDiceQueue();
    }
    
    function addChatMessage(type, text) {
        // Route to ChatManager (canvas-based) if available
        if (typeof ChatManager !== 'undefined') {
            ChatManager.addMessage(type, text);
            return;
        }
        
        // Legacy DOM fallback (should not be reached after migration)
        const container = document.getElementById('chat-messages');
        if (!container) {
            console.warn('[APP] No chat container available');
            return;
        }
        
        const entry = document.createElement('div');
        entry.className = `chat-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        entry.textContent = `[${timestamp}] ${text}`;
        container.appendChild(entry);
        
        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
        
        // Store in state
        state.chatLog.push({ type, text, timestamp: Date.now() });
    }
    
    function initGMButton() {
        // DOM GM button has been removed - GM access will be via ChatManager command
        console.log('[APP] GM button now integrated into ChatManager (use /gm command)');
    }
    
    /**
     * Initialize chat input - now handled by ChatManager
     */
    function initChatInput() {
        console.log('[APP] Chat input now integrated into ChatManager');
    }

    function playTerminalStartupSound() {
        if (!window.Audio || typeof window.Audio !== 'function') return;

        if (!terminalStartupSound) {
            terminalStartupSound = new window.Audio(TERMINAL_STARTUP_SOUND_URL);
        }

        // Don't start another copy if one is already playing
        if (!terminalStartupSound.paused && !terminalStartupSound.ended) {
            return;
        }

        terminalStartupSound.currentTime = 0;
        terminalStartupSound.play().catch(err => {
            console.error('[APP] Failed to play terminal startup sound:', err);
        });
    }
    
    /**
     * Parse dice roll expression with keep highest/lowest support
     */
    function parseDiceRoll(expr) {
        // Try keep highest/lowest format: 4d6kh3 or 2d20kl1
        const keepMatch = expr.match(/^(\d*)d(\d+)(kh|kl)(\d+)$/i);
        if (keepMatch) {
            const count = parseInt(keepMatch[1]) || 1;
            const sides = parseInt(keepMatch[2]);
            const keepType = keepMatch[3].toLowerCase();
            const keepCount = parseInt(keepMatch[4]);
            
            if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
            if (keepCount < 1 || keepCount > count) return null;
            
            const rolls = [];
            for (let i = 0; i < count; i++) {
                rolls.push(Math.floor(Math.random() * sides) + 1);
            }
            
            const sorted = [...rolls].sort((a, b) => b - a);
            const kept = keepType === 'kh' 
                ? sorted.slice(0, keepCount)
                : sorted.slice(-keepCount);
            
            const total = kept.reduce((a, b) => a + b, 0);
            
            return {
                expression: `${count}d${sides}${keepType}${keepCount}`,
                rolls,
                kept,
                modifier: 0,
                total
            };
        }
        
        // Standard format: 2d6+3
        const match = expr.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
        if (!match) return null;
        
        const count = parseInt(match[1]) || 1;
        const sides = parseInt(match[2]);
        const modifier = parseInt(match[3]) || 0;
        
        if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
        
        const rolls = [];
        for (let i = 0; i < count; i++) {
            rolls.push(Math.floor(Math.random() * sides) + 1);
        }
        
        const total = rolls.reduce((a, b) => a + b, 0) + modifier;
        
        return {
            expression: `${count}d${sides}${modifier >= 0 && modifier !== 0 ? '+' : ''}${modifier !== 0 ? modifier : ''}`,
            rolls,
            modifier,
            total
        };
    }
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Public API
    return {
        init,
        addChatMessage,
        toggleTerminalMode,
        getState: () => ({ ...state })
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
