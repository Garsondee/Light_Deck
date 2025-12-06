/**
 * Scene Viewer UI using Tweakpane
 * Floating panel for fine-tuning CRT shader parameters
 * Controls the Scene Viewer display (with optional ASCII art mode)
 */

const DebugUI = (function() {
    let pane;
    let asciiFolder, colorFolder, effectsFolder, glitchFolder;
    
    function init() {
        // Create Tweakpane instance
        pane = new Tweakpane.Pane({
            title: 'Scene Viewer Controls',
            expanded: true
        });
        
        // Position in top-left, above everything
        pane.element.style.position = 'fixed';
        pane.element.style.top = '10px';
        pane.element.style.left = '10px';
        pane.element.style.zIndex = '10000';
        
        const config = CRTShader.config;
        
        // === FONT SETTINGS (for ASCII character atlas) ===
        const fontFolder = pane.addFolder({ title: '🔤 Font & Characters', expanded: false });
        
        fontFolder.addInput(config, 'fontFamily', {
            label: 'Font Family',
            options: CRTShader.getFontOptions()
        }).on('change', () => {
            regenerateAtlasFromUI();
        });
        
        fontFolder.addInput(config, 'fontWeight', {
            label: 'Weight',
            options: {
                'Light (300)': 300,
                'Normal (400)': 400,
                'Medium (500)': 500,
                'Semi-Bold (600)': 600,
                'Bold (700)': 700
            }
        }).on('change', () => {
            regenerateAtlasFromUI();
        });
        
        fontFolder.addInput(config, 'charSet', {
            label: 'Character Set',
            options: CRTShader.getCharSetOptions()
        }).on('change', () => {
            regenerateAtlasFromUI();
        });
        
        fontFolder.addInput(config, 'customCharSet', {
            label: 'Custom Chars'
        }).on('change', () => {
            if (config.charSet === 'custom') {
                regenerateAtlasFromUI();
            }
        });
        
        fontFolder.addButton({ title: '🔄 Regenerate Atlas' }).on('click', () => {
            regenerateAtlasFromUI();
        });
        
        // === COLOR CORRECTION (top-level) ===
        const ccFolder = pane.addFolder({ title: '🎨 Color Correction', expanded: false });
        
        // -- Lift/Gamma/Gain --
        const lggFolder = ccFolder.addFolder({ title: 'Lift / Gamma / Gain', expanded: true });
        
        lggFolder.addInput(config, 'liftR', {
            label: 'Lift R (Shadows)',
            min: -0.5, max: 0.5, step: 0.01
        });
        lggFolder.addInput(config, 'liftG', {
            label: 'Lift G',
            min: -0.5, max: 0.5, step: 0.01
        });
        lggFolder.addInput(config, 'liftB', {
            label: 'Lift B',
            min: -0.5, max: 0.5, step: 0.01
        });
        
        lggFolder.addSeparator();
        
        lggFolder.addInput(config, 'gammaR', {
            label: 'Gamma R (Mids)',
            min: 0.5, max: 2.0, step: 0.01
        });
        lggFolder.addInput(config, 'gammaG', {
            label: 'Gamma G',
            min: 0.5, max: 2.0, step: 0.01
        });
        lggFolder.addInput(config, 'gammaB', {
            label: 'Gamma B',
            min: 0.5, max: 2.0, step: 0.01
        });
        
        lggFolder.addSeparator();
        
        lggFolder.addInput(config, 'gainR', {
            label: 'Gain R (Highs)',
            min: 0.0, max: 2.0, step: 0.01
        });
        lggFolder.addInput(config, 'gainG', {
            label: 'Gain G',
            min: 0.0, max: 2.0, step: 0.01
        });
        lggFolder.addInput(config, 'gainB', {
            label: 'Gain B',
            min: 0.0, max: 2.0, step: 0.01
        });
        
        // -- Temperature & Tint --
        const tempFolder = ccFolder.addFolder({ title: 'Temperature & Tint', expanded: true });
        
        tempFolder.addInput(config, 'colorTemperature', {
            label: 'Temperature',
            min: -1.0, max: 1.0, step: 0.01
        });
        
        tempFolder.addInput(config, 'colorTint', {
            label: 'Tint (G/M)',
            min: -1.0, max: 1.0, step: 0.01
        });
        
        // -- Saturation & Vibrance --
        const satFolder = ccFolder.addFolder({ title: 'Saturation & Vibrance', expanded: true });
        
        satFolder.addInput(config, 'saturation', {
            label: 'Saturation',
            min: 0.0, max: 2.0, step: 0.01
        });
        
        satFolder.addInput(config, 'vibrance', {
            label: 'Vibrance',
            min: -1.0, max: 1.0, step: 0.01
        });
        
        // -- Exposure & Gamma --
        const expFolder = ccFolder.addFolder({ title: 'Exposure & Gamma', expanded: true });
        
        expFolder.addInput(config, 'exposure', {
            label: 'Exposure (EV)',
            min: -2.0, max: 2.0, step: 0.05
        });
        
        expFolder.addInput(config, 'gamma', {
            label: 'Gamma',
            min: 0.5, max: 2.0, step: 0.01
        });
        
        // === UNREAL BLOOM (Post-Processing) ===
        const bloomUFolder = pane.addFolder({ title: '✨ Unreal Bloom', expanded: false });
        
        bloomUFolder.addInput(config, 'unrealBloomEnabled', {
            label: 'Enabled'
        });
        
        bloomUFolder.addInput(config, 'unrealBloomStrength', {
            label: 'Strength',
            min: 0, max: 3, step: 0.01
        });
        
        bloomUFolder.addInput(config, 'unrealBloomRadius', {
            label: 'Radius',
            min: 0, max: 1, step: 0.01
        });
        
        bloomUFolder.addInput(config, 'unrealBloomThreshold', {
            label: 'Threshold',
            min: 0, max: 1, step: 0.01
        });
        
        // NOTE: Soft Knee, Bloom Color, and Mix removed - UnrealBloomPass uses strength/radius/threshold only
        
        // === ASCII Settings ===
        asciiFolder = pane.addFolder({ title: 'ASCII', expanded: true });
        
        asciiFolder.addInput(config, 'asciiMode', {
            label: 'ASCII Enabled'
        });
        
        asciiFolder.addInput(config, 'cellWidth', {
            label: 'Cell Width',
            min: 4, max: 24, step: 1
        });
        
        asciiFolder.addInput(config, 'cellHeight', {
            label: 'Cell Height',
            min: 6, max: 32, step: 1
        });
        
        asciiFolder.addInput(config, 'gapX', {
            label: 'Gap X',
            min: 0, max: 0.5, step: 0.01
        });
        
        asciiFolder.addInput(config, 'gapY', {
            label: 'Gap Y',
            min: 0, max: 0.5, step: 0.01
        });
        
        asciiFolder.addInput(config, 'useShapeMatching', {
            label: 'Shape Matching'
        });
        
        asciiFolder.addSeparator();
        
        asciiFolder.addInput(config, 'asciiMinOpacity', {
            label: 'Min Opacity',
            min: 0, max: 1, step: 0.01
        });
        
        asciiFolder.addInput(config, 'asciiMaxOpacity', {
            label: 'Max Opacity',
            min: 0, max: 1, step: 0.01
        });
        
        asciiFolder.addInput(config, 'asciiContrastBoost', {
            label: 'Contrast Influence',
            min: 0, max: 8, step: 0.1
        });
        
        asciiFolder.addInput(config, 'asciiCharBrightness', {
            label: 'Char Brightness',
            min: 0, max: 2, step: 0.01
        });
        
        asciiFolder.addInput(config, 'asciiBackgroundStrength', {
            label: 'Background Strength',
            min: 0, max: 1, step: 0.01
        });
        
        asciiFolder.addSeparator();
        
        asciiFolder.addMonitor(config, 'charCount', {
            label: 'Characters',
            format: (v) => `${v} chars`
        });
        
        // === Color Settings ===
        colorFolder = pane.addFolder({ title: 'Color', expanded: true });
        
        colorFolder.addInput(config, 'tintColor', {
            label: 'Tint Color'
        });
        
        colorFolder.addInput(config, 'tintStrength', {
            label: 'Tint Strength',
            min: 0, max: 1, step: 0.01
        });
        
        colorFolder.addInput(config, 'brightness', {
            label: 'Brightness',
            min: 0.5, max: 2, step: 0.01
        });
        
        colorFolder.addInput(config, 'contrast', {
            label: 'Contrast',
            min: 0.5, max: 2, step: 0.01
        });
        
        colorFolder.addInput(config, 'backgroundBleed', {
            label: 'Background Bleed',
            min: 0, max: 1, step: 0.01
        });
        
        // NOTE: Old Bloom folder removed - bloom is now controlled via Unreal Bloom (post-processing)
        
        // === Effects ===
        effectsFolder = pane.addFolder({ title: 'Effects', expanded: false });
        
        effectsFolder.addInput(config, 'shimmerIntensity', {
            label: 'Shimmer',
            min: 0, max: 0.5, step: 0.01
        });
        
        effectsFolder.addInput(config, 'shimmerSpeed', {
            label: 'Shimmer Speed',
            min: 0.5, max: 10, step: 0.5
        });
        
        effectsFolder.addInput(config, 'scanlineIntensity', {
            label: 'Scanlines',
            min: 0, max: 0.3, step: 0.01
        });
        
        effectsFolder.addInput(config, 'scanlineCount', {
            label: 'Scanline Density',
            min: 100, max: 800, step: 10
        });
        
        effectsFolder.addInput(config, 'noiseIntensity', {
            label: 'Noise',
            min: 0, max: 0.1, step: 0.005
        });
        
        effectsFolder.addInput(config, 'vignetteStrength', {
            label: 'Vignette',
            min: 0, max: 0.8, step: 0.01
        });
        
        // === Glitch ===
        glitchFolder = pane.addFolder({ title: 'Glitch', expanded: false });
        
        glitchFolder.addInput(config, 'glitchAmount', {
            label: 'Amount',
            min: 0, max: 1, step: 0.01
        });
        
        glitchFolder.addButton({ title: 'Trigger Glitch (Light)' }).on('click', () => {
            CRTShader.triggerGlitch(0.3, 200);
        });
        
        glitchFolder.addButton({ title: 'Trigger Glitch (Heavy)' }).on('click', () => {
            CRTShader.triggerGlitch(0.8, 500);
        });
        
        glitchFolder.addSeparator();
        
        // === Dramatic Effects (GlitchEffects module) ===
        if (typeof GlitchEffects !== 'undefined') {
            glitchFolder.addButton({ title: '⚡ Power Loss' }).on('click', () => {
                GlitchEffects.triggerEffect(GlitchEffects.EFFECTS.POWER_LOSS);
            });
            
            glitchFolder.addButton({ title: '📡 Signal Loss' }).on('click', () => {
                GlitchEffects.triggerEffect(GlitchEffects.EFFECTS.SIGNAL_LOSS);
            });
            
            glitchFolder.addButton({ title: '📼 VHS Tracking' }).on('click', () => {
                GlitchEffects.triggerEffect(GlitchEffects.EFFECTS.VHS_TRACKING);
            });
            
            glitchFolder.addButton({ title: '🌈 VHS Color Bleed' }).on('click', () => {
                GlitchEffects.triggerEffect(GlitchEffects.EFFECTS.VHS_COLOR_BLEED);
            });
            
            glitchFolder.addButton({ title: '▬ VHS Dropout' }).on('click', () => {
                GlitchEffects.triggerEffect(GlitchEffects.EFFECTS.VHS_DROPOUT);
            });
            
            glitchFolder.addButton({ title: '⎯ VHS Head Switch' }).on('click', () => {
                GlitchEffects.triggerEffect(GlitchEffects.EFFECTS.VHS_HEAD_SWITCH);
            });
            
            glitchFolder.addButton({ title: '🎲 Random Dramatic Effect' }).on('click', () => {
                GlitchEffects.triggerRandomEffect();
            });
        }
        
        // === CRT Effects ===
        const crtFolder = pane.addFolder({ title: 'CRT Effects', expanded: false });
        
        // -- Screen Curvature --
        const curvatureFolder = crtFolder.addFolder({ title: 'Screen Curvature', expanded: true });
        
        curvatureFolder.addInput(config, 'barrelDistortion', {
            label: 'Barrel Distortion',
            min: 0, max: 0.5, step: 0.01
        });
        
        curvatureFolder.addInput(config, 'barrelZoom', {
            label: 'Zoom Compensation',
            min: 0.9, max: 1.2, step: 0.01
        });
        
        // -- Chromatic Aberration --
        const chromaFolder = crtFolder.addFolder({ title: 'Chromatic Aberration', expanded: true });
        
        chromaFolder.addInput(config, 'chromaticAberration', {
            label: 'Intensity',
            min: 0, max: 0.02, step: 0.001
        });
        
        chromaFolder.addInput(config, 'chromaticCenter', {
            label: 'Edge-Based'
        });
        
        // -- Phosphor Mask --
        const phosphorFolder = crtFolder.addFolder({ title: 'Phosphor Mask', expanded: true });
        
        phosphorFolder.addInput(config, 'phosphorMaskType', {
            label: 'Type',
            options: {
                'Off': 0,
                'RGB Triads': 1,
                'Aperture Grille': 2,
                'Slot Mask': 3
            }
        });
        
        phosphorFolder.addInput(config, 'phosphorMaskIntensity', {
            label: 'Intensity',
            min: 0, max: 1, step: 0.01
        });
        
        phosphorFolder.addInput(config, 'phosphorMaskScale', {
            label: 'Scale',
            min: 0.5, max: 4, step: 0.1
        });
        
        // -- Interlacing --
        const interlaceFolder = crtFolder.addFolder({ title: 'Interlacing', expanded: true });
        
        interlaceFolder.addInput(config, 'interlaceEnabled', {
            label: 'Enabled'
        });
        
        interlaceFolder.addInput(config, 'interlaceIntensity', {
            label: 'Intensity',
            min: 0, max: 1, step: 0.01
        });
        
        // -- H-Sync Wobble --
        const hsyncFolder = crtFolder.addFolder({ title: 'H-Sync Wobble', expanded: true });
        
        hsyncFolder.addInput(config, 'hSyncWobble', {
            label: 'Amount',
            min: 0, max: 1, step: 0.01
        });
        
        hsyncFolder.addInput(config, 'hSyncWobbleSpeed', {
            label: 'Speed',
            min: 0.5, max: 10, step: 0.5
        });
        
        // -- Electron Beam --
        const beamFolder = crtFolder.addFolder({ title: 'Electron Beam', expanded: true });
        
        beamFolder.addInput(config, 'beamWidth', {
            label: 'Beam Width',
            min: 0, max: 2, step: 0.1
        });
        
        // -- Phosphor Persistence (placeholder - requires render-to-texture) --
        const persistFolder = crtFolder.addFolder({ title: 'Phosphor Persistence', expanded: false });
        
        persistFolder.addInput(config, 'persistenceEnabled', {
            label: 'Enabled (WIP)'
        });
        
        persistFolder.addInput(config, 'persistenceIntensity', {
            label: 'Intensity',
            min: 0, max: 1, step: 0.01
        });
        
        persistFolder.addInput(config, 'persistenceDecay', {
            label: 'Decay',
            min: 0.8, max: 0.99, step: 0.01
        });
        
        // === Glow & Ambient ===
        const glowFolder = pane.addFolder({ title: 'Glow & Ambient', expanded: false });
        
        glowFolder.addInput(config, 'glowIntensity', {
            label: 'Glow Intensity',
            min: 0, max: 1, step: 0.01
        });
        
        glowFolder.addInput(config, 'glowRadius', {
            label: 'Glow Radius',
            min: 1, max: 16, step: 0.5
        });
        
        glowFolder.addInput(config, 'ambientLight', {
            label: 'Ambient Light',
            min: 0, max: 0.1, step: 0.005
        });
        
        // === Film Grain ===
        const grainFolder = pane.addFolder({ title: 'Film Grain', expanded: false });
        
        grainFolder.addInput(config, 'filmGrainIntensity', {
            label: 'Intensity',
            min: 0, max: 0.5, step: 0.01
        });
        
        grainFolder.addInput(config, 'filmGrainSize', {
            label: 'Grain Size',
            min: 1, max: 8, step: 0.5
        });
        
        grainFolder.addInput(config, 'filmGrainSpeed', {
            label: 'Animation Speed',
            min: 1, max: 30, step: 1
        });
        
        // === Presets ===
        const presetsFolder = pane.addFolder({ title: 'Presets', expanded: false });
        
        presetsFolder.addButton({ title: 'Amber Terminal' }).on('click', () => {
            config.tintColor = { r: 255, g: 170, b: 0 };
            config.tintStrength = 1.0;
            config.cellSize = 8;
            config.shimmerIntensity = 0.15;
            pane.refresh();
        });
        
        presetsFolder.addButton({ title: 'Green Terminal' }).on('click', () => {
            config.tintColor = { r: 0, g: 255, b: 100 };
            config.tintStrength = 1.0;
            config.cellSize = 8;
            config.shimmerIntensity = 0.15;
            pane.refresh();
        });
        
        presetsFolder.addButton({ title: 'White Terminal' }).on('click', () => {
            config.tintColor = { r: 220, g: 220, b: 220 };
            config.tintStrength = 1.0;
            config.cellSize = 8;
            config.shimmerIntensity = 0.1;
            pane.refresh();
        });
        
        presetsFolder.addButton({ title: 'Full Color ASCII' }).on('click', () => {
            config.tintStrength = 0.0;
            config.cellSize = 8;
            config.shimmerIntensity = 0.15;
            pane.refresh();
        });
        
        presetsFolder.addButton({ title: 'Chunky ASCII' }).on('click', () => {
            config.cellSize = 16;
            config.shimmerIntensity = 0.2;
            pane.refresh();
        });
        
        presetsFolder.addSeparator();
        
        presetsFolder.addButton({ title: 'CRT: Authentic 80s' }).on('click', () => {
            config.barrelDistortion = 0.15;
            config.barrelZoom = 1.04;
            config.chromaticAberration = 0.004;
            config.chromaticCenter = true;
            config.phosphorMaskType = 1; // RGB Triads
            config.phosphorMaskIntensity = 0.25;
            config.phosphorMaskScale = 1.0;
            config.interlaceEnabled = true;
            config.interlaceIntensity = 0.3;
            config.scanlineIntensity = 0.1;
            config.hSyncWobble = 0.05;
            config.beamWidth = 0.5;
            pane.refresh();
        });
        
        presetsFolder.addButton({ title: 'CRT: Arcade Monitor' }).on('click', () => {
            config.barrelDistortion = 0.08;
            config.barrelZoom = 1.02;
            config.chromaticAberration = 0.002;
            config.chromaticCenter = true;
            config.phosphorMaskType = 2; // Aperture Grille
            config.phosphorMaskIntensity = 0.2;
            config.phosphorMaskScale = 1.5;
            config.interlaceEnabled = false;
            config.scanlineIntensity = 0.08;
            config.hSyncWobble = 0;
            config.beamWidth = 0.3;
            config.bloomIntensity = 0.5;
            pane.refresh();
        });
        
        presetsFolder.addButton({ title: 'CRT: Broken VHS' }).on('click', () => {
            config.barrelDistortion = 0.12;
            config.chromaticAberration = 0.008;
            config.chromaticCenter = false;
            config.hSyncWobble = 0.4;
            config.hSyncWobbleSpeed = 5;
            config.interlaceEnabled = true;
            config.interlaceIntensity = 0.6;
            config.noiseIntensity = 0.06;
            config.scanlineIntensity = 0.15;
            CRTShader.triggerGlitch(0.2, 100);
            pane.refresh();
        });
        
        presetsFolder.addButton({ title: 'CRT: Clean Modern' }).on('click', () => {
            config.barrelDistortion = 0.05;
            config.barrelZoom = 1.01;
            config.chromaticAberration = 0.001;
            config.chromaticCenter = true;
            config.phosphorMaskType = 0; // Off
            config.interlaceEnabled = false;
            config.hSyncWobble = 0;
            config.beamWidth = 0;
            config.scanlineIntensity = 0.03;
            config.noiseIntensity = 0.02;
            pane.refresh();
        });
        
        presetsFolder.addButton({ title: 'Reset CRT Effects' }).on('click', () => {
            config.barrelDistortion = 0.1;
            config.barrelZoom = 1.02;
            config.chromaticAberration = 0.003;
            config.chromaticCenter = true;
            config.phosphorMaskType = 0;
            config.phosphorMaskIntensity = 0.15;
            config.phosphorMaskScale = 1.0;
            config.interlaceEnabled = false;
            config.interlaceIntensity = 0.5;
            config.hSyncWobble = 0;
            config.hSyncWobbleSpeed = 3;
            config.beamWidth = 0;
            pane.refresh();
        });
        
        // === Audio ===
        const audioFolder = pane.addFolder({ title: 'Audio', expanded: true });
        
        const audioState = {
            volume: 0.5,
            currentTrack: 'geoscape',
            trackList: []
        };
        
        audioFolder.addInput(audioState, 'volume', {
            label: 'Volume',
            min: 0, max: 1, step: 0.05
        }).on('change', (ev) => {
            Audio.setMusicVolume(ev.value);
        });
        
        // Track selector - will be populated after tracks load
        let trackBinding = null;
        
        async function initAudioControls() {
            await Audio.loadTrackList();
            const tracks = Audio.getTracks();
            
            if (tracks.length > 0) {
                // Build options object for dropdown
                const trackOptions = {};
                tracks.forEach(t => {
                    trackOptions[t.name] = t.id;
                });
                
                audioState.currentTrack = tracks[0].id;
                
                trackBinding = audioFolder.addInput(audioState, 'currentTrack', {
                    label: 'Track',
                    options: trackOptions
                });
            }
        }
        
        audioFolder.addButton({ title: 'Play' }).on('click', async () => {
            const result = await Audio.play(audioState.currentTrack);
            if (result && result.success) {
                App.addChatMessage('system', `Playing: ${result.trackName}`);
            } else if (result && result.error) {
                App.addChatMessage('error', `AUDIO ERROR: ${result.error}`);
            } else {
                App.addChatMessage('error', `AUDIO ERROR: Failed to play track`);
            }
        });
        
        audioFolder.addButton({ title: 'Stop' }).on('click', () => {
            Audio.stop();
            App.addChatMessage('system', 'Audio stopped.');
        });
        
        // Initialize audio controls after a short delay
        setTimeout(initAudioControls, 500);
        
        // === Export ===
        const exportFolder = pane.addFolder({ title: 'Export', expanded: false });
        
        exportFolder.addButton({ title: 'Copy Settings to Console' }).on('click', () => {
            const settings = JSON.stringify(config, null, 2);
            console.log('=== ASCII Shader Settings ===');
            console.log(settings);
            console.log('=============================');
        });
        
        // NOTE: Keyboard toggle is handled by InputManager
        // Do not add duplicate keydown listeners here
        
        console.log('[DEBUG UI] Initialized. Press ` to toggle visibility.');
        return pane;
    }
    
    /**
     * Regenerate the ASCII character atlas when font settings change
     * Gets the material from ThreeSetup and updates it
     */
    function regenerateAtlasFromUI() {
        // Get the scene plane material from ThreeSetup
        if (typeof ThreeSetup !== 'undefined' && ThreeSetup.getScenePlaneMaterial) {
            const material = ThreeSetup.getScenePlaneMaterial();
            CRTShader.regenerateAtlas(material);
            
            // Refresh the pane to update charCount monitor
            if (pane) pane.refresh();
        } else {
            // Fallback: just regenerate without material update
            CRTShader.regenerateAtlas(null);
            console.log('[SCENE UI] Material not available, atlas regenerated but not applied');
        }
    }
    
    function toggleVisibility() {
        if (pane) {
            const isHidden = pane.element.style.display === 'none';
            pane.element.style.display = isHidden ? '' : 'none';
        }
    }
    
    function show() {
        if (pane) pane.element.style.display = '';
    }
    
    function hide() {
        if (pane) pane.element.style.display = 'none';
    }
    
    function refresh() {
        if (pane) pane.refresh();
    }
    
    return {
        init,
        toggleVisibility,
        show,
        hide,
        refresh
    };
})();
