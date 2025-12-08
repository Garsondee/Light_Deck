/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SETTINGS UI - Unified Tweakpane Settings Panel
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Combines all settings into a single panel with categorized folders:
 * - 🎲 Dice Settings (appearance, physics)
 * - 📺 Scene Viewer (CRT effects, ASCII, color correction)
 * - 💻 Terminal (CRT curvature)
 * - 🔊 Audio (volume, track selection)
 * - 🎨 Presets (quick configurations)
 * 
 * Keyboard shortcut: F1 to toggle
 * All folders collapsed by default for cleaner UI.
 */

const SettingsUI = (function() {
    'use strict';
    
    let pane = null;
    let initialized = false;
    let visible = false;
    
    // ═══════════════════════════════════════════════════════════════════════
    // DICE SETTINGS STATE (synced with DiceManager)
    // ═══════════════════════════════════════════════════════════════════════
    
    const diceConfig = {
        themeColor: '#5e8cc9',
        scale: 6,
        gravity: 2,
        spinForce: 5,
        throwForce: 5
    };
    
    // ═══════════════════════════════════════════════════════════════════════
    // TERMINAL SETTINGS STATE (synced with TerminalManager)
    // ═══════════════════════════════════════════════════════════════════════
    
    const terminalConfig = {
        barrelDistortion: 0.09,
        barrelZoom: 1.07
    };
    
    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    
    function init() {
        if (initialized) {
            console.warn('[SettingsUI] Already initialized');
            return;
        }
        
        // Sync dice config from DiceManager if available
        if (typeof DiceManager !== 'undefined' && DiceManager.isInitialized()) {
            const settings = DiceManager.getSettings();
            diceConfig.themeColor = settings.themeColor || '#5e8cc9';
            diceConfig.scale = settings.scale || 6;
            diceConfig.gravity = settings.gravity || 2;
            diceConfig.spinForce = settings.spinForce || 5;
            diceConfig.throwForce = settings.throwForce || 5;
        }
        
        // Create the unified Tweakpane
        pane = new Tweakpane.Pane({
            title: '⚙️ Settings',
            expanded: true
        });
        
        // Position centered in the viewport
        pane.element.style.position = 'fixed';
        pane.element.style.top = '50%';
        pane.element.style.left = '50%';
        pane.element.style.transform = 'translate(-50%, -50%)';
        pane.element.style.zIndex = '10000';
        pane.element.style.maxHeight = '80vh';
        pane.element.style.overflowY = 'auto';
        
        // Start hidden
        pane.element.style.display = 'none';
        
        // Build all sections
        buildDiceSection();
        buildSceneViewerSection();
        buildTerminalSection();
        buildAudioSection();
        buildOnboardingSection();
        buildPresetsSection();
        buildExportSection();
        
        // Add keyboard shortcut info
        pane.addBlade({
            view: 'text',
            label: 'Shortcut',
            parse: (v) => String(v),
            value: 'F1 to toggle'
        });
        
        initialized = true;
        console.log('[SettingsUI] Initialized. Press F1 to toggle.');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // DICE SETTINGS SECTION
    // ═══════════════════════════════════════════════════════════════════════
    
    function buildDiceSection() {
        const folder = pane.addFolder({ title: '🎲 Dice', expanded: false });
        
        // Color picker
        folder.addInput(diceConfig, 'themeColor', {
            label: 'Dice Color'
        }).on('change', (ev) => {
            if (typeof DiceManager !== 'undefined') {
                DiceManager.setColor(ev.value);
            }
        });
        
        // Scale
        folder.addInput(diceConfig, 'scale', {
            label: 'Size',
            min: 2, max: 15, step: 0.5
        }).on('change', (ev) => {
            if (typeof DiceManager !== 'undefined') {
                DiceManager.updateSettings({ scale: ev.value });
            }
        });
        
        // Physics subfolder
        const physicsFolder = folder.addFolder({ title: 'Physics', expanded: false });
        
        physicsFolder.addInput(diceConfig, 'gravity', {
            label: 'Gravity',
            min: 0.5, max: 5, step: 0.1
        }).on('change', (ev) => {
            if (typeof DiceManager !== 'undefined') {
                DiceManager.updateSettings({ gravity: ev.value });
            }
        });
        
        physicsFolder.addInput(diceConfig, 'spinForce', {
            label: 'Spin Force',
            min: 1, max: 15, step: 0.5
        }).on('change', (ev) => {
            if (typeof DiceManager !== 'undefined') {
                DiceManager.updateSettings({ spinForce: ev.value });
            }
        });
        
        physicsFolder.addInput(diceConfig, 'throwForce', {
            label: 'Throw Force',
            min: 1, max: 15, step: 0.5
        }).on('change', (ev) => {
            if (typeof DiceManager !== 'undefined') {
                DiceManager.updateSettings({ throwForce: ev.value });
            }
        });
        
        // Test button
        folder.addButton({ title: '🎲 Test Roll (2d6)' }).on('click', () => {
            if (typeof DiceManager !== 'undefined' && DiceManager.isInitialized()) {
                DiceManager.roll('2d6');
            } else if (typeof ChatManager !== 'undefined') {
                ChatManager.addMessage('error', '3D dice not initialized');
            }
        });
        
        // Reset button
        folder.addButton({ title: '↺ Reset to Defaults' }).on('click', () => {
            if (typeof DiceManager !== 'undefined') {
                DiceManager.resetSettings();
                // Sync local config
                const settings = DiceManager.getSettings();
                diceConfig.themeColor = settings.themeColor;
                diceConfig.scale = settings.scale;
                diceConfig.gravity = settings.gravity;
                diceConfig.spinForce = settings.spinForce;
                diceConfig.throwForce = settings.throwForce;
                pane.refresh();
            }
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // SCENE VIEWER SECTION
    // ═══════════════════════════════════════════════════════════════════════
    
    function buildSceneViewerSection() {
        if (typeof CRTShader === 'undefined') {
            console.warn('[SettingsUI] CRTShader not available, skipping Scene Viewer section');
            return;
        }
        
        const config = CRTShader.config;
        const folder = pane.addFolder({ title: '📺 Scene Viewer', expanded: false });
        
        // === ASCII Settings ===
        const asciiFolder = folder.addFolder({ title: 'ASCII', expanded: false });
        
        asciiFolder.addInput(config, 'asciiMode', { label: 'Enabled' });
        asciiFolder.addInput(config, 'cellWidth', { label: 'Cell Width', min: 4, max: 24, step: 1 });
        asciiFolder.addInput(config, 'cellHeight', { label: 'Cell Height', min: 6, max: 32, step: 1 });
        asciiFolder.addInput(config, 'useShapeMatching', { label: 'Shape Matching' });
        
        // === Color Settings ===
        const colorFolder = folder.addFolder({ title: 'Color', expanded: false });
        
        colorFolder.addInput(config, 'tintColor', { label: 'Tint Color' });
        colorFolder.addInput(config, 'tintStrength', { label: 'Tint Strength', min: 0, max: 1, step: 0.01 });
        colorFolder.addInput(config, 'brightness', { label: 'Brightness', min: 0.5, max: 2, step: 0.01 });
        colorFolder.addInput(config, 'contrast', { label: 'Contrast', min: 0.5, max: 2, step: 0.01 });
        
        // === Effects ===
        const effectsFolder = folder.addFolder({ title: 'Effects', expanded: false });
        
        effectsFolder.addInput(config, 'shimmerIntensity', { label: 'Shimmer', min: 0, max: 0.5, step: 0.01 });
        effectsFolder.addInput(config, 'scanlineIntensity', { label: 'Scanlines', min: 0, max: 0.3, step: 0.01 });
        effectsFolder.addInput(config, 'noiseIntensity', { label: 'Noise', min: 0, max: 0.1, step: 0.005 });
        effectsFolder.addInput(config, 'vignetteStrength', { label: 'Vignette', min: 0, max: 0.8, step: 0.01 });
        
        // === CRT Effects ===
        const crtFolder = folder.addFolder({ title: 'CRT Effects', expanded: false });
        
        crtFolder.addInput(config, 'barrelDistortion', { label: 'Barrel Distortion', min: 0, max: 0.5, step: 0.01 });
        crtFolder.addInput(config, 'barrelZoom', { label: 'Zoom Compensation', min: 0.9, max: 1.2, step: 0.01 });
        crtFolder.addInput(config, 'chromaticAberration', { label: 'Chromatic Aberration', min: 0, max: 0.02, step: 0.001 });
        
        // Phosphor Mask
        crtFolder.addInput(config, 'phosphorMaskType', {
            label: 'Phosphor Mask',
            options: { 'Off': 0, 'RGB Triads': 1, 'Aperture Grille': 2, 'Slot Mask': 3 }
        });
        crtFolder.addInput(config, 'phosphorMaskIntensity', { label: 'Mask Intensity', min: 0, max: 1, step: 0.01 });
        
        // === Bloom ===
        const bloomFolder = folder.addFolder({ title: 'Bloom', expanded: false });
        
        bloomFolder.addInput(config, 'unrealBloomEnabled', { label: 'Enabled' });
        bloomFolder.addInput(config, 'unrealBloomStrength', { label: 'Strength', min: 0, max: 3, step: 0.01 });
        bloomFolder.addInput(config, 'unrealBloomRadius', { label: 'Radius', min: 0, max: 1, step: 0.01 });
        bloomFolder.addInput(config, 'unrealBloomThreshold', { label: 'Threshold', min: 0, max: 1, step: 0.01 });
        
        // === Glitch ===
        const glitchFolder = folder.addFolder({ title: 'Glitch', expanded: false });
        
        glitchFolder.addInput(config, 'glitchAmount', { label: 'Amount', min: 0, max: 1, step: 0.01 });
        
        glitchFolder.addButton({ title: '⚡ Trigger Glitch' }).on('click', () => {
            CRTShader.triggerGlitch(0.5, 300);
        });
        
        if (typeof GlitchEffects !== 'undefined') {
            glitchFolder.addButton({ title: '📡 Signal Loss' }).on('click', () => {
                GlitchEffects.triggerEffect(GlitchEffects.EFFECTS.SIGNAL_LOSS);
            });
            glitchFolder.addButton({ title: '📼 VHS Tracking' }).on('click', () => {
                GlitchEffects.triggerEffect(GlitchEffects.EFFECTS.VHS_TRACKING);
            });
        }
        
        // === Color Correction (advanced) ===
        const ccFolder = folder.addFolder({ title: 'Color Correction (Advanced)', expanded: false });
        
        ccFolder.addInput(config, 'exposure', { label: 'Exposure', min: -2, max: 2, step: 0.05 });
        ccFolder.addInput(config, 'gamma', { label: 'Gamma', min: 0.5, max: 2, step: 0.01 });
        ccFolder.addInput(config, 'saturation', { label: 'Saturation', min: 0, max: 2, step: 0.01 });
        ccFolder.addInput(config, 'colorTemperature', { label: 'Temperature', min: -1, max: 1, step: 0.01 });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // TERMINAL SECTION
    // ═══════════════════════════════════════════════════════════════════════
    
    function buildTerminalSection() {
        const folder = pane.addFolder({ title: '💻 Terminal', expanded: false });
        
        folder.addInput(terminalConfig, 'barrelDistortion', {
            label: 'Barrel Distortion',
            min: 0, max: 0.5, step: 0.01
        }).on('change', applyTerminalSettings);
        
        folder.addInput(terminalConfig, 'barrelZoom', {
            label: 'Zoom Compensation',
            min: 0.9, max: 1.2, step: 0.01
        }).on('change', applyTerminalSettings);
    }
    
    function applyTerminalSettings() {
        if (typeof TerminalManager !== 'undefined' && TerminalManager.setCRTConfig) {
            TerminalManager.setCRTConfig({
                barrelDistortion: terminalConfig.barrelDistortion,
                barrelZoom: terminalConfig.barrelZoom
            });
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // AUDIO SECTION
    // ═══════════════════════════════════════════════════════════════════════
    
    function buildAudioSection() {
        if (typeof Audio === 'undefined') {
            console.warn('[SettingsUI] Audio not available, skipping Audio section');
            return;
        }
        
        const folder = pane.addFolder({ title: '🔊 Audio', expanded: false });
        
        const audioState = {
            volume: 0.5,
            currentTrack: 'geoscape'
        };
        
        folder.addInput(audioState, 'volume', {
            label: 'Volume',
            min: 0, max: 1, step: 0.05
        }).on('change', (ev) => {
            Audio.setMusicVolume(ev.value);
        });
        
        // Track selector - populated after tracks load
        async function initAudioControls() {
            await Audio.loadTrackList();
            const tracks = Audio.getTracks();
            
            if (tracks.length > 0) {
                const trackOptions = {};
                tracks.forEach(t => { trackOptions[t.name] = t.id; });
                audioState.currentTrack = tracks[0].id;
                
                folder.addInput(audioState, 'currentTrack', {
                    label: 'Track',
                    options: trackOptions
                });
            }
        }
        
        folder.addButton({ title: '▶ Play' }).on('click', async () => {
            const result = await Audio.play(audioState.currentTrack);
            if (result?.success && typeof App !== 'undefined') {
                App.addChatMessage('system', `Playing: ${result.trackName}`);
            }
        });
        
        folder.addButton({ title: '⏹ Stop' }).on('click', () => {
            Audio.stop();
        });
        
        setTimeout(initAudioControls, 500);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ONBOARDING SECTION
    // ═══════════════════════════════════════════════════════════════════════
    
    function buildOnboardingSection() {
        const folder = pane.addFolder({ title: '🎮 Onboarding', expanded: false });
        
        // Onboarding controls
        const onboardingState = {
            active: false,
            currentScreen: 'none'
        };
        
        // Start/Stop buttons
        folder.addButton({ title: '▶ Start Onboarding' }).on('click', () => {
            if (typeof OnboardingFlow !== 'undefined' && OnboardingFlow.isInitialized()) {
                OnboardingFlow.start();
                onboardingState.active = true;
                pane.refresh();
            } else if (typeof OnboardingManager !== 'undefined') {
                OnboardingManager.start();
            }
        });
        
        folder.addButton({ title: '⏹ Cancel Onboarding' }).on('click', () => {
            if (typeof OnboardingFlow !== 'undefined' && OnboardingFlow.isActive()) {
                OnboardingFlow.cancel();
                onboardingState.active = false;
                pane.refresh();
            } else if (typeof OnboardingManager !== 'undefined' && OnboardingManager.isActive()) {
                OnboardingManager.cancel();
            }
        });
        
        // Screen navigation (for testing)
        const screenFolder = folder.addFolder({ title: 'Screen Navigation', expanded: false });
        
        screenFolder.addButton({ title: '→ Boot Screen' }).on('click', () => {
            if (typeof OnboardingFlow !== 'undefined') {
                OnboardingFlow.goToScreen('boot');
            }
        });
        
        screenFolder.addButton({ title: '→ Audio Screen' }).on('click', () => {
            if (typeof OnboardingFlow !== 'undefined') {
                OnboardingFlow.goToScreen('audio');
            }
        });
        
        screenFolder.addButton({ title: '→ Identity Screen' }).on('click', () => {
            if (typeof OnboardingFlow !== 'undefined') {
                OnboardingFlow.goToScreen('identity');
            }
        });
        
        screenFolder.addButton({ title: '→ Portrait Screen' }).on('click', () => {
            if (typeof OnboardingFlow !== 'undefined') {
                OnboardingFlow.goToScreen('portrait');
            }
        });
        
        // Debug info
        const debugFolder = folder.addFolder({ title: 'Debug', expanded: false });
        
        debugFolder.addMonitor(onboardingState, 'active', { label: 'Active' });
        
        // Update monitor periodically
        setInterval(() => {
            if (typeof OnboardingFlow !== 'undefined') {
                onboardingState.active = OnboardingFlow.isActive();
                onboardingState.currentScreen = OnboardingFlow.getCurrentScreen() || 'none';
            }
        }, 500);
        
        // ═══════════════════════════════════════════════════════════════════
        // CRT OVERRIDES - Onboarding-specific CRT settings
        // ═══════════════════════════════════════════════════════════════════
        const crtFolder = folder.addFolder({ title: 'CRT Overrides', expanded: false });
        
        // Onboarding-specific CRT config preset (hard-coded for readability)
        const onboardingCRT = {
            brightness: 1.0,
            contrast: 1.0,
            scanlineIntensity: 0.01,
            noiseIntensity: 0.0,
            vignetteStrength: 0.80,
            shimmerIntensity: 0.25,
            unrealBloomEnabled: true,
            unrealBloomStrength: 0.66,
            unrealBloomRadius: 1.0,
            chromaticAberration: 0.001,
            // Neutral curvature for onboarding to avoid input misalignment.
            barrelDistortion: 0.0,
            barrelZoom: 1.0,
            phosphorMaskIntensity: 0.10,
            glitchAmount: 0.0
        };
        
        function applyOnboardingCRT() {
            if (typeof OnboardingScreenManager !== 'undefined' &&
                OnboardingScreenManager.setCRTConfig) {
                OnboardingScreenManager.setCRTConfig(onboardingCRT);
            }
        }
        
        // Color / Brightness
        crtFolder.addInput(onboardingCRT, 'brightness', {
            label: 'Brightness', min: 0.5, max: 2.0, step: 0.01
        }).on('change', applyOnboardingCRT);
        
        crtFolder.addInput(onboardingCRT, 'contrast', {
            label: 'Contrast', min: 0.5, max: 2.0, step: 0.01
        }).on('change', applyOnboardingCRT);
        
        // Effects
        crtFolder.addInput(onboardingCRT, 'scanlineIntensity', {
            label: 'Scanlines', min: 0, max: 0.3, step: 0.01
        }).on('change', applyOnboardingCRT);
        
        crtFolder.addInput(onboardingCRT, 'noiseIntensity', {
            label: 'Noise', min: 0, max: 0.1, step: 0.005
        }).on('change', applyOnboardingCRT);
        
        crtFolder.addInput(onboardingCRT, 'vignetteStrength', {
            label: 'Vignette', min: 0, max: 0.8, step: 0.01
        }).on('change', applyOnboardingCRT);
        
        crtFolder.addInput(onboardingCRT, 'shimmerIntensity', {
            label: 'Shimmer', min: 0, max: 0.5, step: 0.01
        }).on('change', applyOnboardingCRT);
        
        // Bloom
        crtFolder.addInput(onboardingCRT, 'unrealBloomEnabled', {
            label: 'Bloom Enabled'
        }).on('change', applyOnboardingCRT);
        
        crtFolder.addInput(onboardingCRT, 'unrealBloomStrength', {
            label: 'Bloom Strength', min: 0, max: 3, step: 0.01
        }).on('change', applyOnboardingCRT);
        
        crtFolder.addInput(onboardingCRT, 'unrealBloomRadius', {
            label: 'Bloom Radius', min: 0, max: 1, step: 0.01
        }).on('change', applyOnboardingCRT);
        
        // CRT Effects
        crtFolder.addInput(onboardingCRT, 'chromaticAberration', {
            label: 'Chromatic Aberration', min: 0, max: 0.02, step: 0.001
        }).on('change', applyOnboardingCRT);
        
        crtFolder.addInput(onboardingCRT, 'barrelDistortion', {
            label: 'Barrel Distortion', min: 0, max: 0.5, step: 0.01
        }).on('change', applyOnboardingCRT);
        
        crtFolder.addInput(onboardingCRT, 'barrelZoom', {
            label: 'Zoom Compensation', min: 0.9, max: 1.2, step: 0.01
        }).on('change', applyOnboardingCRT);
        
        crtFolder.addInput(onboardingCRT, 'phosphorMaskIntensity', {
            label: 'Phosphor Mask', min: 0, max: 1, step: 0.01
        }).on('change', applyOnboardingCRT);
        
        crtFolder.addInput(onboardingCRT, 'glitchAmount', {
            label: 'Glitch Amount', min: 0, max: 1, step: 0.01
        }).on('change', applyOnboardingCRT);
        
        // Utility buttons
        crtFolder.addButton({ title: '↺ Copy from Scene Viewer' }).on('click', () => {
            if (typeof CRTShader !== 'undefined' && CRTShader.config) {
                const c = CRTShader.config;
                onboardingCRT.brightness = c.brightness;
                onboardingCRT.contrast = c.contrast;
                onboardingCRT.scanlineIntensity = c.scanlineIntensity;
                onboardingCRT.noiseIntensity = c.noiseIntensity;
                onboardingCRT.vignetteStrength = c.vignetteStrength;
                onboardingCRT.shimmerIntensity = c.shimmerIntensity;
                onboardingCRT.unrealBloomEnabled = c.unrealBloomEnabled;
                onboardingCRT.unrealBloomStrength = c.unrealBloomStrength;
                onboardingCRT.unrealBloomRadius = c.unrealBloomRadius;
                onboardingCRT.chromaticAberration = c.chromaticAberration;
                onboardingCRT.barrelDistortion = c.barrelDistortion;
                onboardingCRT.barrelZoom = c.barrelZoom;
                onboardingCRT.phosphorMaskIntensity = c.phosphorMaskIntensity;
                onboardingCRT.glitchAmount = c.glitchAmount;
                applyOnboardingCRT();
                pane.refresh();
            }
        });
        
        crtFolder.addButton({ title: '🖥️ Use Clean Preset' }).on('click', () => {
            // A cleaner preset for onboarding readability
            onboardingCRT.brightness = 1.1;
            onboardingCRT.contrast = 1.0;
            onboardingCRT.scanlineIntensity = 0.01;
            onboardingCRT.noiseIntensity = 0.0;
            onboardingCRT.vignetteStrength = 0.3;
            onboardingCRT.shimmerIntensity = 0.0;
            onboardingCRT.unrealBloomEnabled = true;
            onboardingCRT.unrealBloomStrength = 0.5;
            onboardingCRT.unrealBloomRadius = 0.3;
            onboardingCRT.chromaticAberration = 0.001;
            onboardingCRT.barrelDistortion = 0.05;
            onboardingCRT.barrelZoom = 1.02;
            onboardingCRT.phosphorMaskIntensity = 0.05;
            onboardingCRT.glitchAmount = 0.0;
            applyOnboardingCRT();
            pane.refresh();
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // PRESETS SECTION
    // ═══════════════════════════════════════════════════════════════════════
    
    function buildPresetsSection() {
        if (typeof CRTShader === 'undefined') return;
        
        const config = CRTShader.config;
        const folder = pane.addFolder({ title: '🎨 Presets', expanded: false });
        
        // Terminal color presets
        const colorFolder = folder.addFolder({ title: 'Terminal Colors', expanded: false });
        
        colorFolder.addButton({ title: 'Amber Terminal' }).on('click', () => {
            config.tintColor = { r: 255, g: 170, b: 0 };
            config.tintStrength = 1.0;
            pane.refresh();
        });
        
        colorFolder.addButton({ title: 'Green Terminal' }).on('click', () => {
            config.tintColor = { r: 0, g: 255, b: 100 };
            config.tintStrength = 1.0;
            pane.refresh();
        });
        
        colorFolder.addButton({ title: 'White Terminal' }).on('click', () => {
            config.tintColor = { r: 220, g: 220, b: 220 };
            config.tintStrength = 1.0;
            pane.refresh();
        });
        
        colorFolder.addButton({ title: 'Full Color' }).on('click', () => {
            config.tintStrength = 0.0;
            pane.refresh();
        });
        
        // CRT presets
        const crtFolder = folder.addFolder({ title: 'CRT Styles', expanded: false });
        
        crtFolder.addButton({ title: 'Authentic 80s' }).on('click', () => {
            config.barrelDistortion = 0.15;
            config.barrelZoom = 1.04;
            config.chromaticAberration = 0.004;
            config.phosphorMaskType = 1;
            config.phosphorMaskIntensity = 0.25;
            config.interlaceEnabled = true;
            config.scanlineIntensity = 0.1;
            pane.refresh();
        });
        
        crtFolder.addButton({ title: 'Arcade Monitor' }).on('click', () => {
            config.barrelDistortion = 0.08;
            config.chromaticAberration = 0.002;
            config.phosphorMaskType = 2;
            config.phosphorMaskIntensity = 0.2;
            config.scanlineIntensity = 0.08;
            pane.refresh();
        });
        
        crtFolder.addButton({ title: 'Clean Modern' }).on('click', () => {
            config.barrelDistortion = 0.05;
            config.chromaticAberration = 0.001;
            config.phosphorMaskType = 0;
            config.scanlineIntensity = 0.03;
            pane.refresh();
        });
        
        crtFolder.addButton({ title: 'Reset All CRT' }).on('click', () => {
            config.barrelDistortion = 0.1;
            config.barrelZoom = 1.02;
            config.chromaticAberration = 0.003;
            config.phosphorMaskType = 0;
            config.phosphorMaskIntensity = 0.15;
            config.interlaceEnabled = false;
            config.scanlineIntensity = 0.05;
            pane.refresh();
        });
        
        // Dice color presets
        const diceFolder = folder.addFolder({ title: 'Dice Colors', expanded: false });
        
        diceFolder.addButton({ title: 'Classic Blue' }).on('click', () => {
            diceConfig.themeColor = '#5e8cc9';
            if (typeof DiceManager !== 'undefined') DiceManager.setColor('#5e8cc9');
            pane.refresh();
        });
        
        diceFolder.addButton({ title: 'Blood Red' }).on('click', () => {
            diceConfig.themeColor = '#c94040';
            if (typeof DiceManager !== 'undefined') DiceManager.setColor('#c94040');
            pane.refresh();
        });
        
        diceFolder.addButton({ title: 'Emerald' }).on('click', () => {
            diceConfig.themeColor = '#40c970';
            if (typeof DiceManager !== 'undefined') DiceManager.setColor('#40c970');
            pane.refresh();
        });
        
        diceFolder.addButton({ title: 'Royal Purple' }).on('click', () => {
            diceConfig.themeColor = '#9040c9';
            if (typeof DiceManager !== 'undefined') DiceManager.setColor('#9040c9');
            pane.refresh();
        });
        
        diceFolder.addButton({ title: 'Gold' }).on('click', () => {
            diceConfig.themeColor = '#c9a040';
            if (typeof DiceManager !== 'undefined') DiceManager.setColor('#c9a040');
            pane.refresh();
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // EXPORT SECTION
    // ═══════════════════════════════════════════════════════════════════════
    
    function buildExportSection() {
        const folder = pane.addFolder({ title: '💾 Export', expanded: false });
        
        folder.addButton({ title: 'Copy Settings to Console' }).on('click', () => {
            const settings = {
                dice: diceConfig,
                terminal: terminalConfig
            };
            if (typeof CRTShader !== 'undefined') {
                settings.sceneViewer = CRTShader.config;
            }
            console.log('=== Light Deck Settings ===');
            console.log(JSON.stringify(settings, null, 2));
            console.log('===========================');
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // VISIBILITY
    // ═══════════════════════════════════════════════════════════════════════
    
    function toggle() {
        if (!pane) return;
        visible = !visible;
        pane.element.style.display = visible ? '' : 'none';
    }
    
    function show() {
        if (!pane) return;
        visible = true;
        pane.element.style.display = '';
    }
    
    function hide() {
        if (!pane) return;
        visible = false;
        pane.element.style.display = 'none';
    }
    
    function isVisible() {
        return visible;
    }
    
    function refresh() {
        if (pane) pane.refresh();
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════
    
    return {
        init,
        toggle,
        show,
        hide,
        isVisible,
        refresh,
        
        // Config access for external sync
        getDiceConfig: () => ({ ...diceConfig }),
        getTerminalConfig: () => ({ ...terminalConfig })
    };
})();

console.log('[SettingsUI] Module loaded');
