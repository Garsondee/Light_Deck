/**
 * OnboardingScreenManager - Manages onboarding screens in the CRT Main Display
 * 
 * Renders onboarding screens to the EXISTING scene plane (CRT Main Display)
 * on the left side of the viewport, NOT as a separate overlay.
 * 
 * Handles:
 * - Screen transitions (fade in/out)
 * - Mouse/keyboard input routing to active screen
 * - Coordination between screens
 * - Terminal command passthrough
 * 
 * Uses the same rendering approach as TerminalManager - renders to a canvas
 * that gets displayed on the scene plane via CRT shader.
 */

const OnboardingScreenManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let initialized = false;
    let visible = false;
    let dirty = true;
    
    // Canvas for rendering (shared with scene plane via texture)
    let canvas = null;
    let ctx = null;
    let texture = null;
    
    // Reference to scene plane (from ThreeSetup)
    let scenePlane = null;
    let originalTexture = null;  // Store original scene texture to restore
    let originalAsciiMode = true;  // Store original ASCII mode to restore
    
    // CRT config management - onboarding can have its own CRT settings
    let crtSnapshot = null;      // Full CRTShader.config before onboarding started
    let crtOverrides = {
        // Hard-coded onboarding CRT preset (tuned for readability & accurate hitboxes)
        // Values captured from Settings UI "CRT Overrides" and baked in here
        brightness: 0.94,
        contrast: 1.11,
        scanlineIntensity: 0.01,
        noiseIntensity: 0.0,
        vignetteStrength: 0.50,
        shimmerIntensity: 0.25,
        unrealBloomEnabled: true,
        unrealBloomStrength: 0.40,
        unrealBloomRadius: 1.0,
        chromaticAberration: 0.002,
        // For onboarding, prioritize input accuracy over curvature style.
        barrelDistortion: 0.0,
        barrelZoom: 1.0,
        phosphorMaskIntensity: 0.10,
        glitchAmount: 0.0
    };     // Onboarding-specific CRT overrides preset
    
    // Screen management
    let currentScreen = null;
    let screens = new Map();
    let transitionState = {
        active: false,
        type: null,  // 'fade_in', 'fade_out', 'crossfade'
        progress: 0,
        duration: 500,
        fromScreen: null,
        toScreen: null,
        onComplete: null
    };
    
    // Layout - matches the CRT Main Display dimensions
    const layout = {
        width: 1024,
        height: 768,
        padding: 30
    };
    
    // Opacity for fade effects
    let opacity = 0;
    let targetOpacity = 0;
    
    // Terminal log area at bottom
    const terminalLog = {
        lines: [],
        maxLines: 4,
        y: 0  // Calculated on init
    };
    
    // No custom shaders needed - we use the existing CRT shader from ThreeSetup
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Initialize the onboarding screen manager
     * @param {THREE.Scene} scene - Three.js scene (not used, we use ThreeSetup's scene plane)
     * @param {Object} options - Configuration options
     */
    function init(scene, options = {}) {
        if (initialized) {
            console.warn('[OnboardingScreenManager] Already initialized');
            return;
        }
        
        Object.assign(layout, options);
        
        // Create canvas for rendering onboarding content
        canvas = document.createElement('canvas');
        canvas.width = layout.width;
        canvas.height = layout.height;
        ctx = canvas.getContext('2d');
        
        // Calculate terminal log position
        terminalLog.y = layout.height - layout.padding - (terminalLog.maxLines * 20);
        
        // Create Three.js texture from our canvas
        texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        // Get reference to scene plane from ThreeSetup
        if (typeof ThreeSetup !== 'undefined') {
            scenePlane = ThreeSetup.getScenePlane();
        }
        
        // Set up input handlers
        setupInputHandlers();
        
        initialized = true;
        console.log('[OnboardingScreenManager] Initialized (renders to CRT Main Display)');
    }
    
    /**
     * Set up mouse and keyboard input handlers
     */
    function setupInputHandlers() {
        // Mouse events on the CRT viewport container. We intentionally bind to
        // the outer viewport instead of the raw <canvas> so that clicks on the
        // glare/overlay elements still route through our handler. Coordinate
        // mapping will always use the viewport bounds, not the event target.
        const viewport = document.getElementById('viewport');
        if (viewport) {
            viewport.addEventListener('click', handleClick);
            viewport.addEventListener('mousemove', handleMouseMove);
        }
        
        // Keyboard events (will be routed through InputManager in practice)
        document.addEventListener('keydown', handleKeyDown);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SCREEN MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Register a screen
     * @param {string} name - Screen identifier
     * @param {Object} screen - Screen instance with lifecycle methods
     */
    function registerScreen(name, screen) {
        screens.set(name, screen);
        console.log(`[OnboardingScreenManager] Registered screen: ${name}`);
    }
    
    /**
     * Show the onboarding overlay with a specific screen
     * @param {string} screenName - Name of screen to show
     * @param {Object} options - Transition options
     */
    function show(screenName, options = {}) {
        if (!initialized) {
            console.error('[OnboardingScreenManager] Not initialized');
            return;
        }
        
        const screen = screens.get(screenName);
        if (!screen) {
            console.error(`[OnboardingScreenManager] Unknown screen: ${screenName}`);
            return;
        }
        
        visible = true;
        
        // Store original texture and switch to our onboarding texture
        if (scenePlane && scenePlane.material && scenePlane.material.uniforms) {
            originalTexture = scenePlane.material.uniforms.sceneTexture.value;
            scenePlane.material.uniforms.sceneTexture.value = texture;
            
            // Snapshot and apply CRT config for onboarding
            if (typeof CRTShader !== 'undefined' && CRTShader.config) {
                const cfg = CRTShader.config;
                
                // Snapshot full config (only once per show)
                if (!crtSnapshot) {
                    crtSnapshot = JSON.parse(JSON.stringify(cfg));
                }
                originalAsciiMode = cfg.asciiMode;
                
                // Always disable ASCII mode for onboarding
                cfg.asciiMode = false;
                
                // Apply any onboarding-specific overrides from Tweakpane
                if (crtOverrides) {
                    Object.assign(cfg, crtOverrides);
                }
            }
        }
        
        // Start fade in transition
        startTransition('fade_in', {
            toScreen: screen,
            duration: options.duration || 500,
            onComplete: () => {
                currentScreen = screen;
                if (screen.enter) {
                    screen.enter();
                }
                if (options.onComplete) {
                    options.onComplete();
                }
            }
        });
        
        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:screen_show', { screen: screenName });
        }
    }
    
    /**
     * Transition to a different screen
     * @param {string} screenName - Name of screen to transition to
     * @param {Object} options - Transition options
     */
    function transitionTo(screenName, options = {}) {
        const screen = screens.get(screenName);
        if (!screen) {
            console.error(`[OnboardingScreenManager] Unknown screen: ${screenName}`);
            return;
        }
        
        if (currentScreen === screen) return;
        
        // End any active glitch effect to prevent it persisting into the next screen
        if (typeof GlitchEffects !== 'undefined' && GlitchEffects.isActive()) {
            GlitchEffects.endEffect();
        }
        
        // Exit current screen
        if (currentScreen && currentScreen.exit) {
            currentScreen.exit();
        }
        
        // Crossfade or instant transition
        if (options.instant) {
            currentScreen = screen;
            if (screen.enter) {
                screen.enter();
            }
            dirty = true;
        } else {
            startTransition('crossfade', {
                fromScreen: currentScreen,
                toScreen: screen,
                duration: options.duration || 300,
                onComplete: () => {
                    currentScreen = screen;
                    if (screen.enter) {
                        screen.enter();
                    }
                    if (options.onComplete) {
                        options.onComplete();
                    }
                }
            });
        }
        
        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:screen_change', { screen: screenName });
        }
    }
    
    /**
     * Hide the onboarding overlay
     * @param {Object} options - Transition options
     */
    function hide(options = {}) {
        if (!visible) return;
        
        // End any active glitch effect to prevent it persisting after onboarding
        if (typeof GlitchEffects !== 'undefined' && GlitchEffects.isActive()) {
            GlitchEffects.endEffect();
        }
        
        // Exit current screen
        if (currentScreen && currentScreen.exit) {
            currentScreen.exit();
        }
        
        // Start fade out transition
        startTransition('fade_out', {
            duration: options.duration || 500,
            onComplete: () => {
                visible = false;
                currentScreen = null;
                
                // Restore original scene texture
                if (scenePlane && scenePlane.material && scenePlane.material.uniforms && originalTexture) {
                    scenePlane.material.uniforms.sceneTexture.value = originalTexture;
                    originalTexture = null;
                }
                
                // Restore full CRT config from snapshot
                if (typeof CRTShader !== 'undefined' && CRTShader.config && crtSnapshot) {
                    Object.assign(CRTShader.config, crtSnapshot);
                    crtSnapshot = null;
                    console.log('[OnboardingScreenManager] CRT config restored');
                } else if (typeof CRTShader !== 'undefined' && CRTShader.config) {
                    // Fallback: just restore ASCII mode
                    CRTShader.config.asciiMode = originalAsciiMode;
                }
                
                if (options.onComplete) {
                    options.onComplete();
                }
                
                // Emit event
                if (typeof EventBus !== 'undefined') {
                    EventBus.emit('onboarding:hidden');
                }
            }
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════
    
    function startTransition(type, options) {
        transitionState = {
            active: true,
            type,
            progress: 0,
            duration: options.duration || 500,
            fromScreen: options.fromScreen || null,
            toScreen: options.toScreen || null,
            onComplete: options.onComplete || null,
            startTime: performance.now()
        };
        
        // Set initial opacity based on transition type
        if (type === 'fade_in') {
            opacity = 0;
            targetOpacity = 1;
        } else if (type === 'fade_out') {
            targetOpacity = 0;
        }
    }
    
    function updateTransition(dt) {
        if (!transitionState.active) return;
        
        const elapsed = performance.now() - transitionState.startTime;
        transitionState.progress = Math.min(1, elapsed / transitionState.duration);
        
        // Ease function (ease-out cubic)
        const eased = 1 - Math.pow(1 - transitionState.progress, 3);
        
        switch (transitionState.type) {
            case 'fade_in':
                opacity = eased;
                break;
            case 'fade_out':
                opacity = 1 - eased;
                break;
            case 'crossfade':
                opacity = 1;  // Keep full opacity during crossfade
                // The actual crossfade is handled in render
                break;
        }
        
        // Opacity is handled by rendering to canvas, not shader uniform
        
        dirty = true;
        
        // Check if complete
        if (transitionState.progress >= 1) {
            const onComplete = transitionState.onComplete;
            transitionState.active = false;
            
            if (onComplete) {
                onComplete();
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Update and render the current screen
     * @param {number} dt - Delta time in seconds
     */
    function update(dt) {
        if (!initialized || !visible) return;
        
        // Update transition
        updateTransition(dt);
        
        // Update current screen
        if (currentScreen && currentScreen.update) {
            currentScreen.update(dt);
        }
        
        // Render if dirty
        if (dirty || (currentScreen && currentScreen.needsRender && currentScreen.needsRender())) {
            render();
            dirty = false;
        }
    }
    
    /**
     * Render the current screen to the canvas
     */
    function render() {
        if (!ctx) return;
        
        // Clear canvas
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, layout.width, layout.height);
        
        // During crossfade, render both screens with appropriate alpha
        if (transitionState.active && transitionState.type === 'crossfade') {
            const alpha = transitionState.progress;
            
            // Render old screen (fading out)
            if (transitionState.fromScreen && transitionState.fromScreen.render) {
                ctx.globalAlpha = 1 - alpha;
                transitionState.fromScreen.render(ctx, layout);
            }
            
            // Render new screen (fading in)
            if (transitionState.toScreen && transitionState.toScreen.render) {
                ctx.globalAlpha = alpha;
                transitionState.toScreen.render(ctx, layout);
            }
            
            ctx.globalAlpha = 1;
        } else {
            // Normal render
            if (currentScreen && currentScreen.render) {
                currentScreen.render(ctx, layout);
            }
        }
        
        // Update texture
        if (texture) {
            texture.needsUpdate = true;
        }
    }
    
    /**
     * Render the terminal log area at the bottom
     */
    function renderTerminalLog() {
        if (terminalLog.lines.length === 0) return;
        
        ctx.font = '14px "IBM Plex Mono", monospace';
        ctx.textBaseline = 'top';
        
        // Draw separator
        ctx.fillStyle = '#885500';
        ctx.fillText('─'.repeat(80), layout.padding, terminalLog.y - 10);
        
        // Draw log lines
        terminalLog.lines.forEach((line, i) => {
            const y = terminalLog.y + i * 18;
            ctx.fillStyle = line.color || '#ffaa00';
            ctx.fillText(line.text, layout.padding, y);
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // INPUT HANDLING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Convert viewport coordinates to CRT Main Display canvas coordinates
     * The CRT display is on the left side of the viewport
     */
    function viewportToCanvas(clientX, clientY, targetRect) {
        const viewportWidth = targetRect.width;
        const viewportHeight = targetRect.height;
        
        // Default approximation: CRT on left 66% of viewport, full height
        let crtLeft = 0;
        let crtWidth = viewportWidth * 0.66;
        let crtTop = 0;
        let crtHeight = viewportHeight;
        
        // When LayoutManager is available, compute exact projected rect of
        // the main display within the camera frustum so hitboxes line up
        // with the actual CRT plane.
        if (typeof LayoutManager !== 'undefined' && LayoutManager.isInitialized()) {
            const mainRect = LayoutManager.getMainDisplayRect();
            const chatRect = LayoutManager.getChatPanelRect();
            const frustum = LayoutManager.getFrustum();
            if (mainRect && chatRect && frustum && frustum.width && frustum.height) {
                const totalWidth = mainRect.width + chatRect.slotWidth;
                const widthRatio = mainRect.width / totalWidth;
                
                // World-space left/right of main display
                const mainLeftWorld = mainRect.x - mainRect.width / 2;
                const mainRightWorld = mainRect.x + mainRect.width / 2;
                const mainTopWorld = mainRect.y + mainRect.height / 2;
                const mainBottomWorld = mainRect.y - mainRect.height / 2;
                
                // Map world-space bounds into viewport pixels using the
                // orthographic frustum. Top of frustum → y = 0, bottom → h.
                crtLeft = ((mainLeftWorld - frustum.left) / frustum.width) * viewportWidth;
                const crtRight = ((mainRightWorld - frustum.left) / frustum.width) * viewportWidth;
                crtWidth = crtRight - crtLeft;
                
                crtTop = ((frustum.top - mainTopWorld) / frustum.height) * viewportHeight;
                const crtBottom = ((frustum.top - mainBottomWorld) / frustum.height) * viewportHeight;
                crtHeight = crtBottom - crtTop;
                
                // Safety: if anything went NaN/zero, fall back to widthRatio
                if (!isFinite(crtLeft) || !isFinite(crtWidth) || crtWidth <= 0 ||
                    !isFinite(crtTop) || !isFinite(crtHeight) || crtHeight <= 0) {
                    crtLeft = 0;
                    crtWidth = viewportWidth * widthRatio;
                    crtTop = 0;
                    crtHeight = viewportHeight;
                }
            }
        }
        
        // Check if click is within CRT bounds
        if (clientX < crtLeft || clientX > crtLeft + crtWidth ||
            clientY < crtTop || clientY > crtTop + crtHeight) {
            return { x: 0, y: 0, inBounds: false };
        }
        
        // Map to canvas coordinates (1024x768 internal resolution)
        const x = ((clientX - crtLeft) / crtWidth) * layout.width;
        const y = ((clientY - crtTop) / crtHeight) * layout.height;
        
        return { x, y, inBounds: true };
    }
    
    /**
     * Handle click events
     */
    function handleClick(event) {
        if (!visible || !currentScreen) return;
        
        // Always use the viewport bounds for coordinate mapping so clicks on
        // overlay elements (glare, CRT effect divs) still map correctly.
        const viewport = document.getElementById('viewport') || event.currentTarget;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        const clientX = event.clientX - rect.left;
        const clientY = event.clientY - rect.top;
        
        const coords = viewportToCanvas(clientX, clientY, rect);
        if (!coords.inBounds) return;
        
        // Pass to current screen
        if (currentScreen.handleClick) {
            const handled = currentScreen.handleClick(coords.x, coords.y);
            if (handled) {
                dirty = true;
            }
        }
    }
    
    /**
     * Handle mouse move events
     */
    function handleMouseMove(event) {
        if (!visible || !currentScreen) return;
        
        const viewport = document.getElementById('viewport') || event.currentTarget;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        const clientX = event.clientX - rect.left;
        const clientY = event.clientY - rect.top;
        
        const coords = viewportToCanvas(clientX, clientY, rect);
        if (!coords.inBounds) {
            viewport.style.cursor = 'default';
            return;
        }
        
        // Pass to current screen
        if (currentScreen.handleMouseMove) {
            const cursor = currentScreen.handleMouseMove(coords.x, coords.y);
            if (cursor) {
                viewport.style.cursor = cursor;
                dirty = true;
            }
        }
    }
    
    /**
     * Handle keyboard events
     */
    function handleKeyDown(event) {
        if (!visible || !currentScreen) return;
        
        // Pass to current screen
        if (currentScreen.handleKeyDown) {
            const handled = currentScreen.handleKeyDown(event);
            if (handled) {
                event.preventDefault();
                dirty = true;
            }
        }
    }
    
    /**
     * Handle terminal command (passthrough from OnboardingManager)
     * @param {string} cmd - Command name
     * @param {Array} args - Command arguments
     * @returns {boolean} True if command was handled
     */
    function handleCommand(cmd, args) {
        if (!visible || !currentScreen) return false;
        
        if (currentScreen.handleCommand) {
            const handled = currentScreen.handleCommand(cmd, args);
            if (handled) {
                dirty = true;
            }
            return handled;
        }
        
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // TERMINAL LOG (LEGACY - DISABLED)
    // ═══════════════════════════════════════════════════════════════════
    
    // Onboarding now surfaces all feedback through the chat panel on the
    // right-hand side, so the old bottom-of-screen ECHO log is disabled.
    // These functions are kept as no-ops for backwards compatibility.
    function addLogLine(text, type = 'output') {
        // No-op: legacy ECHO system removed.
    }
    
    function clearLog() {
        // No-op: legacy ECHO system removed.
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Mark the display as needing a re-render
     */
    function markDirty() {
        dirty = true;
    }
    
    /**
     * Get the current screen name
     */
    function getCurrentScreenName() {
        for (const [name, screen] of screens) {
            if (screen === currentScreen) {
                return name;
            }
        }
        return null;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // CRT CONFIG MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Set onboarding-specific CRT overrides
     * These are applied when onboarding is visible
     * @param {Object} overrides - CRT config properties to override
     */
    function setCRTConfig(overrides) {
        // Store a shallow copy so Tweakpane object mutation doesn't leak weird refs
        crtOverrides = overrides ? { ...overrides } : null;
        
        // If onboarding is currently visible, apply immediately
        if (visible && typeof CRTShader !== 'undefined' && CRTShader.config) {
            const cfg = CRTShader.config;
            
            // If we have a snapshot, reset to it first, then apply overrides
            if (crtSnapshot) {
                Object.assign(cfg, crtSnapshot);
            }
            
            // Always keep ASCII mode off for onboarding
            cfg.asciiMode = false;
            
            // Apply the overrides
            if (crtOverrides) {
                Object.assign(cfg, crtOverrides);
            }
            
            dirty = true;
            console.log('[OnboardingScreenManager] CRT config updated:', crtOverrides);
        }
    }
    
    /**
     * Get current onboarding CRT config (overrides or defaults from global config)
     * @returns {Object} Current CRT config for onboarding
     */
    function getCRTConfig() {
        if (crtOverrides) {
            return { ...crtOverrides };
        }
        
        // Return sensible defaults from global CRT config
        if (typeof CRTShader !== 'undefined' && CRTShader.config) {
            const c = CRTShader.config;
            return {
                brightness: c.brightness,
                contrast: c.contrast,
                scanlineIntensity: c.scanlineIntensity,
                noiseIntensity: c.noiseIntensity,
                vignetteStrength: c.vignetteStrength,
                shimmerIntensity: c.shimmerIntensity,
                unrealBloomEnabled: c.unrealBloomEnabled,
                unrealBloomStrength: c.unrealBloomStrength,
                unrealBloomRadius: c.unrealBloomRadius,
                chromaticAberration: c.chromaticAberration,
                barrelDistortion: c.barrelDistortion,
                barrelZoom: c.barrelZoom,
                phosphorMaskIntensity: c.phosphorMaskIntensity,
                glitchAmount: c.glitchAmount
            };
        }
        
        return null;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        init,
        
        // Screen management
        registerScreen,
        show,
        hide,
        transitionTo,
        
        // Rendering
        update,
        render,
        markDirty,
        
        // Input
        handleCommand,
        
        // Terminal log
        addLogLine,
        clearLog,
        
        // State
        isVisible: () => visible,
        isInitialized: () => initialized,
        getCurrentScreen: () => currentScreen,
        getCurrentScreenName,
        
        // Layout access
        getLayout: () => ({ ...layout }),
        
        // CRT config management
        setCRTConfig,
        getCRTConfig
    };
    
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OnboardingScreenManager;
}
