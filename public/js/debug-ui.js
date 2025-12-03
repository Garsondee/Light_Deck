/**
 * Debug UI using Tweakpane
 * Floating panel for fine-tuning ASCII shader parameters
 */

const DebugUI = (function() {
    let pane;
    let asciiFolder, colorFolder, effectsFolder, glitchFolder;
    
    function init() {
        // Create Tweakpane instance
        pane = new Tweakpane.Pane({
            title: 'ASCII Shader Controls',
            expanded: true
        });
        
        // Position in top-left, above everything
        pane.element.style.position = 'fixed';
        pane.element.style.top = '10px';
        pane.element.style.left = '10px';
        pane.element.style.zIndex = '10000';
        
        const config = ASCIIShader.config;
        
        // === ASCII Settings ===
        asciiFolder = pane.addFolder({ title: 'ASCII', expanded: true });
        
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
        
        // === Bloom ===
        const bloomFolder = pane.addFolder({ title: 'Bloom', expanded: true });
        
        bloomFolder.addInput(config, 'bloomIntensity', {
            label: 'Intensity',
            min: 0, max: 1, step: 0.01
        });
        
        bloomFolder.addInput(config, 'bloomThreshold', {
            label: 'Threshold',
            min: 0, max: 1, step: 0.01
        });
        
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
            ASCIIShader.triggerGlitch(0.3, 200);
        });
        
        glitchFolder.addButton({ title: 'Trigger Glitch (Heavy)' }).on('click', () => {
            ASCIIShader.triggerGlitch(0.8, 500);
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
        
        // Toggle visibility with backtick key
        document.addEventListener('keydown', (e) => {
            if (e.key === '`') {
                toggleVisibility();
            }
        });
        
        console.log('[DEBUG UI] Initialized. Press ` to toggle visibility.');
        return pane;
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
