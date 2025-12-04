/**
 * TransitionManager - Unified CRT power-down/power-up transitions
 * 
 * Handles all visual transitions with a consistent "CRT power down" effect:
 * - Boot sequence → first scene
 * - Scene → Terminal (and back)
 * - Scene → Scene changes
 * 
 * The effect simulates an old CRT monitor powering down (brightness fade,
 * slight pause at black) then powering back up.
 */

const TransitionManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════
    
    const config = {
        // Power-down phase (fade to black)
        powerDownDuration: 2400,    // ms to fade to black (cinematic length)
        powerDownEasing: 'easeIn',  // Accelerating fade (like CRT phosphor decay)
        
        // Black pause (simulates CRT off state)
        blackPauseDuration: 1200,   // ms to hold at black
        
        // Power-up phase (fade from black)
        powerUpDuration: 1800,      // ms to fade back in
        powerUpEasing: 'easeOut',   // Decelerating fade (like CRT warming up)
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let transitioning = false;
    let currentTransition = null;
    
    // ═══════════════════════════════════════════════════════════════════
    // EASING FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    const easings = {
        linear: t => t,
        easeIn: t => t * t,                           // Accelerating
        easeOut: t => 1 - Math.pow(1 - t, 2),         // Decelerating
        easeInOut: t => t < 0.5 
            ? 2 * t * t 
            : 1 - Math.pow(-2 * t + 2, 2) / 2,
        // CRT-specific: fast initial decay, slow tail
        crtDecay: t => 1 - Math.pow(1 - t, 3),
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // CORE TRANSITION API
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Execute a full power-down → action → power-up transition
     * 
     * @param {Object} options
     * @param {Function} options.onMidpoint - Called at black (switch content here)
     * @param {Function} options.onComplete - Called when transition finishes
     * @param {number} options.powerDownDuration - Override default
     * @param {number} options.blackPauseDuration - Override default
     * @param {number} options.powerUpDuration - Override default
     * @returns {Promise} Resolves when transition completes
     */
    function transition(options = {}) {
        return new Promise((resolve, reject) => {
            if (transitioning) {
                console.warn('[TransitionManager] Transition already in progress');
                reject(new Error('Transition in progress'));
                return;
            }
            
            transitioning = true;
            
            const powerDownMs = options.powerDownDuration ?? config.powerDownDuration;
            const blackPauseMs = options.blackPauseDuration ?? config.blackPauseDuration;
            const powerUpMs = options.powerUpDuration ?? config.powerUpDuration;
            
            // Store original brightness
            const originalBrightness = CRTShader?.config?.brightness ?? 1.0;
            
            if (!CRTShader?.config) {
                // No shader available - just call midpoint and complete
                console.warn('[TransitionManager] CRTShader not available');
                if (options.onMidpoint) options.onMidpoint();
                if (options.onComplete) options.onComplete();
                transitioning = false;
                resolve();
                return;
            }
            
            // Emit transition start event
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('transition:start', { phase: 'power_down' });
            }
            
            // Phase 1: Power down (fade to black)
            const powerDownStart = performance.now();
            
            const animatePowerDown = (now) => {
                const elapsed = now - powerDownStart;
                const t = Math.min(1, elapsed / powerDownMs);
                const eased = easings.easeIn(t);
                
                CRTShader.config.brightness = originalBrightness * (1 - eased);
                
                if (t < 1) {
                    currentTransition = requestAnimationFrame(animatePowerDown);
                } else {
                    // Fully black
                    CRTShader.config.brightness = 0;
                    
                    // Emit midpoint event
                    if (typeof EventBus !== 'undefined') {
                        EventBus.emit('transition:midpoint', { phase: 'black' });
                    }
                    
                    // Call midpoint callback (switch content here)
                    if (options.onMidpoint) {
                        try {
                            options.onMidpoint();
                        } catch (err) {
                            console.error('[TransitionManager] Midpoint callback error:', err);
                        }
                    }
                    
                    // Phase 2: Black pause
                    setTimeout(() => {
                        // Phase 3: Power up (fade from black)
                        if (typeof EventBus !== 'undefined') {
                            EventBus.emit('transition:start', { phase: 'power_up' });
                        }
                        
                        const powerUpStart = performance.now();
                        
                        const animatePowerUp = (now) => {
                            const elapsed = now - powerUpStart;
                            const t = Math.min(1, elapsed / powerUpMs);
                            const eased = easings.easeOut(t);
                            
                            CRTShader.config.brightness = originalBrightness * eased;
                            
                            if (t < 1) {
                                currentTransition = requestAnimationFrame(animatePowerUp);
                            } else {
                                // Fully restored
                                CRTShader.config.brightness = originalBrightness;
                                transitioning = false;
                                currentTransition = null;
                                
                                // Emit complete event
                                if (typeof EventBus !== 'undefined') {
                                    EventBus.emit('transition:complete', {});
                                }
                                
                                if (options.onComplete) options.onComplete();
                                resolve();
                            }
                        };
                        
                        currentTransition = requestAnimationFrame(animatePowerUp);
                    }, blackPauseMs);
                }
            };
            
            currentTransition = requestAnimationFrame(animatePowerDown);
        });
    }
    
    /**
     * Power down only (fade to black, stay black)
     * Used when you want to manually control the power-up later
     * 
     * @param {Object} options
     * @returns {Promise} Resolves when fully black
     */
    function powerDown(options = {}) {
        return new Promise((resolve) => {
            if (transitioning) {
                console.warn('[TransitionManager] Transition already in progress');
                resolve();
                return;
            }
            
            transitioning = true;
            
            const duration = options.duration ?? config.powerDownDuration;
            const originalBrightness = CRTShader?.config?.brightness ?? 1.0;
            
            if (!CRTShader?.config) {
                transitioning = false;
                resolve();
                return;
            }
            
            const startTime = performance.now();
            
            const animate = (now) => {
                const elapsed = now - startTime;
                const t = Math.min(1, elapsed / duration);
                const eased = easings.easeIn(t);
                
                CRTShader.config.brightness = originalBrightness * (1 - eased);
                
                if (t < 1) {
                    currentTransition = requestAnimationFrame(animate);
                } else {
                    CRTShader.config.brightness = 0;
                    // Note: transitioning stays true until powerUp is called
                    currentTransition = null;
                    resolve();
                }
            };
            
            currentTransition = requestAnimationFrame(animate);
        });
    }
    
    /**
     * Power up only (fade from black to normal)
     * Used after powerDown() or when starting from black
     * 
     * @param {Object} options
     * @param {number} options.targetBrightness - Target brightness (default: 1.0)
     * @returns {Promise} Resolves when fully lit
     */
    function powerUp(options = {}) {
        return new Promise((resolve) => {
            const duration = options.duration ?? config.powerUpDuration;
            const targetBrightness = options.targetBrightness ?? 1.0;
            
            if (!CRTShader?.config) {
                transitioning = false;
                resolve();
                return;
            }
            
            const startBrightness = CRTShader.config.brightness;
            const startTime = performance.now();
            
            const animate = (now) => {
                const elapsed = now - startTime;
                const t = Math.min(1, elapsed / duration);
                const eased = easings.easeOut(t);
                
                CRTShader.config.brightness = startBrightness + (targetBrightness - startBrightness) * eased;
                
                if (t < 1) {
                    currentTransition = requestAnimationFrame(animate);
                } else {
                    CRTShader.config.brightness = targetBrightness;
                    transitioning = false;
                    currentTransition = null;
                    resolve();
                }
            };
            
            currentTransition = requestAnimationFrame(animate);
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // CONVENIENCE METHODS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Transition to terminal mode
     * Powers down, switches to terminal, powers up
     */
    function toTerminal(options = {}) {
        return transition({
            ...options,
            onMidpoint: () => {
                // Show terminal
                if (typeof TerminalManager !== 'undefined') {
                    if (!TerminalManager.isBootComplete()) {
                        TerminalManager.runBootSequence();
                    } else {
                        TerminalManager.show();
                    }
                }
                
                // Update input mode
                if (typeof InputManager !== 'undefined') {
                    InputManager.setMode(InputManager.Mode.TERMINAL);
                }
                
                // Deactivate chat input
                if (typeof ChatManager !== 'undefined' && typeof ChatManager.setInputActive === 'function') {
                    ChatManager.setInputActive(false);
                }
                
                // Broadcast view change
                if (typeof SyncManager !== 'undefined') {
                    SyncManager.broadcastViewChange(SyncManager.ViewMode.TERMINAL);
                }
                
                // Call user's midpoint callback
                if (options.onMidpoint) options.onMidpoint();
            }
        });
    }
    
    /**
     * Transition from terminal back to scene viewer
     * Powers down, hides terminal, powers up
     */
    function toSceneViewer(options = {}) {
        return transition({
            ...options,
            onMidpoint: () => {
                // Hide terminal
                if (typeof TerminalManager !== 'undefined') {
                    TerminalManager.hide();
                }
                
                // Update input mode
                if (typeof InputManager !== 'undefined') {
                    InputManager.setMode(InputManager.Mode.SCENE_VIEWER);
                }
                
                // Reactivate chat input
                if (typeof ChatManager !== 'undefined' && typeof ChatManager.setInputActive === 'function') {
                    ChatManager.setInputActive(true);
                }
                
                // Broadcast view change
                if (typeof SyncManager !== 'undefined') {
                    SyncManager.broadcastViewChange(SyncManager.ViewMode.SCENE_VIEWER);
                }
                
                // Call user's midpoint callback
                if (options.onMidpoint) options.onMidpoint();
            }
        });
    }
    
    /**
     * Transition between scenes
     * Powers down, loads new scene, powers up
     * 
     * @param {string} imageUrl - URL of the new scene image
     * @param {Object} options
     */
    function toScene(imageUrl, options = {}) {
        return transition({
            ...options,
            onMidpoint: () => {
                // Load new scene image
                if (typeof ThreeSetup !== 'undefined' && imageUrl) {
                    ThreeSetup.loadSceneImage(imageUrl);
                }
                
                // Call user's midpoint callback
                if (options.onMidpoint) options.onMidpoint();
            }
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Cancel any in-progress transition
     */
    function cancel() {
        if (currentTransition) {
            cancelAnimationFrame(currentTransition);
            currentTransition = null;
        }
        transitioning = false;
        
        // Restore brightness to default
        if (CRTShader?.config) {
            CRTShader.config.brightness = 1.0;
        }
    }
    
    /**
     * Check if a transition is in progress
     */
    function isTransitioning() {
        return transitioning;
    }
    
    /**
     * Update configuration
     */
    function setConfig(newConfig) {
        Object.assign(config, newConfig);
    }
    
    /**
     * Get current configuration
     */
    function getConfig() {
        return { ...config };
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        // Core API
        transition,
        powerDown,
        powerUp,
        
        // Convenience methods
        toTerminal,
        toSceneViewer,
        toScene,
        
        // Utility
        cancel,
        isTransitioning,
        setConfig,
        getConfig
    };
    
})();

console.log('[TransitionManager] Module loaded');
