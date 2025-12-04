/**
 * AnimationManager - THE SINGLE ANIMATION LOOP
 * 
 * This is the ONLY requestAnimationFrame in the application.
 * All animations, rendering, and time-based updates flow through here.
 * 
 * Responsibilities:
 * - Single requestAnimationFrame loop for EVERYTHING
 * - Caret blinking (canvas-based, not DOM)
 * - Typewriter effects
 * - Calls RenderManager.render() each frame
 * - Coordinates all registered update callbacks
 */

const AnimationManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let running = false;
    let lastTime = 0;
    let animationFrameId = null;
    
    // Registered update callbacks: Map<id, { callback, priority }>
    // These are called every frame with (delta, now)
    const callbacks = new Map();
    
    // Caret animation state (unified timing for all carets)
    // NOTE: In the new architecture, carets are drawn to canvas, not DOM elements
    const caretState = {
        phase: 0,           // Current phase in ms
        blinkRate: 530,     // Full cycle duration in ms
        intensity: 1.0      // Current calculated intensity (0.15 - 1.0)
    };
    
    // Typewriter effect queue (for terminal boot sequence, etc.)
    const typewriterState = {
        queue: [],
        active: null
    };
    
    // Performance tracking
    let frameCount = 0;
    let fpsUpdateTime = 0;
    let currentFps = 0;
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Initialize and start the animation loop
     */
    function init() {
        if (running) {
            console.warn('[AnimationManager] Already running');
            return;
        }
        
        running = true;
        lastTime = performance.now();
        fpsUpdateTime = lastTime;
        
        // Start the loop
        tick();
        
        console.log('[AnimationManager] Initialized - SINGLE ANIMATION LOOP ACTIVE');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // THE MAIN LOOP
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Main animation tick - THE ONLY rAF IN THE APP
     */
    function tick() {
        if (!running) return;
        
        const now = performance.now();
        const delta = now - lastTime;
        lastTime = now;
        
        // Update FPS counter
        frameCount++;
        if (now - fpsUpdateTime >= 1000) {
            currentFps = frameCount;
            frameCount = 0;
            fpsUpdateTime = now;
        }
        
        // ─────────────────────────────────────────────────────────────────
        // 1. UPDATE CARET BLINK
        // ─────────────────────────────────────────────────────────────────
        updateCaretPhase(delta);
        
        // ─────────────────────────────────────────────────────────────────
        // 2. PROCESS TYPEWRITER QUEUE
        // ─────────────────────────────────────────────────────────────────
        updateTypewriter(delta, now);
        
        // Run registered callbacks (sorted by priority)
        const sortedCallbacks = [...callbacks.entries()]
            .sort((a, b) => (a[1].priority || 0) - (b[1].priority || 0));
        
        sortedCallbacks.forEach(([id, { callback }]) => {
            try {
                callback(delta, now);
            } catch (error) {
                console.error(`[AnimationManager] Error in callback '${id}':`, error);
            }
        });
        
        // Emit tick event via EventBus if available
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(EventBus.Events.ANIMATION_TICK, { delta, now, fps: currentFps });
        }
        
        animationFrameId = requestAnimationFrame(tick);
    }
    
    /**
     * Update caret blink phase (canvas-based, not DOM)
     * The intensity value is used by TerminalManager when rendering
     */
    function updateCaretPhase(delta) {
        caretState.phase += delta;
        
        const { phase, blinkRate } = caretState;
        const cycle = phase % (blinkRate * 2);
        
        // Calculate intensity: smooth fade between 1.0 and 0.15
        // First half of cycle: fade out (1.0 -> 0.15)
        // Second half: fade in (0.15 -> 1.0)
        let intensity;
        if (cycle < blinkRate) {
            // Fading out
            intensity = 1.0 - (cycle / blinkRate) * 0.85;
        } else {
            // Fading in
            intensity = 0.15 + ((cycle - blinkRate) / blinkRate) * 0.85;
        }
        
        caretState.intensity = intensity;
        
        // Emit caret tick event for any listeners
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(EventBus.Events.ANIMATION_CARET_TICK, { intensity, phase });
        }
    }
    
    /**
     * Process typewriter effect queue
     */
    function updateTypewriter(delta, now) {
        if (!typewriterState.active && typewriterState.queue.length > 0) {
            // Start next item in queue
            typewriterState.active = typewriterState.queue.shift();
            typewriterState.active.lastCharTime = now;
            typewriterState.active.index = 0;
        }
        
        const active = typewriterState.active;
        if (!active) return;
        
        // Calculate time per character with variance
        const baseDelay = 1000 / active.speed; // speed is chars per second
        const variance = active.variance || 0;
        const charDelay = baseDelay + (Math.random() - 0.5) * variance * baseDelay;
        
        if (now - active.lastCharTime >= charDelay) {
            // Type next character
            if (active.index < active.text.length) {
                const char = active.text[active.index];
                
                if (active.element) {
                    // Append character to element
                    if (active.element.textContent !== undefined) {
                        active.element.textContent += char;
                    } else {
                        active.element.innerText += char;
                    }
                }
                
                // Call per-character callback if provided
                if (active.onChar) {
                    active.onChar(char, active.index);
                }
                
                active.index++;
                active.lastCharTime = now;
            } else {
                // Typing complete
                if (active.callback) {
                    active.callback();
                }
                typewriterState.active = null;
            }
        }
    }
    
    /**
     * Register an animation callback
     * @param {string} id - Unique identifier for this callback
     * @param {Function} callback - Function(delta, now) called each frame
     * @param {Object} options - Optional settings
     * @param {number} options.priority - Lower numbers run first (default: 0)
     * @returns {Function} Unregister function
     */
    function register(id, callback, options = {}) {
        if (typeof callback !== 'function') {
            console.error('[AnimationManager] Callback must be a function');
            return () => {};
        }
        
        callbacks.set(id, {
            callback,
            priority: options.priority || 0
        });
        
        return () => unregister(id);
    }
    
    /**
     * Unregister an animation callback
     * @param {string} id - The callback identifier
     */
    function unregister(id) {
        callbacks.delete(id);
    }
    
    /**
     * Queue a typewriter effect
     * @param {Object} options - Typewriter options
     * @param {HTMLElement} options.element - Element to type into
     * @param {string} options.text - Text to type
     * @param {number} options.speed - Characters per second (default: 30)
     * @param {number} options.variance - Random variance 0-1 (default: 0.2)
     * @param {Function} options.callback - Called when complete
     * @param {Function} options.onChar - Called for each character
     * @returns {Object} Control object with cancel() method
     */
    function typewriter(options) {
        const item = {
            element: options.element,
            text: options.text || '',
            speed: options.speed || 30,
            variance: options.variance || 0.2,
            callback: options.callback,
            onChar: options.onChar,
            index: 0,
            lastCharTime: 0,
            cancelled: false
        };
        
        typewriterState.queue.push(item);
        
        return {
            cancel: () => {
                item.cancelled = true;
                const queueIndex = typewriterState.queue.indexOf(item);
                if (queueIndex !== -1) {
                    typewriterState.queue.splice(queueIndex, 1);
                }
                if (typewriterState.active === item) {
                    typewriterState.active = null;
                }
            }
        };
    }
    
    /**
     * Clear all typewriter queue
     */
    function clearTypewriter() {
        typewriterState.queue = [];
        typewriterState.active = null;
    }
    
    /**
     * Set caret blink rate
     * @param {number} rate - Full cycle duration in ms
     */
    function setCaretBlinkRate(rate) {
        caretState.blinkRate = rate;
    }
    
    /**
     * Get current caret intensity (for external sync)
     * @returns {number} Current intensity 0.15-1.0
     */
    function getCaretIntensity() {
        return caretState.intensity;
    }
    
    /**
     * Reset caret phase (e.g., on keypress to show solid caret)
     */
    function resetCaretPhase() {
        caretState.phase = 0;
        caretState.intensity = 1.0;
    }
    
    /**
     * Stop the animation manager
     */
    function stop() {
        running = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        console.log('[AnimationManager] Stopped');
    }
    
    /**
     * Resume the animation manager
     */
    function resume() {
        if (running) return;
        init();
    }
    
    /**
     * Check if running
     * @returns {boolean}
     */
    function isRunning() {
        return running;
    }
    
    /**
     * Get current FPS
     * @returns {number}
     */
    function getFps() {
        return currentFps;
    }
    
    /**
     * Get count of registered callbacks
     * @returns {number}
     */
    function getCallbackCount() {
        return callbacks.size;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        // Lifecycle
        init,
        stop,
        resume,
        isRunning,
        
        // Callback registration (for managers to hook into the loop)
        register,
        unregister,
        
        // Caret timing (canvas-based, not DOM)
        setCaretBlinkRate,
        getCaretIntensity,
        resetCaretPhase,
        
        // Typewriter effect
        typewriter,
        clearTypewriter,
        
        // Stats
        getFps,
        getCallbackCount
    };
})();

console.log('[AnimationManager] Module loaded');
