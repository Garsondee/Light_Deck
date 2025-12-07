/**
 * TerminalManager - Canvas-based terminal rendering
 * 
 * Replaces PhosphorText + DOM terminal with pure Three.js rendering.
 * All terminal content is rendered to a canvas texture.
 * 
 * Features:
 * - Canvas-based text rendering via TextRenderer
 * - Caret drawn as rectangle (not DOM element)
 * - Scrolling via texture offset
 * - Command history
 * - Boot sequence support
 */

const TerminalManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let initialized = false;
    let visible = false;
    let dirty = true;  // Needs re-render
    
    // Canvas and Three.js objects
    let canvas = null;
    let ctx = null;
    let config = null;
    let texture = null;
    let plane = null;

    const crtConfig = {
        barrelDistortion: 0.09,
        barrelZoom: 1.07
    };
    
    // Terminal content
    const state = {
        lines: [],              // Array of { text, type } - output lines
        inputBuffer: '',        // Current input being typed
        caretPosition: 0,       // Cursor position in inputBuffer
        scrollOffset: 0,        // Lines scrolled from bottom
        maxScrollback: 500,     // Max lines to keep in history
        
        // Command history
        commandHistory: [],
        historyIndex: -1,
        
        // Boot sequence
        bootStarted: false,
        bootComplete: false,
        bootInProgress: false,
        
        // Typewriter queue for boot sequence
        typewriterQueue: [],
        typewriterActive: null
    };
    
    // Layout configuration
    const layout = {
        width: 1024,            // Canvas width
        height: 768,            // Canvas height
        padding: 20,            // Edge padding
        fontSize: 16,
        lineHeight: 1.4,
        fontFamily: 'IBM Plex Mono, Courier New, monospace',
        prompt: '> ',
        maxVisibleLines: 0      // Calculated on init
    };
    
    // Command handlers
    const commandHandlers = new Map();
    
    /**
     * Detect if running in Playwright test mode via URL query param.
     * When testMode=1, boot sequence is skipped.
     */
    function isTestMode() {
        try {
            if (typeof window === 'undefined' || !window.location || !window.location.search) return false;
            const params = new URLSearchParams(window.location.search);
            return params.get('testMode') === '1';
        } catch (err) {
            return false;
        }
    }
    
    const terminalVertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const terminalFragmentShader = `
        uniform sampler2D terminalTexture;
        uniform float barrelDistortion;
        uniform float barrelZoom;
        uniform float time;
        varying vec2 vUv;

        vec2 barrelDistort(vec2 uv, float amount) {
            if (amount == 0.0) return uv;
            vec2 cc = uv - 0.5;
            float dist = dot(cc, cc);
            return uv + cc * dist * amount;
        }

        vec2 applyBarrel(vec2 uv, float distort, float zoom) {
            vec2 centered = (uv - 0.5) * zoom;
            vec2 distorted = barrelDistort(centered + 0.5, distort);
            return distorted;
        }

        void main() {
            vec2 uv = applyBarrel(vUv, barrelDistortion, barrelZoom);
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                return;
            }
            vec4 color = texture2D(terminalTexture, uv);
            gl_FragColor = color;
        }
    `;

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Initialize the terminal manager
     * @param {THREE.Scene} scene - Three.js scene to add terminal plane to
     * @param {Object} options - Configuration options
     */
    function init(scene, options = {}) {
        if (initialized) {
            console.warn('[TerminalManager] Already initialized');
            return;
        }
        
        // Merge options with defaults
        Object.assign(layout, options);
        
        // Calculate max visible lines
        const lineHeightPx = layout.fontSize * layout.lineHeight;
        layout.maxVisibleLines = Math.floor(
            (layout.height - layout.padding * 2) / lineHeightPx
        );
        
        // Create canvas using TextRenderer
        const canvasResult = TextRenderer.createCanvas(layout.width, layout.height, {
            fontSize: layout.fontSize,
            lineHeight: layout.lineHeight,
            fontFamily: layout.fontFamily,
            phosphor: options.phosphor || 'p3',
            glowIntensity: options.glowIntensity ?? 0.8
        });
        
        canvas = canvasResult.canvas;
        ctx = canvasResult.ctx;
        config = canvasResult.config;
        
        // Create Three.js texture
        texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        // Determine target plane size from LayoutManager's main display rect
        // We use a slightly inset 4:3 content window to avoid clipping under the bezel.
        let planeWidth;
        let planeHeight;
        let targetX = 0;
        let targetY = 0;
        let targetZ = 0.1;
        
        if (typeof LayoutManager !== 'undefined' && LayoutManager.isInitialized && LayoutManager.isInitialized()) {
            const rect = LayoutManager.getMainDisplayRect();
            targetX = rect.x;
            targetY = rect.y;
            targetZ = rect.z + 0.1; // slightly in front of the CRT content

            // Match CRT scene viewer behavior: fit CRT plane directly to the full
            // main display hole so the black surround fills the bezel.
            const targetWidthMax = rect.width;
            const targetHeightMax = rect.height;

            // Maintain 4:3 aspect based on canvas layout (width/height)
            const aspect = layout.width / layout.height; // should be 4/3
            planeWidth = targetWidthMax;
            planeHeight = planeWidth / aspect;
            if (planeHeight > targetHeightMax) {
                planeHeight = targetHeightMax;
                planeWidth = planeHeight * aspect;
            }
        } else {
            // Fallback: 4:3 plane sized similarly to the scene plane
            const aspect = layout.width / layout.height;
            planeHeight = 2;
            planeWidth = planeHeight * aspect;
        }
        
        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                terminalTexture: { value: texture },
                barrelDistortion: { value: crtConfig.barrelDistortion },
                barrelZoom: { value: crtConfig.barrelZoom },
                time: { value: 0 }
            },
            vertexShader: terminalVertexShader,
            fragmentShader: terminalFragmentShader,
            transparent: true
        });

        plane = new THREE.Mesh(geometry, material);
        
        // Position plane at the target center (no additional scaling needed)
        plane.position.set(targetX, targetY, targetZ);
        plane.visible = false; // Start hidden
        
        if (scene) {
            scene.add(plane);
        }
        
        // Register with AnimationManager for updates
        if (typeof AnimationManager !== 'undefined') {
            AnimationManager.register('terminal', update, { priority: 10 });
        }
        
        // Register default commands
        registerDefaultCommands();
        
        initialized = true;
        dirty = true;
        
        console.log('[TerminalManager] Initialized', {
            canvasSize: `${layout.width}x${layout.height}`,
            maxVisibleLines: layout.maxVisibleLines
        });
        
        return { canvas, texture, plane };
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UPDATE LOOP
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Update function called by AnimationManager each frame
     * @param {number} delta - Time since last frame in ms
     * @param {number} now - Current timestamp
     */
    function update(delta, now) {
        if (!initialized || !visible) return;
        
        // Process typewriter queue
        processTypewriter(delta, now);
        
        // Always re-render when visible so caret blink (driven by AnimationManager)
        // is reflected on the canvas, even when there is no new text.
        // Typewriter and input handlers will still mark dirty for content changes.
        dirty = true;
        
        // Re-render if dirty
        if (dirty) {
            render();
            dirty = false;
        }

        if (plane && plane.material && plane.material.uniforms) {
            plane.material.uniforms.time.value = now * 0.001;
            plane.material.uniforms.barrelDistortion.value = crtConfig.barrelDistortion;
            plane.material.uniforms.barrelZoom.value = crtConfig.barrelZoom;
        }
    }
    
    /**
     * Process typewriter effect queue
     */
    function processTypewriter(delta, now) {
        if (!state.typewriterActive && state.typewriterQueue.length > 0) {
            state.typewriterActive = state.typewriterQueue.shift();
            state.typewriterActive.startTime = now;
            state.typewriterActive.charIndex = 0;
        }
        
        const active = state.typewriterActive;
        if (!active) return;
        
        const elapsed = now - active.startTime;
        const charDelay = 1000 / (active.speed || 50);  // chars per second
        const targetIndex = Math.floor(elapsed / charDelay);
        
        if (targetIndex > active.charIndex && active.charIndex < active.text.length) {
            // Add characters up to target
            const newChars = active.text.slice(active.charIndex, targetIndex);
            
            // Handle newlines
            const parts = newChars.split('\n');
            for (let i = 0; i < parts.length; i++) {
                if (i > 0) {
                    // Start new line
                    addLine(active.currentLine || '', active.type || 'output');
                    active.currentLine = '';
                }
                active.currentLine = (active.currentLine || '') + parts[i];
            }
            
            active.charIndex = targetIndex;
            dirty = true;
            
            // Update the last line being typed
            if (state.lines.length > 0 && active.currentLine) {
                state.lines[state.lines.length - 1].text = active.currentLine;
            }
        }
        
        if (active.charIndex >= active.text.length) {
            // Typing complete
            if (active.currentLine) {
                // Ensure final line is added
                if (state.lines.length === 0 || 
                    state.lines[state.lines.length - 1].text !== active.currentLine) {
                    addLine(active.currentLine, active.type || 'output');
                }
            }
            
            if (active.callback) {
                active.callback();
            }
            
            state.typewriterActive = null;
            dirty = true;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Render terminal content to canvas
     */
    function render() {
        if (!ctx || !config) return;
        
        // Clear canvas
        TextRenderer.clear(ctx, config, '#0a0a0a');
        
        const lineHeightPx = layout.fontSize * layout.lineHeight;
        const x = layout.padding;
        let y = layout.padding;
        
        // Calculate which lines to show
        const totalLines = state.lines.length + 1;  // +1 for input line
        const startLine = Math.max(0, totalLines - layout.maxVisibleLines - state.scrollOffset);
        const endLine = Math.min(state.lines.length, startLine + layout.maxVisibleLines);
        
        // Render output lines
        for (let i = startLine; i < endLine; i++) {
            const line = state.lines[i];
            const options = getLineOptions(line.type);
            TextRenderer.renderLine(ctx, line.text, x, y, config, options);
            y += lineHeightPx;
        }
        
        // Render input line (if not scrolled up and boot complete)
        if (state.scrollOffset === 0 && state.bootComplete) {
            const inputText = layout.prompt + state.inputBuffer;
            TextRenderer.renderLine(ctx, inputText, x, y, config);
            
            // Render caret
            const caretIntensity = AnimationManager ? AnimationManager.getCaretIntensity() : 1.0;
            const promptWidth = TextRenderer.measureText(ctx, layout.prompt, config);
            const textBeforeCaret = state.inputBuffer.slice(0, state.caretPosition);
            const textWidth = TextRenderer.measureText(ctx, textBeforeCaret, config);
            const caretX = x + promptWidth + textWidth;
            
            TextRenderer.renderCaret(ctx, caretX, y, caretIntensity, config);
        }
        
        // Render scroll indicator if scrolled
        if (state.scrollOffset > 0) {
            const indicator = `[${state.scrollOffset} lines above]`;
            TextRenderer.renderLine(ctx, indicator, x, layout.height - layout.padding - lineHeightPx, config, {
                phosphorColors: TextRenderer.PHOSPHOR_PRESETS.p3,
                glowIntensity: 0.3
            });
        }
        
        // Update texture
        if (texture) {
            texture.needsUpdate = true;
        }
    }
    
    /**
     * Get rendering options based on line type
     */
    function getLineOptions(type) {
        switch (type) {
            case 'error':
                return {
                    phosphorColors: {
                        primary: '#ff4444',
                        glow: '#ff0000',
                        dim: '#440000'
                    }
                };
            case 'system':
                return {
                    phosphorColors: TextRenderer.PHOSPHOR_PRESETS.p1,  // Green
                    glowIntensity: 0.6
                };
            case 'command':
                return {
                    glowIntensity: 1.0
                };
            default:
                return {};
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // CONTENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Add a line to the terminal output
     * @param {string} text - Line text
     * @param {string} type - Line type ('output', 'command', 'error', 'system')
     */
    function addLine(text, type = 'output') {
        state.lines.push({ text, type, timestamp: Date.now() });
        
        // Trim scrollback if needed
        while (state.lines.length > state.maxScrollback) {
            state.lines.shift();
        }
        
        // Reset scroll to bottom
        state.scrollOffset = 0;
        dirty = true;
    }
    
    /**
     * Clear the terminal
     */
    function clear() {
        state.lines = [];
        state.scrollOffset = 0;
        dirty = true;
    }
    
    /**
     * Queue text for typewriter effect
     * @param {string} text - Text to type
     * @param {Object} options - Typewriter options
     */
    function typewrite(text, options = {}) {
        return new Promise((resolve) => {
            // Add empty line to type into
            addLine('', options.type || 'output');
            
            state.typewriterQueue.push({
                text,
                type: options.type || 'output',
                speed: options.speed || 50,
                currentLine: '',
                callback: resolve
            });
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // INPUT HANDLING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Handle a character input
     * @param {string} char - Character to insert
     */
    function handleChar(char) {
        if (!state.bootComplete) return;
        
        // Insert character at caret position
        state.inputBuffer = 
            state.inputBuffer.slice(0, state.caretPosition) +
            char +
            state.inputBuffer.slice(state.caretPosition);
        state.caretPosition++;
        
        // Reset caret blink
        if (typeof AnimationManager !== 'undefined') {
            AnimationManager.resetCaretPhase();
        }
        
        dirty = true;
    }
    
    /**
     * Handle a special key
     * @param {string} key - Key name
     * @param {Object} modifiers - { ctrl, shift, alt }
     * @returns {boolean} - True if key was handled
     */
    function handleKey(key, modifiers = {}) {
        if (!state.bootComplete && key !== 'Escape') return false;
        
        switch (key) {
            case 'Enter':
                submitCommand();
                return true;
                
            case 'Backspace':
                if (state.caretPosition > 0) {
                    state.inputBuffer = 
                        state.inputBuffer.slice(0, state.caretPosition - 1) +
                        state.inputBuffer.slice(state.caretPosition);
                    state.caretPosition--;
                    dirty = true;
                }
                return true;
                
            case 'Delete':
                if (state.caretPosition < state.inputBuffer.length) {
                    state.inputBuffer = 
                        state.inputBuffer.slice(0, state.caretPosition) +
                        state.inputBuffer.slice(state.caretPosition + 1);
                    dirty = true;
                }
                return true;
                
            case 'ArrowLeft':
                if (state.caretPosition > 0) {
                    state.caretPosition--;
                    dirty = true;
                }
                return true;
                
            case 'ArrowRight':
                if (state.caretPosition < state.inputBuffer.length) {
                    state.caretPosition++;
                    dirty = true;
                }
                return true;
                
            case 'ArrowUp':
                navigateHistory(-1);
                return true;
                
            case 'ArrowDown':
                navigateHistory(1);
                return true;
                
            case 'Home':
                if (modifiers.ctrl) {
                    // Scroll to top
                    state.scrollOffset = Math.max(0, state.lines.length - layout.maxVisibleLines);
                } else {
                    state.caretPosition = 0;
                }
                dirty = true;
                return true;
                
            case 'End':
                if (modifiers.ctrl) {
                    // Scroll to bottom
                    state.scrollOffset = 0;
                } else {
                    state.caretPosition = state.inputBuffer.length;
                }
                dirty = true;
                return true;
                
            case 'PageUp':
                scrollUp(layout.maxVisibleLines - 2);
                return true;
                
            case 'PageDown':
                scrollDown(layout.maxVisibleLines - 2);
                return true;
                
            case 'c':
                if (modifiers.ctrl) {
                    // Cancel current input
                    addLine(layout.prompt + state.inputBuffer + '^C', 'command');
                    state.inputBuffer = '';
                    state.caretPosition = 0;
                    dirty = true;
                    return true;
                }
                break;
                
            case 'l':
                if (modifiers.ctrl) {
                    clear();
                    return true;
                }
                break;
        }
        
        return false;
    }
    
    /**
     * Submit the current command
     */
    function submitCommand() {
        const command = state.inputBuffer.trim();
        
        // Add command to output
        addLine(layout.prompt + state.inputBuffer, 'command');
        
        // Add to history
        if (command) {
            state.commandHistory.push(command);
            state.historyIndex = state.commandHistory.length;
        }
        
        // Clear input
        state.inputBuffer = '';
        state.caretPosition = 0;
        
        // Execute command
        if (command) {
            executeCommand(command);
        }
        
        dirty = true;
    }
    
    /**
     * Navigate command history
     */
    function navigateHistory(direction) {
        if (state.commandHistory.length === 0) return;
        
        state.historyIndex += direction;
        
        if (state.historyIndex < 0) {
            state.historyIndex = 0;
        } else if (state.historyIndex >= state.commandHistory.length) {
            state.historyIndex = state.commandHistory.length;
            state.inputBuffer = '';
        } else {
            state.inputBuffer = state.commandHistory[state.historyIndex];
        }
        
        state.caretPosition = state.inputBuffer.length;
        dirty = true;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SCROLLING
    // ═══════════════════════════════════════════════════════════════════
    
    function scrollUp(lines = 1) {
        const maxScroll = Math.max(0, state.lines.length - layout.maxVisibleLines);
        state.scrollOffset = Math.min(maxScroll, state.scrollOffset + lines);
        dirty = true;
    }
    
    function scrollDown(lines = 1) {
        state.scrollOffset = Math.max(0, state.scrollOffset - lines);
        dirty = true;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // COMMAND SYSTEM
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Register a command handler
     * @param {string} name - Command name
     * @param {Function} handler - Handler function(args, terminal)
     * @param {Object} meta - Command metadata { description, usage }
     */
    function registerCommand(name, handler, meta = {}) {
        commandHandlers.set(name.toLowerCase(), { handler, meta });
    }
    
    /**
     * Execute a command
     */
    function executeCommand(input) {
        const parts = input.trim().split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        const cmd = commandHandlers.get(command);
        if (cmd) {
            try {
                cmd.handler(args, TerminalManager);
            } catch (error) {
                addLine(`Error: ${error.message}`, 'error');
            }
        } else {
            // Try OnboardingManager.handleInput for raw input (e.g., number selections)
            if (typeof OnboardingManager !== 'undefined' && OnboardingManager.handleInput) {
                const handled = OnboardingManager.handleInput(input.trim());
                if (handled) return;
            }
            
            addLine(`Unknown command: ${command}`, 'error');
            addLine('Type "help" for available commands.', 'system');
        }
    }
    
    /**
     * Register default commands
     */
    function registerDefaultCommands() {
        registerCommand('help', (args) => {
            addLine('Available commands:', 'system');
            commandHandlers.forEach((cmd, name) => {
                const desc = cmd.meta.description || 'No description';
                addLine(`  ${name.padEnd(12)} - ${desc}`, 'output');
            });
        }, { description: 'Show available commands' });
        
        registerCommand('clear', () => {
            clear();
        }, { description: 'Clear the terminal' });
        
        registerCommand('echo', (args) => {
            addLine(args.join(' '), 'output');
        }, { description: 'Echo text to terminal' });
        
        registerCommand('history', () => {
            state.commandHistory.forEach((cmd, i) => {
                addLine(`${(i + 1).toString().padStart(4)}  ${cmd}`, 'output');
            });
        }, { description: 'Show command history' });
        
        registerCommand('exit', () => {
            // During onboarding, 'exit' cancels onboarding instead of exiting terminal
            if (typeof OnboardingManager !== 'undefined' && OnboardingManager.isActive()) {
                OnboardingManager.cancel();
                return;
            }
            // Emit event to exit terminal mode
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('terminal:exit');
            }
        }, { description: 'Exit terminal mode' });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // VISIBILITY
    // ═══════════════════════════════════════════════════════════════════
    
    function show() {
        visible = true;
        if (plane) plane.visible = true;
        dirty = true;
        
        // Hide the scene plane (ASCII art background)
        if (typeof ThreeSetup !== 'undefined') {
            const scenePlane = ThreeSetup.getScenePlane();
            if (scenePlane) {
                scenePlane.visible = false;
            }
        }
        console.log('[TerminalManager] Shown');
    }
    
    function hide() {
        visible = false;
        if (plane) plane.visible = false;
        
        // Show the scene plane again
        if (typeof ThreeSetup !== 'undefined') {
            const scenePlane = ThreeSetup.getScenePlane();
            if (scenePlane) {
                scenePlane.visible = true;
            }
        }
        console.log('[TerminalManager] Hidden');
    }
    
    function isVisible() {
        return visible;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // BOOT SEQUENCE
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Run the terminal boot sequence
     */
    async function runBootSequence() {
        if (state.bootStarted) return;
        
        state.bootStarted = true;
        state.bootInProgress = true;
        state.bootComplete = false;
        
        show();
        clear();
        
        // In test mode, skip the boot animation entirely
        if (isTestMode()) {
            addLine('LIGHT DECK TERMINAL v2.1.4 (test mode)', 'output');
            addLine('Boot sequence skipped for tests.', 'system');
            addLine('', 'output');
            addLine('Type "help" for available commands.', 'system');
            state.bootInProgress = false;
            state.bootComplete = true;
            dirty = true;
            console.log('[TerminalManager] Boot sequence skipped (test mode)');
            return;
        }
        
        // Boot sequence text
        const bootLines = [
            { text: 'LIGHT DECK TERMINAL v2.1.4', speed: 80 },
            { text: '(c) 2157 Meridian Systems Corp.', speed: 60 },
            { text: '', speed: 100 },
            { text: 'Initializing neural interface...', speed: 40 },
            { text: '[OK] Cortex link established', speed: 50, type: 'system' },
            { text: '[OK] Encryption protocols active', speed: 50, type: 'system' },
            { text: '[OK] Secure channel verified', speed: 50, type: 'system' },
            { text: '', speed: 100 },
            { text: 'Welcome, Operator.', speed: 30 },
            { text: '', speed: 100 },
            { text: 'Type "help" for available commands.', speed: 40, type: 'system' }
        ];
        
        for (const line of bootLines) {
            if (line.text === '') {
                addLine('', 'output');
                await sleep(200);
            } else {
                await typewrite(line.text, { 
                    speed: line.speed || 50,
                    type: line.type || 'output'
                });
                await sleep(100);
            }
        }
        
        state.bootInProgress = false;
        state.bootComplete = true;
        dirty = true;
        
        console.log('[TerminalManager] Boot sequence complete');
    }
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        // Lifecycle
        init,
        show,
        hide,
        isVisible,
        
        // Content
        addLine,
        clear,
        typewrite,
        
        // Input
        handleChar,
        handleKey,
        
        // Scrolling
        scrollUp,
        scrollDown,
        
        // Commands
        registerCommand,
        executeCommand,
        
        // Boot
        runBootSequence,
        
        // State access
        getState: () => ({ ...state }),
        isBootComplete: () => state.bootComplete,
        isBootInProgress: () => state.bootInProgress,
        
        // Three.js objects
        getPlane: () => plane,
        getTexture: () => texture,
        getCanvas: () => canvas,
        getCRTConfig: () => crtConfig,
        setCRTConfig: (partial) => {
            if (!partial) return;
            if (typeof partial.barrelDistortion === 'number') {
                crtConfig.barrelDistortion = partial.barrelDistortion;
            }
            if (typeof partial.barrelZoom === 'number') {
                crtConfig.barrelZoom = partial.barrelZoom;
            }
        }
    };
})();

console.log('[TerminalManager] Module loaded');
