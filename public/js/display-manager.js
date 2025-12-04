/**
 * DisplayManager - Coordinates between Scene Viewer and Terminal Display
 * 
 * Responsibilities:
 * - Coordinate between Scene Viewer and Terminal Display
 * - Handle mode switching (Scene Viewer ↔ Terminal)
 * - Manage CRT shader state transitions
 * - Route render updates to correct display
 * - Trigger visual effects
 */

const DisplayManager = (function() {
    // Display modes
    const Mode = {
        SCENE_VIEWER: 'scene_viewer',
        TERMINAL: 'terminal'
    };
    
    let currentMode = Mode.SCENE_VIEWER;
    let initialized = false;
    
    // Mode transition state
    let transitioning = false;
    let transitionStartTime = 0;
    
    // Effect queue for chaining effects
    const effectQueue = [];
    let processingEffects = false;
    
    /**
     * Initialize the display manager
     */
    function init() {
        if (initialized) {
            console.warn('[DisplayManager] Already initialized');
            return;
        }
        
        // Subscribe to input mode changes via EventBus
        if (typeof EventBus !== 'undefined') {
            EventBus.on(EventBus.Events.INPUT_MODE_CHANGED, handleInputModeChange);
        }
        
        initialized = true;
        console.log('[DisplayManager] Initialized');
    }
    
    /**
     * Handle input mode changes from InputManager
     */
    function handleInputModeChange(data) {
        // Sync display mode with input mode
        if (data.mode === 'terminal' && currentMode !== Mode.TERMINAL) {
            setMode(Mode.TERMINAL);
        } else if (data.mode === 'scene_viewer' && currentMode !== Mode.SCENE_VIEWER) {
            setMode(Mode.SCENE_VIEWER);
        }
    }
    
    /**
     * Set the display mode
     * @param {string} mode - Mode.SCENE_VIEWER or Mode.TERMINAL
     * @param {Object} options - Transition options
     */
    function setMode(mode, options = {}) {
        if (mode !== Mode.SCENE_VIEWER && mode !== Mode.TERMINAL) {
            console.warn('[DisplayManager] Invalid mode:', mode);
            return;
        }
        
        if (mode === currentMode) return;
        
        const previousMode = currentMode;
        currentMode = mode;
        
        console.log('[DisplayManager] Mode changed:', previousMode, '->', currentMode);
        
        // Emit mode change event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(EventBus.Events.DISPLAY_MODE_CHANGED, {
                mode: currentMode,
                previousMode: previousMode
            });
        }
        
        // Handle CRT shader config switching via ThreeSetup
        if (typeof ThreeSetup !== 'undefined') {
            if (currentMode === Mode.TERMINAL) {
                // ThreeSetup.enableTerminalMode handles config switching
            } else {
                // ThreeSetup.disableTerminalMode handles config restoration
            }
        }
    }
    
    /**
     * Get the current display mode
     * @returns {string}
     */
    function getMode() {
        return currentMode;
    }
    
    /**
     * Check if in terminal mode
     * @returns {boolean}
     */
    function isTerminalMode() {
        return currentMode === Mode.TERMINAL;
    }
    
    /**
     * Check if in scene viewer mode
     * @returns {boolean}
     */
    function isSceneViewerMode() {
        return currentMode === Mode.SCENE_VIEWER;
    }
    
    /**
     * Trigger a visual effect
     * @param {string} type - Effect type ('glitch', 'interference', 'hsync', 'transition')
     * @param {Object} params - Effect parameters
     */
    function triggerEffect(type, params = {}) {
        const effect = { type, params, timestamp: performance.now() };
        
        // Emit effect event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(EventBus.Events.DISPLAY_EFFECT_TRIGGERED, effect);
        }
        
        // Execute effect based on type
        switch (type) {
            case 'glitch':
                executeGlitchEffect(params);
                break;
            case 'interference':
                executeInterferenceEffect(params);
                break;
            case 'hsync':
                executeHSyncEffect(params);
                break;
            case 'transition':
                executeTransitionEffect(params);
                break;
            default:
                console.warn('[DisplayManager] Unknown effect type:', type);
        }
    }
    
    /**
     * Execute glitch effect
     */
    function executeGlitchEffect(params) {
        const intensity = params.intensity || 0.5;
        const duration = params.duration || 300;
        
        if (typeof ThreeSetup !== 'undefined') {
            ThreeSetup.triggerGlitch(intensity, duration);
        }
        
        // Also trigger on phosphor terminal if in terminal mode
        if (currentMode === Mode.TERMINAL && typeof PhosphorText !== 'undefined') {
            const terminalContent = document.querySelector('.phosphor-display');
            if (terminalContent) {
                PhosphorText.triggerInterference(terminalContent, intensity, duration);
            }
        }
    }
    
    /**
     * Execute interference effect (terminal-specific)
     */
    function executeInterferenceEffect(params) {
        const intensity = params.intensity || 0.5;
        const duration = params.duration || 200;
        
        if (typeof PhosphorText !== 'undefined') {
            const terminalContent = document.querySelector('.phosphor-display');
            if (terminalContent) {
                PhosphorText.triggerInterference(terminalContent, intensity, duration);
            }
        }
    }
    
    /**
     * Execute horizontal sync loss effect
     */
    function executeHSyncEffect(params) {
        const duration = params.duration || 300;
        
        if (typeof PhosphorText !== 'undefined') {
            const terminalContent = document.querySelector('.phosphor-display');
            if (terminalContent) {
                PhosphorText.triggerHSync(terminalContent, duration);
            }
        }
    }
    
    /**
     * Execute transition effect (for scene changes)
     */
    function executeTransitionEffect(params) {
        const type = params.type || 'fade';
        const duration = params.duration || 500;
        
        transitioning = true;
        transitionStartTime = performance.now();
        
        // Emit transition start
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(EventBus.Events.EFFECT_TRANSITION, {
                phase: 'start',
                type,
                duration
            });
        }
        
        // Simple fade transition via brightness
        if (typeof CRTShader !== 'undefined') {
            const originalBrightness = CRTShader.config.brightness;
            
            // Fade out
            const fadeOut = (progress) => {
                CRTShader.config.brightness = originalBrightness * (1 - progress);
            };
            
            // Fade in
            const fadeIn = (progress) => {
                CRTShader.config.brightness = originalBrightness * progress;
            };
            
            // Animate fade out
            animateValue(0, 1, duration / 2, fadeOut, () => {
                // Emit midpoint
                if (typeof EventBus !== 'undefined') {
                    EventBus.emit(EventBus.Events.EFFECT_TRANSITION, {
                        phase: 'midpoint',
                        type,
                        duration
                    });
                }
                
                // Animate fade in
                animateValue(0, 1, duration / 2, fadeIn, () => {
                    transitioning = false;
                    
                    // Emit transition end
                    if (typeof EventBus !== 'undefined') {
                        EventBus.emit(EventBus.Events.EFFECT_TRANSITION, {
                            phase: 'end',
                            type,
                            duration
                        });
                    }
                });
            });
        }
    }
    
    /**
     * Animate a value over time
     */
    function animateValue(from, to, duration, onUpdate, onComplete) {
        const startTime = performance.now();
        
        function tick() {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const value = from + (to - from) * progress;
            
            onUpdate(value);
            
            if (progress < 1) {
                requestAnimationFrame(tick);
            } else if (onComplete) {
                onComplete();
            }
        }
        
        requestAnimationFrame(tick);
    }
    
    /**
     * Queue an effect to be executed after current effects complete
     */
    function queueEffect(type, params = {}) {
        effectQueue.push({ type, params });
        processEffectQueue();
    }
    
    /**
     * Process the effect queue
     */
    function processEffectQueue() {
        if (processingEffects || effectQueue.length === 0) return;
        
        processingEffects = true;
        const effect = effectQueue.shift();
        
        // Execute effect with completion callback
        const originalCallback = effect.params.onComplete;
        effect.params.onComplete = () => {
            if (originalCallback) originalCallback();
            processingEffects = false;
            processEffectQueue();
        };
        
        triggerEffect(effect.type, effect.params);
    }
    
    /**
     * Check if a transition is in progress
     * @returns {boolean}
     */
    function isTransitioning() {
        return transitioning;
    }
    
    /**
     * Get the active display element
     * @returns {HTMLElement|null}
     */
    function getActiveDisplay() {
        if (currentMode === Mode.TERMINAL) {
            return document.querySelector('.phosphor-display');
        } else {
            return document.getElementById('scene-canvas');
        }
    }
    
    // Public API
    return {
        Mode,
        init,
        setMode,
        getMode,
        isTerminalMode,
        isSceneViewerMode,
        triggerEffect,
        queueEffect,
        isTransitioning,
        getActiveDisplay
    };
})();
