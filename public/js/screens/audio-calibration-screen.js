/**
 * AudioCalibrationScreen - Audio volume calibration with visual controls
 * 
 * Features:
 * - Music volume slider with +/- buttons
 * - SFX volume slider with +/- buttons
 * - Test SFX button
 * - Real-time audio visualizer
 * - Terminal command support
 */

const AudioCalibrationScreen = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let form = null;
    let audioContext = null;
    let analyser = null;
    let dataArray = null;
    let visualizerBars = [];
    
    const state = {
        musicVolume: 50,
        sfxVolume: 70,
        testTrackPlaying: false,
        
        // Callbacks
        onComplete: null,
        onVolumeChange: null
    };
    
    // Visualizer configuration
    const visualizer = {
        barCount: 32,
        barChars: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'],
        smoothing: 0.8,
        values: []
    };
    
    // Style
    const style = {
        fontFamily: 'IBM Plex Mono, Courier New, monospace',
        fontSize: 16,
        lineHeight: 1.4,
        textColor: '#ffaa00',
        dimColor: '#885500',
        highlightColor: '#ffcc44',
        backgroundColor: '#0a0a0a'
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create a new audio calibration screen instance
     */
    function create(options = {}) {
        state.onComplete = options.onComplete || null;
        state.onVolumeChange = options.onVolumeChange || null;
        state.musicVolume = options.musicVolume || 50;
        state.sfxVolume = options.sfxVolume || 70;
        
        return {
            enter,
            exit,
            update,
            render,
            needsRender,
            handleClick,
            handleMouseMove,
            handleKeyDown,
            handleCommand,
            
            // State access
            getMusicVolume: () => state.musicVolume,
            getSfxVolume: () => state.sfxVolume
        };
    }
    
    /**
     * Called when screen becomes active
     */
    function enter() {
        console.log('[AudioCalibrationScreen] Entered');
        
        // Create form
        createForm();
        
        // Initialize audio visualizer
        initVisualizer();
        
        // Start playing test music
        startTestMusic();
    }
    
    /**
     * Called when leaving screen
     */
    function exit() {
        console.log('[AudioCalibrationScreen] Exited');
        
        // Stop test music
        stopTestMusic();
        
        // Clean up visualizer
        if (audioContext) {
            // Don't close - might be shared
        }
    }
    
    /**
     * Create the form elements
     */
    function createForm() {
        form = ASCIIFormRenderer.createForm({
            style: {
                ...style
            }
        });
        
        // Title
        ASCIIFormRenderer.addLabel(form, {
            id: 'title',
            text: '═══════════════════════════════════════════════════════',
            x: 2,
            y: 2
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'title2',
            text: '  AUDIO CONFIGURATION',
            x: 2,
            y: 3
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'title3',
            text: '═══════════════════════════════════════════════════════',
            x: 2,
            y: 4
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'subtitle',
            text: 'Adjust your audio levels. Music is playing for reference.',
            x: 2,
            y: 6,
            dim: true
        });
        
        // Music volume slider (10% increments)
        ASCIIFormRenderer.addSlider(form, {
            id: 'music_volume',
            label: 'Music Volume:  ',
            x: 2,
            y: 9,
            width: 10,
            min: 0,
            max: 100,
            value: state.musicVolume,
            step: 10,
            showValue: true,
            onChange: (value) => {
                state.musicVolume = value;
                applyMusicVolume(value);
                if (state.onVolumeChange) {
                    state.onVolumeChange('music', value);
                }
            }
        });
        
        // SFX volume slider (10% increments)
        ASCIIFormRenderer.addSlider(form, {
            id: 'sfx_volume',
            label: 'SFX Volume:    ',
            x: 2,
            y: 11,
            width: 10,
            min: 0,
            max: 100,
            value: state.sfxVolume,
            step: 10,
            showValue: true,
            onChange: (value) => {
                state.sfxVolume = value;
                applySfxVolume(value);
                if (state.onVolumeChange) {
                    state.onVolumeChange('sfx', value);
                }
            }
        });
        
        // Test SFX button
        ASCIIFormRenderer.addButton(form, {
            id: 'test_sfx',
            text: 'TEST SFX',
            x: 2,
            y: 14,
            onClick: () => {
                playTestSfx();
            }
        });
        
        // Divider before visualizer
        ASCIIFormRenderer.addDivider(form, {
            id: 'divider1',
            x: 2,
            y: 17,
            width: 55
        });
        
        // Visualizer label
        ASCIIFormRenderer.addLabel(form, {
            id: 'viz_label',
            text: 'Audio Visualizer:',
            x: 2,
            y: 18,
            dim: true
        });
        
        // Terminal hint
        ASCIIFormRenderer.addDivider(form, {
            id: 'divider2',
            x: 2,
            y: 24,
            width: 55
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'terminal_hint',
            text: 'Terminal: music <0-100> | sfx <0-100> | test',
            x: 2,
            y: 25,
            dim: true
        });
        
        // Continue button
        ASCIIFormRenderer.addButton(form, {
            id: 'continue',
            text: 'CONTINUE',
            x: 45,
            y: 28,
            onClick: () => {
                complete();
            }
        });
        
        // Focus first interactive element
        ASCIIFormRenderer.focusNext(form);
    }
    
    /**
     * Initialize the audio visualizer
     */
    function initVisualizer() {
        // Initialize bar values
        visualizer.values = new Array(visualizer.barCount).fill(0);
        
        // Try to get audio context from Audio manager
        if (typeof Audio !== 'undefined' && Audio.getAudioContext) {
            audioContext = Audio.getAudioContext();
            
            if (audioContext) {
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 64;
                analyser.smoothingTimeConstant = visualizer.smoothing;
                
                dataArray = new Uint8Array(analyser.frequencyBinCount);
                
                // Connect to audio source if available
                if (Audio.connectAnalyser) {
                    Audio.connectAnalyser(analyser);
                }
            }
        }
    }
    
    /**
     * Update visualizer data
     */
    function updateVisualizer() {
        if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray);
            
            // Map frequency data to bar values
            const step = Math.floor(dataArray.length / visualizer.barCount);
            for (let i = 0; i < visualizer.barCount; i++) {
                const value = dataArray[i * step] / 255;
                // Smooth the transition
                visualizer.values[i] = visualizer.values[i] * 0.7 + value * 0.3;
            }
        } else {
            // Fake visualizer when no audio context
            const time = performance.now() / 1000;
            for (let i = 0; i < visualizer.barCount; i++) {
                const wave = Math.sin(time * 2 + i * 0.3) * 0.3 + 0.3;
                const noise = Math.random() * 0.2;
                visualizer.values[i] = visualizer.values[i] * 0.8 + (wave + noise) * 0.2;
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // AUDIO CONTROL
    // ═══════════════════════════════════════════════════════════════════
    
    function startTestMusic() {
        if (typeof Audio !== 'undefined') {
            Audio.loadTrackList().then(() => {
                const tracks = Audio.getTracks();
                if (tracks.length > 0) {
                    const testTrack = tracks.find(t => 
                        t.name && t.name.includes('synthwave')
                    ) || tracks[0];
                    
                    Audio.play(testTrack.id, true);
                    applyMusicVolume(state.musicVolume);
                    state.testTrackPlaying = true;
                    console.log('[AudioCalibrationScreen] Playing:', testTrack.name);
                }
            });
        }
    }
    
    function stopTestMusic() {
        if (state.testTrackPlaying && typeof Audio !== 'undefined') {
            Audio.stop();
            state.testTrackPlaying = false;
        }
    }
    
    function applyMusicVolume(value) {
        if (typeof Audio !== 'undefined') {
            Audio.setMusicVolume(value / 100);
        }
    }
    
    function applySfxVolume(value) {
        if (typeof Audio !== 'undefined' && Audio.setSfxVolume) {
            Audio.setSfxVolume(value / 100);
        }
    }
    
    function playTestSfx() {
        if (typeof Audio !== 'undefined' && Audio.SFX) {
            const sfxNames = ['beep', 'keystroke', 'errorBuzz', 'glitchCrackle'];
            const sfxName = sfxNames[Math.floor(Math.random() * sfxNames.length)];
            
            if (typeof Audio.SFX[sfxName] === 'function') {
                Audio.SFX[sfxName]();
                
                // Add log message
                if (typeof OnboardingScreenManager !== 'undefined') {
                    OnboardingScreenManager.addLogLine(`Playing: ${sfxName}`, 'system');
                }
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UPDATE & RENDER
    // ═══════════════════════════════════════════════════════════════════
    
    function update(dt) {
        updateVisualizer();
    }
    
    function needsRender() {
        return true;  // Visualizer always animates
    }
    
    function render(ctx, layout) {
        // Clear background
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(0, 0, layout.width, layout.height);
        
        // Render form
        if (form) {
            ASCIIFormRenderer.render(ctx, form, layout.padding || 40, layout.padding || 40);
        }
        
        // Render visualizer
        renderVisualizer(ctx, layout);
    }
    
    function renderVisualizer(ctx, layout) {
        const padding = layout.padding || 40;
        const x = padding + 2 * 10;  // Align with form
        const y = padding + 20 * style.fontSize * style.lineHeight;  // Below viz label
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.textBaseline = 'bottom';
        
        // Draw bars
        let barX = x;
        const barWidth = ctx.measureText('█').width + 2;
        
        for (let i = 0; i < visualizer.barCount; i++) {
            const value = visualizer.values[i];
            const barIndex = Math.floor(value * (visualizer.barChars.length - 1));
            const char = visualizer.barChars[Math.max(0, Math.min(barIndex, visualizer.barChars.length - 1))];
            
            // Color based on intensity
            const intensity = Math.floor(value * 255);
            ctx.fillStyle = `rgb(${155 + intensity * 0.4}, ${100 + intensity * 0.3}, 0)`;
            
            ctx.fillText(char, barX, y);
            barX += barWidth;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // INPUT HANDLING
    // ═══════════════════════════════════════════════════════════════════
    
    function handleClick(x, y) {
        if (!form) return false;
        
        // Adjust for padding
        const padding = 40;
        return ASCIIFormRenderer.handleClick(form, x, y);
    }
    
    function handleMouseMove(x, y) {
        if (!form) return 'default';
        return ASCIIFormRenderer.handleMouseMove(form, x, y);
    }
    
    function handleKeyDown(event) {
        if (!form) return false;
        return ASCIIFormRenderer.handleKeyDown(form, event);
    }
    
    function handleCommand(cmd, args) {
        switch (cmd) {
            case 'music':
                const musicVol = parseInt(args[0]);
                if (!isNaN(musicVol)) {
                    state.musicVolume = Math.max(0, Math.min(100, musicVol));
                    ASCIIFormRenderer.setValue(form, 'music_volume', state.musicVolume);
                    applyMusicVolume(state.musicVolume);
                    
                    if (typeof OnboardingScreenManager !== 'undefined') {
                        OnboardingScreenManager.addLogLine(`Music volume: ${state.musicVolume}%`, 'system');
                    }
                    return true;
                }
                break;
                
            case 'sfx':
                const sfxVol = parseInt(args[0]);
                if (!isNaN(sfxVol)) {
                    state.sfxVolume = Math.max(0, Math.min(100, sfxVol));
                    ASCIIFormRenderer.setValue(form, 'sfx_volume', state.sfxVolume);
                    applySfxVolume(state.sfxVolume);
                    
                    if (typeof OnboardingScreenManager !== 'undefined') {
                        OnboardingScreenManager.addLogLine(`SFX volume: ${state.sfxVolume}%`, 'system');
                    }
                    return true;
                }
                break;
                
            case 'test':
                playTestSfx();
                return true;
                
            case 'continue':
            case 'next':
                complete();
                return true;
        }
        
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // COMPLETION
    // ═══════════════════════════════════════════════════════════════════
    
    function complete() {
        console.log('[AudioCalibrationScreen] Complete');
        
        if (state.onComplete) {
            state.onComplete({
                musicVolume: state.musicVolume,
                sfxVolume: state.sfxVolume
            });
        }
        
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:audio_complete', {
                musicVolume: state.musicVolume,
                sfxVolume: state.sfxVolume
            });
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        create,
        
        // Direct use
        enter,
        exit,
        update,
        render,
        needsRender,
        handleClick,
        handleMouseMove,
        handleKeyDown,
        handleCommand,
        
        // State
        getMusicVolume: () => state.musicVolume,
        getSfxVolume: () => state.sfxVolume
    };
    
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioCalibrationScreen;
}
