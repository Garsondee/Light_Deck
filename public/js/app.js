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
        
        // Initialize SceneManager (scene state, navigation, caching)
        if (typeof SceneManager !== 'undefined') {
            SceneManager.init().then(() => {
                console.log('[APP] SceneManager initialized');
                
                // Load first scene if available
                if (SceneManager.getSceneCount() > 0) {
                    SceneManager.firstScene();
                }
            });
        }
        
        // Initialize GMOverlayManager (GM-only scene overlay)
        if (typeof GMOverlayManager !== 'undefined') {
            const scene = ThreeSetup.getScene();
            GMOverlayManager.init(scene);
            console.log('[APP] GMOverlayManager initialized');
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
            
            // Register GM overlay panel for click handling
            if (typeof GMOverlayManager !== 'undefined') {
                const gmLayout = GMOverlayManager.getLayout();
                UIManager.registerPanel('gm-overlay', GMOverlayManager.getPlane(), GMOverlayManager, {
                    width: gmLayout.width,
                    height: gmLayout.height
                });
            }
            
            console.log('[APP] UIManager initialized');
        }
        
        // Initialize Debug UI (Tweakpane) - Scene Viewer controls
        DebugUI.init();
        
        // Initialize Terminal UI (Tweakpane) - Terminal controls
        TerminalUI.init();
        
        // Initialize SyncManager (multiplayer synchronization)
        initSyncManager();
        
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
            // Normal startup - fade in from black even without full boot sequence
            if (CRTShader?.config) {
                CRTShader.config.brightness = 0;

                if (typeof TransitionManager !== 'undefined') {
                    // Long, smooth power-up
                    TransitionManager.powerUp({
                        duration: 1800,
                        targetBrightness: 1.0
                    });
                } else {
                    // Simple fallback fade-in
                    const originalBrightness = 1.0;
                    const fadeDuration = 1800;
                    const startTime = performance.now();

                    const animate = (now) => {
                        const t = Math.min(1, (now - startTime) / fadeDuration);
                        const eased = 1 - Math.pow(1 - t, 2);
                        CRTShader.config.brightness = originalBrightness * eased;

                        if (t < 1) {
                            requestAnimationFrame(animate);
                        } else {
                            CRTShader.config.brightness = originalBrightness;
                        }
                    };

                    requestAnimationFrame(animate);
                }
            }

            // Normal startup messages
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
     * Uses TransitionManager for consistent CRT power-down/power-up effects
     */
    function toggleTerminalMode() {
        if (typeof TerminalManager === 'undefined') {
            console.warn('[APP] TerminalManager not available');
            return;
        }
        
        // Prevent toggle during transition
        if (typeof TransitionManager !== 'undefined' && TransitionManager.isTransitioning()) {
            console.log('[APP] Transition in progress, ignoring toggle');
            return;
        }
        
        const isCurrentlyVisible = TerminalManager.isVisible();
        
        if (!isCurrentlyVisible) {
            // Entering terminal mode - power down, switch, power up
            const isFirstBoot = !TerminalManager.isBootComplete();
            
            if (typeof TransitionManager !== 'undefined') {
                TransitionManager.transition({
                    powerDownDuration: 2400,
                    blackPauseDuration: 1200,
                    powerUpDuration: 1800,
                    onMidpoint: () => {
                        // Play startup sound on first boot
                        if (isFirstBoot) {
                            playTerminalStartupSound();
                        }
                        
                        // Show terminal (boot sequence runs if first time)
                        if (isFirstBoot) {
                            TerminalManager.runBootSequence();
                        } else {
                            TerminalManager.show();
                        }
                        
                        // Update UI state
                        InputManager.setMode(InputManager.Mode.TERMINAL);
                        if (typeof ChatManager !== 'undefined' && typeof ChatManager.setInputActive === 'function') {
                            ChatManager.setInputActive(false);
                        }
                        
                        // Broadcast view change to other players
                        if (typeof SyncManager !== 'undefined') {
                            SyncManager.broadcastViewChange(SyncManager.ViewMode.TERMINAL);
                        }
                    }
                }).then(() => {
                    console.log('[APP] Terminal mode enabled');
                });
            } else {
                // Fallback without TransitionManager
                if (isFirstBoot) {
                    playTerminalStartupSound();
                    TerminalManager.runBootSequence();
                } else {
                    TerminalManager.show();
                }
                InputManager.setMode(InputManager.Mode.TERMINAL);
                if (typeof ChatManager !== 'undefined' && typeof ChatManager.setInputActive === 'function') {
                    ChatManager.setInputActive(false);
                }
                if (typeof SyncManager !== 'undefined') {
                    SyncManager.broadcastViewChange(SyncManager.ViewMode.TERMINAL);
                }
                console.log('[APP] Terminal mode enabled');
            }
        } else {
            // Exiting terminal mode - power down, switch, power up
            if (typeof TransitionManager !== 'undefined') {
                TransitionManager.transition({
                    powerDownDuration: 2400,
                    blackPauseDuration: 1200,
                    powerUpDuration: 1800,
                    onMidpoint: () => {
                        // Hide terminal
                        TerminalManager.hide();
                        
                        // Update UI state
                        InputManager.setMode(InputManager.Mode.SCENE_VIEWER);
                        
                        // Reactivate chat input
                        if (typeof ChatManager !== 'undefined' && typeof ChatManager.setInputActive === 'function') {
                            ChatManager.setInputActive(true);
                        }
                        
                        // Broadcast view change to other players
                        if (typeof SyncManager !== 'undefined') {
                            SyncManager.broadcastViewChange(SyncManager.ViewMode.SCENE_VIEWER);
                        }
                    }
                }).then(() => {
                    console.log('[APP] Terminal mode disabled');
                });
            } else {
                // Fallback without TransitionManager
                TerminalManager.hide();
                InputManager.setMode(InputManager.Mode.SCENE_VIEWER);
                if (typeof ChatManager !== 'undefined' && typeof ChatManager.setInputActive === 'function') {
                    ChatManager.setInputActive(true);
                }
                if (typeof SyncManager !== 'undefined') {
                    SyncManager.broadcastViewChange(SyncManager.ViewMode.SCENE_VIEWER);
                }
                console.log('[APP] Terminal hidden');
            }
        }
    }
    
    /**
     * Initialize SyncManager for multiplayer synchronization
     */
    function initSyncManager() {
        if (typeof SyncManager === 'undefined') {
            console.warn('[APP] SyncManager not available');
            return;
        }
        
        // Generate a random player name for now
        const playerName = 'Player_' + Math.random().toString(36).substring(2, 6).toUpperCase();
        
        // Initialize with self-test enabled
        SyncManager.init({
            name: playerName,
            sessionId: 'default',
            selfTest: true
        });
        
        // Register handlers for sync events
        SyncManager.registerHandlers({
            onConnect: (localState) => {
                state.connected = true;
                addChatMessage('system', `Network link established. You are ${localState.name}`);
            },
            
            onDisconnect: (reason) => {
                state.connected = false;
                addChatMessage('system', 'WARNING: Network link lost.');
            },
            
            onPeerJoin: (peer) => {
                const roleLabel = peer.role === 'gm' ? '[GM]' : '';
                addChatMessage('system', `${roleLabel} ${peer.name} connected.`);
            },
            
            onPeerLeave: (peer) => {
                addChatMessage('system', `${peer.name} disconnected.`);
            },
            
            onPeerViewChange: (peer) => {
                // GM can see when players switch views
                if (SyncManager.isGM()) {
                    const viewLabel = peer.view === 'terminal' ? 'TERMINAL' : 'SCENE';
                    addChatMessage('system', `${peer.name} switched to ${viewLabel}`);
                }
            },
            
            onChat: (data) => {
                // Received chat from another player
                const prefix = data.role === 'gm' ? '[GM] ' : '';
                addChatMessage(data.type, `${prefix}${data.name}: ${data.text}`);
            },
            
            onRoll: (data) => {
                // Received dice roll from another player
                const prefix = data.role === 'gm' ? '[GM] ' : '';
                const rollsStr = data.rolls.map(r => `[${r}]`).join(' ');
                addChatMessage('roll', `${prefix}${data.name} rolled ${data.expression}: ${rollsStr} = ${data.total}`);
            },
            
            onSceneChange: (data) => {
                // GM pushed a scene change - route through SceneManager so
                // TransitionManager can handle CRT power-down/power-up.
                addChatMessage('system', `Scene changed to: ${data.scene}`);

                if (typeof SceneManager !== 'undefined') {
                    // Use SceneManager so the image only swaps at transition midpoint.
                    // data.scene is the scene ID.
                    const success = SceneManager.goToScene(data.scene, /* broadcast */ false);
                    if (!success) {
                        console.warn('[APP] SceneManager could not go to scene from SyncManager:', data.scene);
                    }
                } else {
                    console.warn('[APP] SceneManager not available; falling back to direct image load');

                    // Fallback: direct image load with no transition
                    fetch(`/api/scenes/${data.scene}`)
                        .then(res => res.json())
                        .then(scene => {
                            if (scene.imageUrl && typeof ThreeSetup !== 'undefined') {
                                ThreeSetup.loadSceneImage(scene.imageUrl);
                            }
                        })
                        .catch(err => {
                            console.error('[APP] Failed to load scene (fallback):', err);
                        });
                }
            },
            
            onError: (data) => {
                addChatMessage('error', `Sync error: ${data.message}`);
            }
        });
        
        // Listen for self-test results via EventBus
        if (typeof EventBus !== 'undefined') {
            EventBus.on('sync:self_test_passed', (data) => {
                addChatMessage('system', `Self-test passed (${data.latency}ms round-trip)`);
            });
            
            EventBus.on('sync:self_test_failed', (data) => {
                // Don't show error for proxy-related failures (expected in dev)
                if (data.silent) {
                    addChatMessage('system', 'Running through proxy (sync limited)');
                } else {
                    addChatMessage('error', `Self-test FAILED: ${data.reason}`);
                }
            });
            
            // Listen for presence updates
            EventBus.on('sync:presence', (data) => {
                const count = data.peers.length;
                if (count > 0) {
                    const names = data.peers.map(p => p.name).join(', ');
                    addChatMessage('system', `Online: ${names}`);
                }
            });
        }
        
        console.log('[APP] SyncManager initialized');
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
