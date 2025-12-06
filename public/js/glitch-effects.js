/**
 * GlitchEffects - Dramatic CRT malfunction effects
 * 
 * Provides rare, dramatic visual effects that simulate:
 * - Power loss (screen goes black, stutters back on)
 * - Signal loss (banded "Signal Lost" screen, reconnecting graphic)
 * - VHS corruption (color bleeding, dropout, tracking errors)
 */

const GlitchEffects = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let activeEffect = null;           // Current running effect
    let effectStartTime = 0;           // When current effect started
    let effectDuration = 0;            // How long current effect lasts
    let effectPhase = 0;               // Current phase within effect
    let nextEffectTime = 0;            // When next random effect can trigger
    
    // Overlay canvas for "Signal Lost" / "Reconnecting" graphics
    let overlayCanvas = null;
    let overlayTexture = null;
    let overlayPlane = null;
    let overlayScene = null;
    
    // Store original config values to restore after effects
    let originalConfig = null;
    
    // VHS effect state
    let vhsState = {
        colorShift: { r: 0, g: 0, b: 0 },
        trackingOffset: 0,
        dropoutLines: [],
        noiseIntensity: 0
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // EFFECT DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════
    
    const EFFECTS = {
        POWER_LOSS: 'power_loss',
        SIGNAL_LOSS: 'signal_loss',
        VHS_TRACKING: 'vhs_tracking',
        VHS_COLOR_BLEED: 'vhs_color_bleed',
        VHS_DROPOUT: 'vhs_dropout',
        VHS_HEAD_SWITCH: 'vhs_head_switch'
    };
    
    // Effect weights for random selection (lower = rarer)
    const EFFECT_WEIGHTS = {
        [EFFECTS.POWER_LOSS]: 1,        // Very rare
        [EFFECTS.SIGNAL_LOSS]: 1,       // Very rare
        [EFFECTS.VHS_TRACKING]: 3,      // Uncommon
        [EFFECTS.VHS_COLOR_BLEED]: 4,   // More common
        [EFFECTS.VHS_DROPOUT]: 3,       // Uncommon
        [EFFECTS.VHS_HEAD_SWITCH]: 2    // Rare
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // ASCII ART GRAPHICS
    // ═══════════════════════════════════════════════════════════════════
    
    const SIGNAL_LOST_ASCII = [
        '╔════════════════════════════════════════╗',
        '║                                        ║',
        '║     ███████╗██╗ ██████╗ ███╗   ██╗    ║',
        '║     ██╔════╝██║██╔════╝ ████╗  ██║    ║',
        '║     ███████╗██║██║  ███╗██╔██╗ ██║    ║',
        '║     ╚════██║██║██║   ██║██║╚██╗██║    ║',
        '║     ███████║██║╚██████╔╝██║ ╚████║    ║',
        '║     ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝    ║',
        '║                                        ║',
        '║     ██╗      ██████╗ ███████╗████████╗║',
        '║     ██║     ██╔═══██╗██╔════╝╚══██╔══╝║',
        '║     ██║     ██║   ██║███████╗   ██║   ║',
        '║     ██║     ██║   ██║╚════██║   ██║   ║',
        '║     ███████╗╚██████╔╝███████║   ██║   ║',
        '║     ╚══════╝ ╚═════╝ ╚══════╝   ╚═╝   ║',
        '║                                        ║',
        '╚════════════════════════════════════════╝'
    ];
    
    const RECONNECTING_ASCII = [
        '┌──────────────────────────────────────┐',
        '│                                      │',
        '│         R E C O N N E C T I N G     │',
        '│                                      │',
        '│              ◐ ◓ ◑ ◒                │',
        '│                                      │',
        '│         Please stand by...          │',
        '│                                      │',
        '└──────────────────────────────────────┘'
    ];
    
    const NO_SIGNAL_BARS = [
        '▓▓▓▓▓▓▓▓░░░░░░░░▓▓▓▓▓▓▓▓░░░░░░░░▓▓▓▓▓▓▓▓',
        '░░░░░░░░▓▓▓▓▓▓▓▓░░░░░░░░▓▓▓▓▓▓▓▓░░░░░░░░',
        '▓▓▓▓▓▓▓▓░░░░░░░░▓▓▓▓▓▓▓▓░░░░░░░░▓▓▓▓▓▓▓▓',
        '░░░░░░░░▓▓▓▓▓▓▓▓░░░░░░░░▓▓▓▓▓▓▓▓░░░░░░░░'
    ];
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    function init() {
        // Create overlay canvas for text graphics
        overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = 640;
        overlayCanvas.height = 480;
        
        // Schedule first possible effect 30-90 seconds from now
        nextEffectTime = performance.now() + 30000 + Math.random() * 60000;
        
        console.log('[GlitchEffects] Initialized');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // OVERLAY RENDERING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Render ASCII art to the overlay canvas
     */
    function renderOverlayGraphic(lines, options = {}) {
        const ctx = overlayCanvas.getContext('2d');
        const width = overlayCanvas.width;
        const height = overlayCanvas.height;
        
        const {
            backgroundColor = '#000000',
            textColor = '#00ff00',
            fontSize = 14,
            scanlines = true,
            noise = 0,
            bands = false,
            bandColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
        } = options;
        
        // Clear with background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        // Draw color bands if enabled (for signal loss)
        if (bands) {
            const bandHeight = height / bandColors.length;
            bandColors.forEach((color, i) => {
                ctx.fillStyle = color;
                ctx.fillRect(0, i * bandHeight, width, bandHeight);
            });
        }
        
        // Draw ASCII text
        ctx.font = `${fontSize}px "Courier New", monospace`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const lineHeight = fontSize * 1.2;
        const startY = (height - lines.length * lineHeight) / 2;
        
        lines.forEach((line, i) => {
            ctx.fillText(line, width / 2, startY + i * lineHeight);
        });
        
        // Add scanlines
        if (scanlines) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            for (let y = 0; y < height; y += 2) {
                ctx.fillRect(0, y, width, 1);
            }
        }
        
        // Add noise
        if (noise > 0) {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const n = (Math.random() - 0.5) * noise * 255;
                data[i] += n;
                data[i + 1] += n;
                data[i + 2] += n;
            }
            ctx.putImageData(imageData, 0, 0);
        }
        
        return overlayCanvas;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // POWER LOSS EFFECT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Power loss sequence:
     * Phase 0: Instant blackout (0-200ms)
     * Phase 1: Brief flicker attempt (200-400ms)
     * Phase 2: Black again (400-800ms)
     * Phase 3: Stuttering power-up with scan lines (800-1500ms)
     * Phase 4: Full brightness restore (1500-2000ms)
     */
    function updatePowerLoss(elapsed, config) {
        const totalDuration = 2000;
        const progress = elapsed / totalDuration;
        
        if (progress >= 1) {
            return true; // Effect complete
        }
        
        // Calculate brightness based on phase
        let brightness = 0;
        let scanlineBoost = 0;
        let noiseBoost = 0;
        
        if (progress < 0.1) {
            // Phase 0: Instant blackout
            brightness = 0;
        } else if (progress < 0.2) {
            // Phase 1: Brief flicker
            const flickerProgress = (progress - 0.1) / 0.1;
            brightness = Math.sin(flickerProgress * Math.PI) * 0.3;
            noiseBoost = 0.2;
        } else if (progress < 0.4) {
            // Phase 2: Black again
            brightness = 0;
        } else if (progress < 0.75) {
            // Phase 3: Stuttering power-up
            const stutterProgress = (progress - 0.4) / 0.35;
            // Multiple stutter attempts
            const stutterCount = 4;
            const stutterPhase = stutterProgress * stutterCount;
            const stutterFrac = stutterPhase % 1;
            
            // Each stutter gets progressively brighter
            const baseLevel = Math.floor(stutterPhase) / stutterCount;
            brightness = baseLevel + stutterFrac * 0.3;
            
            // Random dropout during stutter
            if (Math.random() < 0.3) {
                brightness *= 0.5;
            }
            
            scanlineBoost = 0.15 * (1 - stutterProgress);
            noiseBoost = 0.1 * (1 - stutterProgress);
        } else {
            // Phase 4: Full restore with slight overshoot
            const restoreProgress = (progress - 0.75) / 0.25;
            brightness = 1 + Math.sin(restoreProgress * Math.PI) * 0.1;
            scanlineBoost = 0.05 * (1 - restoreProgress);
        }
        
        // Apply to config
        config.brightness = originalConfig.brightness * Math.max(0, brightness);
        config.scanlineIntensity = originalConfig.scanlineIntensity + scanlineBoost;
        config.noiseIntensity = originalConfig.noiseIntensity + noiseBoost;
        
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SIGNAL LOSS EFFECT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Signal loss sequence:
     * Phase 0: Sudden cut to color bars with "SIGNAL LOST" (0-800ms)
     * Phase 1: Cut to black (800-1200ms)
     * Phase 2: "Reconnecting" graphic (1200-2000ms)
     * Phase 3: Static/noise burst (2000-2200ms)
     * Phase 4: Signal restored with brief instability (2200-3000ms)
     */
    function updateSignalLoss(elapsed, config, material) {
        const totalDuration = 3000;
        const progress = elapsed / totalDuration;
        
        if (progress >= 1) {
            // Restore original texture
            if (material && material.uniforms && originalConfig._originalTexture) {
                material.uniforms.sceneTexture.value = originalConfig._originalTexture;
            }
            return true;
        }
        
        // Determine phase and render appropriate overlay
        if (progress < 0.27) {
            // Phase 0: Signal Lost with color bars
            const canvas = renderOverlayGraphic(SIGNAL_LOST_ASCII, {
                backgroundColor: '#000000',
                textColor: '#ffffff',
                fontSize: 12,
                bands: true,
                bandColors: ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'],
                noise: 0.1
            });
            applyOverlayToMaterial(canvas, material);
            config.brightness = 1.2;
            config.chromaticAberration = 0.01;
        } else if (progress < 0.4) {
            // Phase 1: Cut to black
            const canvas = renderOverlayGraphic([], {
                backgroundColor: '#000000',
                scanlines: false
            });
            applyOverlayToMaterial(canvas, material);
            config.brightness = 0;
        } else if (progress < 0.67) {
            // Phase 2: Reconnecting graphic
            const spinnerFrame = Math.floor((elapsed / 150) % 4);
            const spinnerChars = ['◐', '◓', '◑', '◒'];
            const reconnectLines = [...RECONNECTING_ASCII];
            // Animate spinner
            reconnectLines[4] = `│              ${spinnerChars[spinnerFrame]} ${spinnerChars[(spinnerFrame + 1) % 4]} ${spinnerChars[(spinnerFrame + 2) % 4]} ${spinnerChars[(spinnerFrame + 3) % 4]}                │`;
            
            const canvas = renderOverlayGraphic(reconnectLines, {
                backgroundColor: '#0a0a0a',
                textColor: '#00ff00',
                fontSize: 16,
                noise: 0.05
            });
            applyOverlayToMaterial(canvas, material);
            config.brightness = 0.8;
            config.scanlineIntensity = 0.1;
        } else if (progress < 0.73) {
            // Phase 3: Static burst
            const canvas = renderOverlayGraphic([], {
                backgroundColor: '#808080',
                noise: 1.0,
                scanlines: true
            });
            applyOverlayToMaterial(canvas, material);
            config.brightness = 1.5;
            config.noiseIntensity = 0.3;
        } else {
            // Phase 4: Signal restored with instability
            if (material && material.uniforms && originalConfig._originalTexture) {
                material.uniforms.sceneTexture.value = originalConfig._originalTexture;
            }
            const restoreProgress = (progress - 0.73) / 0.27;
            config.brightness = originalConfig.brightness * (0.7 + restoreProgress * 0.3);
            config.hSyncWobble = originalConfig.hSyncWobble + 0.2 * (1 - restoreProgress);
            config.chromaticAberration = originalConfig.chromaticAberration + 0.005 * (1 - restoreProgress);
            
            // Occasional micro-glitches during restore
            if (Math.random() < 0.1) {
                config.glitchAmount = 0.2;
                config.glitchSeed = Math.random() * 100;
            }
        }
        
        return false;
    }
    
    /**
     * Apply overlay canvas as texture to material
     */
    function applyOverlayToMaterial(canvas, material) {
        if (!material || !material.uniforms) return;
        
        // Store original texture if not already stored
        if (!originalConfig._originalTexture) {
            originalConfig._originalTexture = material.uniforms.sceneTexture.value;
        }
        
        // Create or update overlay texture
        if (!overlayTexture) {
            overlayTexture = new THREE.CanvasTexture(canvas);
            overlayTexture.minFilter = THREE.LinearFilter;
            overlayTexture.magFilter = THREE.LinearFilter;
        } else {
            overlayTexture.image = canvas;
            overlayTexture.needsUpdate = true;
        }
        
        material.uniforms.sceneTexture.value = overlayTexture;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // VHS EFFECTS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * VHS Tracking error - horizontal displacement and color fringing
     */
    function updateVHSTracking(elapsed, config) {
        const totalDuration = 1500;
        const progress = elapsed / totalDuration;
        
        if (progress >= 1) {
            return true;
        }
        
        // Tracking wobble intensity peaks in middle
        const intensity = Math.sin(progress * Math.PI);
        
        // H-sync wobble simulates tracking issues
        config.hSyncWobble = originalConfig.hSyncWobble + intensity * 0.8;
        config.hSyncWobbleSpeed = 8 + Math.random() * 4;
        
        // Color separation
        config.chromaticAberration = originalConfig.chromaticAberration + intensity * 0.015;
        
        // Occasional hard jumps
        if (Math.random() < 0.05 * intensity) {
            config.glitchAmount = 0.4 + Math.random() * 0.3;
            config.glitchSeed = Math.random() * 100;
        } else if (config.glitchAmount > 0) {
            config.glitchAmount *= 0.8;
        }
        
        // Noise during tracking issues
        config.noiseIntensity = originalConfig.noiseIntensity + intensity * 0.08;
        
        return false;
    }
    
    /**
     * VHS Color bleed - colors smear and shift
     */
    function updateVHSColorBleed(elapsed, config) {
        const totalDuration = 2000;
        const progress = elapsed / totalDuration;
        
        if (progress >= 1) {
            return true;
        }
        
        // Intensity envelope
        const intensity = Math.sin(progress * Math.PI);
        
        // Shift color channels
        const time = elapsed * 0.001;
        
        // Modify lift (shadows) for color bleeding
        config.liftR = originalConfig.liftR + Math.sin(time * 2) * intensity * 0.15;
        config.liftG = originalConfig.liftG + Math.sin(time * 2.3 + 1) * intensity * 0.1;
        config.liftB = originalConfig.liftB + Math.sin(time * 1.7 + 2) * intensity * 0.15;
        
        // Modify gain (highlights) for color fringing
        config.gainR = originalConfig.gainR + Math.sin(time * 3) * intensity * 0.3;
        config.gainG = originalConfig.gainG;
        config.gainB = originalConfig.gainB + Math.sin(time * 3 + Math.PI) * intensity * 0.3;
        
        // Saturation fluctuation
        config.saturation = originalConfig.saturation + Math.sin(time * 5) * intensity * 0.5;
        
        // Chromatic aberration boost
        config.chromaticAberration = originalConfig.chromaticAberration + intensity * 0.008;
        
        return false;
    }
    
    /**
     * VHS Dropout - horizontal lines of missing signal
     */
    function updateVHSDropout(elapsed, config) {
        const totalDuration = 800;
        const progress = elapsed / totalDuration;
        
        if (progress >= 1) {
            return true;
        }
        
        // Dropout creates brief intense glitch
        const intensity = Math.sin(progress * Math.PI);
        
        // Simulate dropout with glitch effect
        config.glitchAmount = intensity * 0.6;
        config.glitchSeed = Math.floor(elapsed / 50); // Change seed frequently
        
        // Brief brightness dip
        config.brightness = originalConfig.brightness * (1 - intensity * 0.3);
        
        // Noise burst
        config.noiseIntensity = originalConfig.noiseIntensity + intensity * 0.15;
        
        // Scanline emphasis
        config.scanlineIntensity = originalConfig.scanlineIntensity + intensity * 0.1;
        
        return false;
    }
    
    /**
     * VHS Head switch - the classic bottom-of-frame glitch
     */
    function updateVHSHeadSwitch(elapsed, config) {
        const totalDuration = 600;
        const progress = elapsed / totalDuration;
        
        if (progress >= 1) {
            return true;
        }
        
        // Head switch creates a sharp horizontal tear
        const intensity = progress < 0.5 
            ? progress * 2 
            : (1 - progress) * 2;
        
        // Strong horizontal displacement
        config.hSyncWobble = originalConfig.hSyncWobble + intensity * 1.2;
        config.hSyncWobbleSpeed = 15;
        
        // Color fringing at the tear
        config.chromaticAberration = originalConfig.chromaticAberration + intensity * 0.02;
        
        // Brief brightness spike
        config.brightness = originalConfig.brightness * (1 + intensity * 0.2);
        
        // Interlace emphasis
        config.interlaceIntensity = intensity * 0.8;
        
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // EFFECT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Start a specific effect
     */
    function triggerEffect(effectType) {
        if (activeEffect) {
            console.log('[GlitchEffects] Effect already running, ignoring trigger');
            return false;
        }
        
        // Store original config values
        originalConfig = JSON.parse(JSON.stringify(CRTShader.config));
        originalConfig._originalTexture = null; // Will be set if needed
        
        activeEffect = effectType;
        effectStartTime = performance.now();
        effectPhase = 0;
        
        console.log('[GlitchEffects] Triggered:', effectType);
        return true;
    }
    
    /**
     * Trigger a random effect based on weights
     */
    function triggerRandomEffect() {
        // Build weighted selection array
        const weighted = [];
        for (const [effect, weight] of Object.entries(EFFECT_WEIGHTS)) {
            for (let i = 0; i < weight; i++) {
                weighted.push(effect);
            }
        }
        
        const selected = weighted[Math.floor(Math.random() * weighted.length)];
        return triggerEffect(selected);
    }
    
    /**
     * Update active effect - called every frame
     */
    function update(material) {
        if (!activeEffect) return;
        
        const now = performance.now();
        const elapsed = now - effectStartTime;
        const config = CRTShader.config;
        
        let complete = false;
        
        switch (activeEffect) {
            case EFFECTS.POWER_LOSS:
                complete = updatePowerLoss(elapsed, config);
                break;
            case EFFECTS.SIGNAL_LOSS:
                complete = updateSignalLoss(elapsed, config, material);
                break;
            case EFFECTS.VHS_TRACKING:
                complete = updateVHSTracking(elapsed, config);
                break;
            case EFFECTS.VHS_COLOR_BLEED:
                complete = updateVHSColorBleed(elapsed, config);
                break;
            case EFFECTS.VHS_DROPOUT:
                complete = updateVHSDropout(elapsed, config);
                break;
            case EFFECTS.VHS_HEAD_SWITCH:
                complete = updateVHSHeadSwitch(elapsed, config);
                break;
        }
        
        if (complete) {
            endEffect();
        }
    }
    
    /**
     * End current effect and restore config
     */
    function endEffect() {
        if (!activeEffect) return;
        
        console.log('[GlitchEffects] Effect complete:', activeEffect);
        
        // Restore original config
        if (originalConfig) {
            const config = CRTShader.config;
            
            // Restore all numeric/boolean properties
            for (const key of Object.keys(originalConfig)) {
                if (key.startsWith('_')) continue; // Skip internal properties
                if (typeof originalConfig[key] === 'object' && originalConfig[key] !== null) {
                    // Handle nested objects like tintColor
                    Object.assign(config[key], originalConfig[key]);
                } else {
                    config[key] = originalConfig[key];
                }
            }
            
            // Restore original texture if we swapped it
            if (originalConfig._originalTexture) {
                const material = ThreeSetup.getScenePlaneMaterial();
                if (material && material.uniforms) {
                    material.uniforms.sceneTexture.value = originalConfig._originalTexture;
                }
            }
        }
        
        activeEffect = null;
        originalConfig = null;
        effectPhase = 0;
        
        // Schedule next possible effect 30-120 seconds from now
        nextEffectTime = performance.now() + 30000 + Math.random() * 90000;
    }
    
    /**
     * Check if it's time for a random effect and maybe trigger one
     * Called from animation loop
     */
    function maybeAutoTrigger() {
        if (activeEffect) return; // Already running
        
        const now = performance.now();
        if (now < nextEffectTime) return; // Not time yet
        
        // Small chance to trigger when window opens (similar to light glitches)
        const triggerChance = 0.15; // 15% chance
        if (Math.random() < triggerChance) {
            triggerRandomEffect();
        } else {
            // Try again in 5-15 seconds
            nextEffectTime = now + 5000 + Math.random() * 10000;
        }
    }
    
    /**
     * Check if an effect is currently active
     */
    function isActive() {
        return activeEffect !== null;
    }
    
    /**
     * Get current effect type
     */
    function getCurrentEffect() {
        return activeEffect;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        init,
        update,
        triggerEffect,
        triggerRandomEffect,
        maybeAutoTrigger,
        endEffect,
        isActive,
        getCurrentEffect,
        EFFECTS
    };
})();
