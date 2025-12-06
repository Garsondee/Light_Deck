/**
 * ChatManager - Canvas-based chat log rendering
 * 
 * Replaces DOM chat log with pure Three.js rendering.
 * All chat content is rendered to a canvas texture with phosphor effects.
 * 
 * Features:
 * - Canvas-based text rendering via TextRenderer
 * - Scrolling via texture offset
 * - Message history with timestamps
 * - Different message types (system, player, roll, error)
 * - Clickable text elements for dice and commands
 */

const ChatManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let initialized = false;
    let visible = true;
    let dirty = true;
    
    // Canvas and Three.js objects
    let canvas = null;
    let ctx = null;
    let config = null;
    let texture = null;
    let plane = null;
    
    // Chat content
    const state = {
        messages: [],           // Array of { text, type, timestamp, elements }
        scrollOffset: 0,        // Lines scrolled from bottom
        maxMessages: 200,       // Max messages to keep
        inputBuffer: '',        // Current input being typed
        inputActive: false,     // Whether input line is focused
        caretPosition: 0,       // Cursor position in input
        
        // Command history
        commandHistory: [],
        historyIndex: -1,
        
        // Control bar state
        controlBarFocused: false,   // Whether control bar has keyboard focus
        selectedControlIndex: -1,   // Currently selected control (-1 = none)
        headerMode: 'controls',     // 'controls' or 'sliders'
        selectedSliderIndex: 0      // Which slider is selected in effects bar
    };
    
    // Control bar configuration
    const controlBar = {
        controls: [
            // OPTIONS starts active/green to match the default DebugUI state
            { id: 'options', label: 'OPTIONS', active: true },
            { id: 'gmMode', label: 'GM MODE', active: false },
            { id: 'terminal', label: 'TERMINAL', active: false }
        ],
        // Clickable regions (populated during render)
        regions: []
    };
    
    // Effects slider bar configuration (brightness / contrast / effects)
    const effectsBar = {
        sliders: [
            // Use 8 discrete steps so sliders fit comfortably under the header
            { id: 'brightness', label: 'BRT', min: 0.5, max: 1.5, steps: 8, level: 4 },
            { id: 'contrast', label: 'CON', min: 0.5, max: 1.5, steps: 8, level: 4 },
            { id: 'effects', label: 'FX', min: 0.0, max: 1.0, steps: 8, level: 8 }
        ],
        regions: []
    };
    
    // Layout configuration
    const layout = {
        width: 320,             // Canvas width (pixels for texture)
        height: 800,            // Canvas height (tall for full vertical)
        padding: 10,            // Edge padding
        fontSize: 15,           // Larger text
        lineHeight: 1.35,
        fontFamily: 'IBM Plex Mono, Courier New, monospace',
        prompt: '> ',
        maxVisibleLines: 0,     // Calculated on init
        
        // Position calculated dynamically based on viewport
        // These are set in init() based on camera frustum
        position: { x: 0, y: 0, z: 0.05 },
        scale: { x: 1, y: 1 }   // Set dynamically
    };
    
    // Clickable elements (for raycasting)
    const clickableElements = [];
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Initialize the chat manager
     * @param {THREE.Scene} scene - Three.js scene to add chat plane to
     * @param {Object} options - Configuration options
     */
    function init(scene, options = {}) {
        if (initialized) {
            console.warn('[ChatManager] Already initialized');
            return;
        }
        
        // Merge options with defaults
        Object.assign(layout, options);
        
        // Get position and size from LayoutManager (single source of truth)
        let planeWidth = 0.5;
        let planeHeight = 2.0;
        let posX = 1.5;
        let posY = 0;
        let posZ = 0.05;
        
        if (typeof LayoutManager !== 'undefined' && LayoutManager.isInitialized()) {
            const rect = LayoutManager.getChatPanelRect();
            planeWidth = rect.width;
            planeHeight = rect.height;
            posX = rect.x;
            posY = rect.y;
            posZ = rect.z;
            console.log('[ChatManager] Using LayoutManager:', rect);
        } else {
            console.warn('[ChatManager] LayoutManager not available, using defaults');
        }
        
        layout.scale.x = planeWidth;
        layout.scale.y = planeHeight;
        layout.position.x = posX;
        layout.position.y = posY;
        layout.position.z = posZ;
        
        // CRITICAL: Match canvas aspect ratio to plane aspect ratio to prevent stretching
        const planeAspect = planeWidth / planeHeight;
        const canvasHeight = 800;
        const canvasWidth = Math.round(canvasHeight * planeAspect);
        
        layout.width = canvasWidth;
        layout.height = canvasHeight;
        
        console.log('[ChatManager] Canvas:', canvasWidth, 'x', canvasHeight, 
                    'Plane aspect:', planeAspect.toFixed(3));
        
        // Calculate max visible lines based on final canvas size
        const lineHeightPx = layout.fontSize * layout.lineHeight;
        layout.maxVisibleLines = Math.floor(
            (layout.height - layout.padding * 3 - lineHeightPx) / lineHeightPx
        );
        
        // Create canvas using TextRenderer with calculated dimensions
        const canvasResult = TextRenderer.createCanvas(layout.width, layout.height, {
            phosphor: options.phosphor || 'p3',
            fontSize: layout.fontSize,
            glowIntensity: options.glowIntensity || 0.9
        });
        canvas = canvasResult.canvas;
        ctx = canvasResult.ctx;
        config = canvasResult.config;
        
        // Create Three.js texture from the same canvas
        texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        // Create plane geometry
        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.95
        });
        
        plane = new THREE.Mesh(geometry, material);
        plane.position.set(layout.position.x, layout.position.y, layout.position.z);

        // Apply baked-in fine-tuning for chat panel layout
        // These values were dialed in via DebugUI and produced an ideal fit
        plane.position.x = 1.35;
        plane.position.y = 0.01;
        plane.scale.x = 0.95;
        plane.scale.y = 1.02;
        // Keep layout.position in sync so other systems querying it see the adjusted center
        layout.position.x = plane.position.x;
        layout.position.y = plane.position.y;
        plane.visible = true;
        
        // Store reference for raycasting
        plane.userData.manager = 'chat';
        
        if (scene) {
            scene.add(plane);
        }
        
        // Register with AnimationManager for updates
        if (typeof AnimationManager !== 'undefined') {
            AnimationManager.register('chat', update, { priority: 15 });
        }
        
        initialized = true;

        // Sync initial button states (e.g. OPTIONS starts active/green)
        if (typeof ControlPanelManager !== 'undefined' && typeof ControlPanelManager.setButtonState === 'function') {
            for (const ctrl of controlBar.controls) {
                ControlPanelManager.setButtonState(ctrl.id, ctrl.active);
            }
        }
        dirty = true;
        
        // Add initial system messages
        addMessage('system', 'SYSTEM LOG ONLINE');
        addMessage('system', 'Type /help for commands');
        addMessage('system', 'Type /roll 2d6 for dice');
        
        console.log('[ChatManager] Initialized', {
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
     */
    function update(delta, now) {
        if (!initialized || !visible) return;
        
        // Re-render if dirty or input is active (for caret blink)
        if (dirty || state.inputActive) {
            render();
            dirty = false;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Render chat content to canvas
     */
    function render() {
        if (!ctx || !config) return;
        
        // Clear canvas with semi-transparent background
        ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
        ctx.fillRect(0, 0, layout.width, layout.height);
        
        // Draw border
        ctx.strokeStyle = config.phosphorColors.dim;
        ctx.lineWidth = 1;
        ctx.strokeRect(1, 1, layout.width - 2, layout.height - 2);
        
        // Draw header with control bar and effects sliders
        const headerHeight = layout.fontSize * 3.2;
        ctx.fillStyle = config.phosphorColors.dim;
        ctx.fillRect(0, 0, layout.width, headerHeight);
        
        // Render control bar and effects bar
        renderControlBar(headerHeight);
        renderEffectsBar(headerHeight);
        
        // Clear clickable elements
        clickableElements.length = 0;
        
        const lineHeightPx = layout.fontSize * layout.lineHeight;
        const x = layout.padding;
        let y = headerHeight + layout.padding;
        
        // Calculate visible messages
        const visibleMessages = getVisibleMessages();
        
        // Render messages
        for (const msg of visibleMessages) {
            const options = getMessageOptions(msg.type);
            
            // Word wrap and render
            const lines = wrapText(msg.text, layout.width - layout.padding * 2);
            
            for (const line of lines) {
                if (y + lineHeightPx > layout.height - layout.padding * 2 - lineHeightPx) {
                    break; // Don't overflow into input area
                }
                
                // Check for clickable elements in this line
                const clickables = findClickableElements(line, x, y, lineHeightPx);
                clickableElements.push(...clickables);
                
                TextRenderer.renderLine(ctx, line, x, y, config, options);
                y += lineHeightPx;
            }
        }
        
        // Draw separator above input
        const inputY = layout.height - layout.padding - lineHeightPx;
        ctx.strokeStyle = config.phosphorColors.dim;
        ctx.beginPath();
        ctx.moveTo(layout.padding, inputY - 4);
        ctx.lineTo(layout.width - layout.padding, inputY - 4);
        ctx.stroke();
        
        // Render input line
        const inputText = layout.prompt + state.inputBuffer;
        TextRenderer.renderLine(ctx, inputText, x, inputY, config, {
            glowIntensity: state.inputActive ? 0.8 : 0.5
        });
        
        // Render caret if input is active
        if (state.inputActive) {
            const caretIntensity = AnimationManager ? AnimationManager.getCaretIntensity() : 1.0;
            const promptWidth = TextRenderer.measureText(ctx, layout.prompt, config);
            const textBeforeCaret = state.inputBuffer.slice(0, state.caretPosition);
            const textWidth = TextRenderer.measureText(ctx, textBeforeCaret, config);
            const caretX = x + promptWidth + textWidth;
            
            TextRenderer.renderCaret(ctx, caretX, inputY, caretIntensity, config, {
                caretWidth: layout.fontSize * 0.5,
                caretHeight: layout.fontSize
            });
        }
        
        // Render scroll indicator if scrolled
        if (state.scrollOffset > 0) {
            const indicator = `[↑ ${state.scrollOffset} more]`;
            TextRenderer.renderLine(ctx, indicator, layout.width - 100, headerHeight + 4, config, {
                fontSize: 10,
                glowIntensity: 0.3
            });
        }
        
        // Update texture
        if (texture) {
            texture.needsUpdate = true;
        }
    }
    
    /**
     * Render the control bar at the top of the chat panel
     */
    function renderControlBar(headerHeight) {
        // Clear regions
        controlBar.regions = [];
        
        const y = 4;
        const controlFontSize = layout.fontSize - 2;
        let x = layout.padding;
        
        // Render each control as [LABEL]
        for (let i = 0; i < controlBar.controls.length; i++) {
            const ctrl = controlBar.controls[i];
            const text = `[${ctrl.label}]`;
            const textWidth = TextRenderer.measureText(ctx, text, config);
            
            // Determine styling based on state
            const isSelected = state.selectedControlIndex === i;
            const isActive = ctrl.active;
            
            // Base intensity for idle controls (quite dim)
            let glowIntensity = 0.18;
            let colorOverride = null;
            
            if (isActive) {
                // Active state: very bright, using colored phosphor overrides
                glowIntensity = 1.25;
                colorOverride = ctrl.id === 'gmMode' 
                    ? { primary: '#ffaa00', glow: '#ff8800', dim: '#553300' }  // Amber for GM
                    : { primary: '#33ff66', glow: '#00ff44', dim: '#003311' }; // Green for others
            } else if (isSelected && state.controlBarFocused && state.headerMode === 'controls') {
                // Selected control when header row has focus: brighter than idle but below active
                glowIntensity = 0.9;
            } else if (isSelected) {
                // Selected but row not focused (e.g., sliders focused): subtle lift from idle
                glowIntensity = 0.45;
            }
            
            // Render the control text
            const options = {
                fontSize: controlFontSize,
                glowIntensity: glowIntensity
            };
            if (colorOverride) {
                options.phosphorColors = colorOverride;
            }
            
            TextRenderer.renderLine(ctx, text, x, y, config, options);
            
            // No underline: selection is communicated purely via brightness
            
            // Store clickable region
            controlBar.regions.push({
                index: i,
                id: ctrl.id,
                x: x,
                y: y,
                width: textWidth,
                height: controlFontSize + 4
            });
            
            // Slightly tighter spacing so all three controls fit comfortably
            x += textWidth + 4;
        }
    }
    
    /**
     * Render the effects slider bar (BRT / CON / FX)
     */
    function renderEffectsBar(headerHeight) {
        // Clear regions
        effectsBar.regions = [];
        
        const sliderFontSize = layout.fontSize - 3;
        const labelSpacing = 4;
        const barSpacing = 10;
        const filledChar = '█';
        const emptyChar = '░';
        
        // Place sliders on second line of header
        const y = 4 + (layout.fontSize - 2) + 8;
        let x = layout.padding;
        
        for (let i = 0; i < effectsBar.sliders.length; i++) {
            const slider = effectsBar.sliders[i];
            const steps = slider.steps;
            const level = Math.max(0, Math.min(steps, slider.level));
            const labelText = slider.label + '  ';
            const barText = '<' + filledChar.repeat(level) + emptyChar.repeat(steps - level) + '>';
            
            // Measure label and bar to compute regions
            const labelWidth = TextRenderer.measureText(ctx, labelText, config);
            const barWidth = TextRenderer.measureText(ctx, barText, config);
            
            // Render label
            TextRenderer.renderLine(ctx, labelText, x, y, config, {
                fontSize: sliderFontSize,
                glowIntensity: 0.5
            });
            
            const barX = x + labelWidth;
            
            // Highlight if selected in slider mode
            const isSelected = state.controlBarFocused && state.headerMode === 'sliders' && state.selectedSliderIndex === i;
            const barOptions = {
                fontSize: sliderFontSize,
                glowIntensity: isSelected ? 1.0 : 0.55
            };
            
            TextRenderer.renderLine(ctx, barText, barX, y, config, barOptions);
            
            // Store clickable region for the bar only
            effectsBar.regions.push({
                index: i,
                id: slider.id,
                x: barX,
                y: y,
                width: barWidth,
                height: sliderFontSize + 4
            });
            
            x = barX + barWidth + barSpacing;
        }
    }
    
    /**
     * Get visible messages based on scroll offset
     */
    function getVisibleMessages() {
        const lineHeightPx = layout.fontSize * layout.lineHeight;
        const availableHeight = layout.height - layout.padding * 4 - lineHeightPx * 2; // Header + input
        const maxLines = Math.floor(availableHeight / lineHeightPx);
        
        // Calculate total lines needed for all messages
        let totalLines = 0;
        const messageLines = state.messages.map(msg => {
            const lines = wrapText(msg.text, layout.width - layout.padding * 2);
            totalLines += lines.length;
            return { msg, lineCount: lines.length };
        });
        
        // Find which messages to show based on scroll
        const startLine = Math.max(0, totalLines - maxLines - state.scrollOffset);
        const endLine = totalLines - state.scrollOffset;
        
        let currentLine = 0;
        const visible = [];
        
        for (const { msg, lineCount } of messageLines) {
            const msgStart = currentLine;
            const msgEnd = currentLine + lineCount;
            
            if (msgEnd > startLine && msgStart < endLine) {
                visible.push(msg);
            }
            
            currentLine += lineCount;
        }
        
        return visible;
    }
    
    /**
     * Get rendering options based on message type
     */
    function getMessageOptions(type) {
        switch (type) {
            case 'error':
                return {
                    phosphorColors: {
                        primary: '#ff4444',
                        glow: '#ff0000',
                        dim: '#440000'
                    },
                    glowIntensity: 0.8
                };
            case 'system':
                // Make system lines as bright as the header bar
                return {
                    glowIntensity: 0.75,
                    phosphorColors: {
                        ...config.phosphorColors,
                        primary: config.phosphorColors.primary
                    }
                };
            case 'roll':
                return {
                    glowIntensity: 0.95,
                    phosphorColors: TextRenderer.PHOSPHOR_PRESETS.p1  // Green for rolls
                };
            case 'player':
                return {
                    glowIntensity: 0.9
                };
            case 'gm':
                return {
                    glowIntensity: 0.95,
                    phosphorColors: TextRenderer.PHOSPHOR_PRESETS.p31  // Blue for GM
                };
            default:
                return {
                    glowIntensity: 0.8
                };
        }
    }
    
    /**
     * Word wrap text to fit width
     */
    function wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const width = TextRenderer.measureText(ctx, testLine, config);
            
            if (width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines.length > 0 ? lines : [''];
    }
    
    /**
     * Find clickable elements in a line of text
     * Looks for patterns like [d6], [TERM], [ROLL], etc.
     */
    function findClickableElements(text, lineX, lineY, lineHeight) {
        const elements = [];
        const pattern = /\[([^\]]+)\]/g;
        let match;
        
        while ((match = pattern.exec(text)) !== null) {
            const beforeText = text.slice(0, match.index);
            const beforeWidth = TextRenderer.measureText(ctx, beforeText, config);
            const elementWidth = TextRenderer.measureText(ctx, match[0], config);
            
            elements.push({
                text: match[1],
                fullText: match[0],
                x: lineX + beforeWidth,
                y: lineY,
                width: elementWidth,
                height: lineHeight,
                action: parseClickableAction(match[1])
            });
        }
        
        return elements;
    }
    
    /**
     * Parse clickable element action
     */
    function parseClickableAction(text) {
        const upper = text.toUpperCase();
        
        // Dice patterns
        if (/^D\d+$/i.test(text)) {
            return { type: 'dice', value: parseInt(text.slice(1)) };
        }
        
        // Commands
        switch (upper) {
            case 'TERM':
            case 'TERMINAL':
                return { type: 'command', value: 'terminal' };
            case 'ROLL':
                return { type: 'command', value: 'roll' };
            case 'CLEAR':
            case 'CLR':
                return { type: 'command', value: 'clear' };
            case 'GM':
                return { type: 'command', value: 'gm' };
            default:
                return { type: 'text', value: text };
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // CONTENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Add a message to the chat log
     * @param {string} type - Message type ('system', 'player', 'roll', 'error', 'gm')
     * @param {string} text - Message text
     */
    function addMessage(type, text) {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
        
        state.messages.push({
            type,
            text: `[${timestamp}] ${text}`,
            timestamp: Date.now()
        });
        
        // Trim history if needed
        while (state.messages.length > state.maxMessages) {
            state.messages.shift();
        }
        
        // Reset scroll to bottom
        state.scrollOffset = 0;
        dirty = true;
    }
    
    /**
     * Clear all messages
     */
    function clear() {
        state.messages = [];
        state.scrollOffset = 0;
        dirty = true;
        addMessage('system', 'Log cleared');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // INPUT HANDLING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Set input focus state
     */
    function setInputActive(active) {
        state.inputActive = active;
        dirty = true;
    }
    
    /**
     * Handle character input
     */
    function handleChar(char) {
        if (!state.inputActive) return;
        
        state.inputBuffer = 
            state.inputBuffer.slice(0, state.caretPosition) +
            char +
            state.inputBuffer.slice(state.caretPosition);
        state.caretPosition++;
        
        if (typeof AnimationManager !== 'undefined') {
            AnimationManager.resetCaretPhase();
        }
        
        dirty = true;
    }
    
    /**
     * Handle special key
     * @returns {boolean} True if key was handled
     */
    function handleKey(key, modifiers = {}) {
        // Handle header navigation (control bar + sliders) when focused
        if (state.controlBarFocused) {
            return handleControlBarKey(key);
        }
        
        if (!state.inputActive) return false;
        
        switch (key) {
            case 'Enter':
                submitInput();
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
                state.caretPosition = 0;
                dirty = true;
                return true;
                
            case 'End':
                state.caretPosition = state.inputBuffer.length;
                dirty = true;
                return true;
                
            case 'Tab':
                // Switch to header (control bar first)
                state.controlBarFocused = true;
                state.inputActive = false;
                state.headerMode = 'controls';
                if (state.selectedControlIndex < 0) {
                    state.selectedControlIndex = 0;
                }
                dirty = true;
                return true;
        }
        
        return false;
    }
    
    /**
     * Handle keyboard input for control bar navigation
     * @returns {boolean} True if key was handled
     */
    function handleControlBarKey(key) {
        const numControls = controlBar.controls.length;
        const numSliders = effectsBar.sliders.length;
        
        if (state.headerMode === 'controls') {
            switch (key) {
                case 'ArrowLeft':
                    // Move selection left
                    if (state.selectedControlIndex > 0) {
                        state.selectedControlIndex--;
                    } else {
                        state.selectedControlIndex = numControls - 1; // Wrap around
                    }
                    dirty = true;
                    return true;
                    
                case 'ArrowRight':
                    // Move selection right
                    if (state.selectedControlIndex < numControls - 1) {
                        state.selectedControlIndex++;
                    } else {
                        state.selectedControlIndex = 0; // Wrap around
                    }
                    dirty = true;
                    return true;
                    
                case 'Enter':
                case ' ':
                    // Activate selected control
                    if (state.selectedControlIndex >= 0 && state.selectedControlIndex < numControls) {
                        activateControl(state.selectedControlIndex);
                    }
                    return true;
                    
                case 'Escape':
                    // Exit header focus
                    state.controlBarFocused = false;
                    state.selectedControlIndex = -1;
                    dirty = true;
                    return true;
                    
                case 'ArrowDown':
                    // Move into slider row
                    state.headerMode = 'sliders';
                    state.selectedSliderIndex = Math.max(0, Math.min(numSliders - 1, state.selectedSliderIndex));
                    dirty = true;
                    return true;
                    
                case 'Tab':
                    // Move focus back to input
                    state.controlBarFocused = false;
                    state.inputActive = true;
                    dirty = true;
                    return true;
            }
        } else if (state.headerMode === 'sliders') {
            switch (key) {
                case 'ArrowLeft':
                    // Decrease slider level
                    adjustSliderLevel(state.selectedSliderIndex, -1);
                    return true;
                    
                case 'ArrowRight':
                    // Increase slider level
                    adjustSliderLevel(state.selectedSliderIndex, 1);
                    return true;
                    
                case 'ArrowDown':
                    // Cycle to next slider
                    state.selectedSliderIndex = (state.selectedSliderIndex + 1) % numSliders;
                    dirty = true;
                    return true;
                    
                case 'ArrowUp':
                    // Go back to controls row
                    state.headerMode = 'controls';
                    dirty = true;
                    return true;
                    
                case 'Escape':
                    // Exit header focus entirely
                    state.controlBarFocused = false;
                    state.headerMode = 'controls';
                    dirty = true;
                    return true;
                    
                case 'Tab':
                    // Move focus back to input
                    state.controlBarFocused = false;
                    state.headerMode = 'controls';
                    state.inputActive = true;
                    dirty = true;
                    return true;
            }
        }
        
        return false;
    }

    /**
     * Adjust slider level by delta steps and apply effect
     */
    function adjustSliderLevel(index, delta) {
        const slider = effectsBar.sliders[index];
        if (!slider) return;
        
        slider.level = Math.max(0, Math.min(slider.steps, slider.level + delta));
        applySliderValue(slider);
        dirty = true;
    }

    /**
     * Apply slider value to CRT / ControlPanelManager
     */
    function applySliderValue(slider) {
        const t = slider.steps > 0 ? slider.level / slider.steps : 0;
        const value = slider.min + (slider.max - slider.min) * t;
        
        // Prefer going through ControlPanelManager so existing wiring is reused
        if (typeof ControlPanelManager !== 'undefined' && typeof ControlPanelManager.setDialValue === 'function') {
            ControlPanelManager.setDialValue(slider.id, value);
            return;
        }
        
        // Fallback: write directly to CRTShader.config
        if (typeof CRTShader !== 'undefined' && CRTShader.config) {
            switch (slider.id) {
                case 'brightness':
                    CRTShader.config.brightness = value;
                    break;
                case 'contrast':
                    CRTShader.config.contrast = value;
                    break;
                case 'effects':
                    CRTShader.config.scanlineIntensity = 0.02 * value;
                    CRTShader.config.phosphorMaskIntensity = 0.41 * value;
                    CRTShader.config.chromaticAberration = 0.002 * value;
                    CRTShader.config.vignetteStrength = 0.59 * value;
                    break;
            }
        }
    }
    
    /**
     * Activate a control by index
     */
    function activateControl(index) {
        const ctrl = controlBar.controls[index];
        if (!ctrl) return;
        
        // Toggle active state
        ctrl.active = !ctrl.active;
        dirty = true;
        
        console.log('[ChatManager] Control activated:', ctrl.id, 'active:', ctrl.active);
        
        // Trigger action based on control id
        switch (ctrl.id) {
            case 'options':
                if (typeof EventBus !== 'undefined') {
                    EventBus.emit('ui:options-toggle');
                }
                if (typeof DebugUI !== 'undefined') {
                    DebugUI.toggleVisibility();
                }
                break;
                
            case 'gmMode':
                if (typeof EventBus !== 'undefined') {
                    EventBus.emit('ui:gm-mode-toggle');
                }
                break;
                
            case 'terminal':
                if (typeof EventBus !== 'undefined') {
                    EventBus.emit('ui:terminal-toggle');
                }
                break;
        }
        
        // Play click sound
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playUISound('click');
        }
        
        // Sync with ControlPanelManager if it exists (for LED state)
        if (typeof ControlPanelManager !== 'undefined') {
            ControlPanelManager.setButtonState(ctrl.id, ctrl.active);
        }
    }

    
    /**
     * Set focus to control bar
     */
    function focusControlBar() {
        state.controlBarFocused = true;
        state.inputActive = false;
        if (state.selectedControlIndex < 0) {
            state.selectedControlIndex = 0;
        }
        dirty = true;
    }
    
    /**
     * Submit current input
     */
    function submitInput() {
        const input = state.inputBuffer.trim();
        
        if (input) {
            // Add to history
            state.commandHistory.push(input);
            state.historyIndex = state.commandHistory.length;
            
            // Add as player message
            addMessage('player', input);
            
            // Process command
            processCommand(input);
        }
        
        // Clear input
        state.inputBuffer = '';
        state.caretPosition = 0;
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
    
    /**
     * Process a command/message
     */
    function processCommand(input) {
        // Check for dice roll syntax
        const diceMatch = input.match(/^\/r(?:oll)?\s+(.+)$/i);
        if (diceMatch) {
            rollDice(diceMatch[1]);
            return;
        }
        
        // Check for commands
        if (input.startsWith('/')) {
            const parts = input.slice(1).split(/\s+/);
            const cmd = parts[0].toLowerCase();
            const args = parts.slice(1);
            
            switch (cmd) {
                case 'clear':
                case 'cls':
                    clear();
                    break;
                case 'help':
                    showHelp();
                    break;
                case 'who':
                    showWho();
                    break;
                case 'views':
                    showViews();
                    break;
                case 'gm':
                    authenticateGM(args.join(' '));
                    break;
                case 'name':
                    changeName(args.join(' '));
                    break;
                case 'logout':
                    logoutGM();
                    break;
                case 'ping':
                    testConnection();
                    break;
                case 'scenes':
                    listScenes();
                    break;
                case 'scene':
                    changeScene(args.join(' '));
                    break;
                case 'overlay':
                    toggleGMOverlay();
                    break;
                case 'next':
                    navigateScene('next');
                    break;
                case 'prev':
                    navigateScene('prev');
                    break;
                case 'look':
                case 'examine':
                case 'inspect':
                    examineNPC(args.join(' '));
                    break;
                case 'npcs':
                    listNPCs();
                    break;
                case 'dice':
                    handleDiceCommand(args);
                    break;
                case 'dicecolor':
                case 'dicecolour':
                    setDiceColor(args.join(' '));
                    break;
                case 'dicetest':
                    testDice();
                    break;
                default:
                    addMessage('error', `Unknown command: ${cmd}`);
            }
            return;
        }
        
        // Regular chat message - broadcast to other players
        const localName = typeof SyncManager !== 'undefined' ? SyncManager.getLocalState().name : 'You';
        
        if (typeof SyncManager !== 'undefined') {
            if (SyncManager.isConnected()) {
                SyncManager.broadcastChat(input, 'player');
                console.log('[ChatManager] Broadcast chat:', input);
            } else {
                console.warn('[ChatManager] Not connected, message not broadcast');
            }
        }
        
        // Show locally with our name
        addMessage('player', `${localName}: ${input}`);
    }
    
    /**
     * Roll dice - uses 3D dice if available, falls back to text-only
     */
    async function rollDice(expression) {
        // Parse dice expression like "2d6+3" or "d20"
        const match = expression.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
        
        if (!match) {
            addMessage('error', `Invalid dice expression: ${expression}`);
            return;
        }
        
        const count = parseInt(match[1]) || 1;
        const sides = parseInt(match[2]);
        const modifier = parseInt(match[3]) || 0;
        
        // Validate
        if (count < 1 || count > 100 || sides < 2 || sides > 1000) {
            addMessage('error', 'Invalid dice: 1-100 dice, 2-1000 sides');
            return;
        }
        
        // Build expression string
        let expr = `${count}d${sides}`;
        if (modifier !== 0) {
            expr += modifier > 0 ? `+${modifier}` : `${modifier}`;
        }
        
        // Check if 3D dice is available and supports this die type
        const supported3DDice = [4, 6, 8, 10, 12, 20, 100];
        const use3D = typeof DiceManager !== 'undefined' && 
                      DiceManager.isInitialized() && 
                      supported3DDice.includes(sides);
        
        let rolls = [];
        let total = 0;
        
        if (use3D) {
            // Show rolling message
            addMessage('system', `Rolling ${expr}...`);
            
            // Show dice box
            const diceBox = document.getElementById('dice-box');
            if (diceBox) diceBox.classList.add('active');
            
            try {
                // Use 3D dice - wait for animation to complete
                const result = await DiceManager.roll(expr);
                
                if (result) {
                    rolls = result.rolls.map(r => r.value);
                    total = result.total;
                } else {
                    // Fallback if 3D roll failed
                    ({ rolls, total } = rollDiceFallback(count, sides, modifier));
                }
            } catch (error) {
                console.error('[ChatManager] 3D dice error:', error);
                // Fallback to text-only
                ({ rolls, total } = rollDiceFallback(count, sides, modifier));
            }
            
            // Hide dice box after delay
            setTimeout(() => {
                if (diceBox) diceBox.classList.remove('active');
            }, 2000);
        } else {
            // Text-only fallback for unsupported dice
            ({ rolls, total } = rollDiceFallback(count, sides, modifier));
        }
        
        // Format result for display
        const rollsStr = rolls.map(r => `[${r}]`).join(' ');
        let result = `${expr}: ${rollsStr}`;
        if (modifier !== 0) {
            result += ` ${modifier > 0 ? '+' : ''}${modifier}`;
        }
        result += ` = ${total}`;
        
        // Get local name
        const localName = typeof SyncManager !== 'undefined' ? SyncManager.getLocalState().name : 'You';
        
        // Show result locally
        addMessage('roll', `${localName} rolled ${result}`);
        
        // Broadcast to other players
        if (typeof SyncManager !== 'undefined' && SyncManager.isConnected()) {
            SyncManager.broadcastRoll({
                expression: expr,
                rolls,
                modifier,
                total
            });
        }
        
        // Emit event for other systems
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('dice:rolled', { expression: expr, rolls, modifier, total });
        }
    }
    
    /**
     * Fallback dice rolling (text-only, no 3D)
     */
    function rollDiceFallback(count, sides, modifier) {
        const rolls = [];
        let total = 0;
        
        for (let i = 0; i < count; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            total += roll;
        }
        
        total += modifier;
        return { rolls, total };
    }
    
    /**
     * Show who is connected
     */
    function showWho() {
        if (typeof SyncManager === 'undefined') {
            addMessage('error', 'SyncManager not available');
            return;
        }
        
        const local = SyncManager.getLocalState();
        const peers = SyncManager.getPeers();
        
        addMessage('system', '─── CONNECTED ───');
        
        // Show self
        const selfRole = local.role === 'gm' ? ' [GM]' : '';
        addMessage('system', `• ${local.name}${selfRole} (you)`);
        
        // Show peers
        if (peers.length === 0) {
            addMessage('system', '  (no other players)');
        } else {
            for (const peer of peers) {
                const role = peer.role === 'gm' ? ' [GM]' : '';
                addMessage('system', `• ${peer.name}${role}`);
            }
        }
        
        addMessage('system', `─── ${peers.length + 1} online ───`);
    }
    
    /**
     * Show player views (GM only)
     */
    function showViews() {
        if (typeof SyncManager === 'undefined') {
            addMessage('error', 'SyncManager not available');
            return;
        }
        
        if (!SyncManager.isGM()) {
            addMessage('error', 'GM only command');
            return;
        }
        
        const views = SyncManager.getPlayerViews();
        const viewList = Object.values(views);
        
        addMessage('system', '─── PLAYER VIEWS ───');
        
        if (viewList.length === 0) {
            addMessage('system', '  (no players connected)');
        } else {
            for (const player of viewList) {
                const viewLabel = player.view === 'terminal' ? 'TERMINAL' : 'SCENE';
                addMessage('system', `• ${player.name}: ${viewLabel}`);
            }
        }
    }
    
    /**
     * Authenticate as GM
     */
    function authenticateGM(password) {
        if (typeof SyncManager === 'undefined') {
            addMessage('error', 'SyncManager not available');
            return;
        }
        
        if (!password) {
            addMessage('error', 'Usage: /gm <password>');
            return;
        }
        
        addMessage('system', 'Authenticating...');
        
        SyncManager.authenticateGM(password).then(success => {
            if (success) {
                addMessage('system', 'GM authentication successful');
            } else {
                addMessage('error', 'GM authentication failed');
            }
        });
    }
    
    /**
     * Logout from GM role
     */
    function logoutGM() {
        if (typeof SyncManager === 'undefined') {
            addMessage('error', 'SyncManager not available');
            return;
        }
        
        if (!SyncManager.isGM()) {
            addMessage('error', 'Not logged in as GM');
            return;
        }
        
        SyncManager.logoutGM();
        addMessage('system', 'Logged out from GM role');
    }
    
    /**
     * Change display name
     */
    function changeName(newName) {
        if (typeof SyncManager === 'undefined') {
            addMessage('error', 'SyncManager not available');
            return;
        }
        
        if (!newName || newName.trim().length === 0) {
            addMessage('error', 'Usage: /name <new name>');
            return;
        }
        
        const trimmed = newName.trim().substring(0, 20); // Max 20 chars
        SyncManager.setName(trimmed);
        addMessage('system', `Name changed to: ${trimmed}`);
    }
    
    /**
     * Test connection status
     */
    function testConnection() {
        if (typeof SyncManager === 'undefined') {
            addMessage('error', 'SyncManager not available');
            return;
        }
        
        const connected = SyncManager.isConnected();
        const local = SyncManager.getLocalState();
        const peers = SyncManager.getPeers();
        
        addMessage('system', '─── CONNECTION STATUS ───');
        addMessage('system', `Socket: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`);
        addMessage('system', `Your ID: ${local.id || 'none'}`);
        addMessage('system', `Session: ${local.sessionId || 'none'}`);
        addMessage('system', `Peers: ${peers.length}`);
        
        if (connected) {
            addMessage('system', 'Sending ping...');
            SyncManager.ping();
        }
    }
    
    /**
     * List available scenes
     */
    function listScenes() {
        addMessage('system', 'Loading scenes...');
        
        fetch('/api/scenes')
            .then(res => res.json())
            .then(scenes => {
                if (scenes.length === 0) {
                    addMessage('system', 'No scenes available');
                    return;
                }
                
                addMessage('system', '─── SCENES ───');
                
                let currentAdventure = null;
                for (const scene of scenes) {
                    // Show adventure header when it changes
                    if (scene.adventure !== currentAdventure) {
                        currentAdventure = scene.adventure;
                        addMessage('system', `[${currentAdventure}]`);
                    }
                    
                    // Format: Act.Chapter.Scene - Title
                    const num = `${scene.act}.${scene.chapter}.${scene.scene}`;
                    addMessage('system', `  ${num} - ${scene.title}`);
                }
                
                addMessage('system', '─── /scene <num> to change ───');
            })
            .catch(err => {
                addMessage('error', 'Failed to load scenes');
                console.error('[ChatManager] Scene list error:', err);
            });
    }
    
    /**
     * Change scene (GM only)
     *
     * Uses SceneManager so all scene changes go through TransitionManager
     * and share the same CRT power-down/pause/power-up behavior as the
     * GM overlay NEXT/PREV buttons.
     */
    function changeScene(sceneRef) {
        if (typeof SyncManager === 'undefined') {
            addMessage('error', 'SyncManager not available');
            return;
        }
        
        if (!SyncManager.isGM()) {
            addMessage('error', 'GM only command');
            return;
        }
        
        if (!sceneRef) {
            addMessage('error', 'Usage: /scene <act.chapter.scene>');
            addMessage('system', 'Example: /scene 1.1.1');
            return;
        }

        if (typeof SceneManager === 'undefined') {
            addMessage('error', 'SceneManager not available');
            return;
        }
        
        // Parse scene reference (e.g., "1.1.2" or full ID/title)
        const parts = sceneRef.split('.');
        
        addMessage('system', `Loading scene ${sceneRef}...`);

        // Fast path: act.chapter.scene uses SceneManager's own numbering helper
        if (parts.length === 3 && parts.every(p => !isNaN(parseInt(p)))) {
            const [act, chapter, scene] = parts.map(p => parseInt(p));
            const success = SceneManager.goToSceneByNumber(act, chapter, scene, /* broadcast */ true);
            if (!success) {
                addMessage('error', `Scene not found: ${sceneRef}`);
                return;
            }
            // SceneManager handles broadcast + events; just log to chat here
            const current = SceneManager.getCurrentScene();
            if (current) {
                addMessage('system', `Scene changed to: ${current.title}`);
            }
            return;
        }

        // Fallback: fetch list and try to match by ID or title, then
        // delegate to SceneManager.goToScene(id, true) for transition.
        fetch('/api/scenes')
            .then(res => res.json())
            .then(scenes => {
                let targetScene = scenes.find(s => 
                    s.id.toLowerCase().includes(sceneRef.toLowerCase()) ||
                    s.title.toLowerCase().includes(sceneRef.toLowerCase())
                );
                
                if (!targetScene) {
                    addMessage('error', `Scene not found: ${sceneRef}`);
                    return;
                }

                const success = SceneManager.goToScene(targetScene.id, /* broadcast */ true);
                if (!success) {
                    addMessage('error', `Failed to change scene: ${targetScene.title}`);
                    return;
                }
                
                addMessage('system', `Scene changed to: ${targetScene.title}`);
            })
            .catch(err => {
                addMessage('error', 'Failed to load scene');
                console.error('[ChatManager] Scene change error:', err);
            });
    }
    
    /**
     * List NPCs in current scene
     */
    function listNPCs() {
        if (typeof SceneManager === 'undefined') {
            addMessage('error', 'SceneManager not available');
            return;
        }
        
        const scene = SceneManager.getCurrentScene();
        if (!scene || !scene.npcs || scene.npcs.length === 0) {
            addMessage('system', 'No NPCs in current scene');
            return;
        }
        
        addMessage('system', '─── NPCs IN SCENE ───');
        for (const npc of scene.npcs) {
            const stateIcon = {
                active: '●',
                passive: '○',
                hidden: '◐',
                defeated: '✗'
            }[npc.state] || '?';
            addMessage('system', `${stateIcon} ${npc.name} - ${npc.role}`);
        }
        addMessage('system', 'Use /look <name> to examine');
    }
    
    /**
     * Examine an NPC (player gets public info only)
     */
    function examineNPC(name) {
        if (!name) {
            addMessage('error', 'Usage: /look <npc name>');
            addMessage('system', 'Example: /look Jax');
            return;
        }
        
        // Try to find NPC in current scene first
        let npcId = null;
        if (typeof SceneManager !== 'undefined') {
            const scene = SceneManager.getCurrentScene();
            if (scene && scene.npcs) {
                const match = scene.npcs.find(n => 
                    n.name.toLowerCase().includes(name.toLowerCase()) ||
                    n.id.toLowerCase().includes(name.toLowerCase())
                );
                if (match) {
                    npcId = match.statblock || match.id;
                }
            }
        }
        
        // If not found in scene, try direct lookup
        if (!npcId) {
            npcId = name.toLowerCase().replace(/\s+/g, '_');
        }
        
        addMessage('system', `Looking up ${name}...`);
        
        // Fetch NPC data (player role - public info only)
        fetch(`/api/npcs/${npcId}`)
            .then(res => {
                if (!res.ok) throw new Error('NPC not found');
                return res.json();
            })
            .then(npc => {
                addMessage('system', '═══════════════════════');
                addMessage('system', `  ${npc.name.toUpperCase()}`);
                addMessage('system', '───────────────────────');
                
                // Description
                if (npc.description) {
                    addMessage('system', npc.description);
                }
                
                // Appearance
                if (npc.appearance) {
                    addMessage('system', '');
                    addMessage('system', 'APPEARANCE:');
                    addMessage('system', npc.appearance);
                }
                
                // Demeanor
                if (npc.demeanor) {
                    addMessage('system', '');
                    addMessage('system', 'DEMEANOR:');
                    addMessage('system', npc.demeanor);
                }
                
                // Known facts
                if (npc.known_facts && npc.known_facts.length > 0) {
                    addMessage('system', '');
                    addMessage('system', 'WHAT YOU KNOW:');
                    for (const fact of npc.known_facts) {
                        addMessage('system', `• ${fact}`);
                    }
                }
                
                addMessage('system', '═══════════════════════');
            })
            .catch(err => {
                addMessage('error', `NPC not found: ${name}`);
                console.error('[ChatManager] NPC lookup error:', err);
            });
    }
    
    /**
     * Open GM overlay (React app in new tab)
     */
    function toggleGMOverlay() {
        if (typeof SyncManager === 'undefined' || !SyncManager.isGM()) {
            addMessage('error', 'GM only command');
            return;
        }
        
        // Open the React GM Overlay in a new tab
        window.open('/gm-overlay/', '_blank');
        addMessage('system', 'GM Overlay opened in new tab');
    }
    
    /**
     * Navigate scenes (next/prev)
     */
    function navigateScene(direction) {
        if (typeof SyncManager === 'undefined' || !SyncManager.isGM()) {
            addMessage('error', 'GM only command');
            return;
        }
        
        if (typeof SceneManager === 'undefined') {
            addMessage('error', 'SceneManager not available');
            return;
        }
        
        let success = false;
        if (direction === 'next') {
            success = SceneManager.nextScene();
        } else if (direction === 'prev') {
            success = SceneManager.prevScene();
        }
        
        if (!success) {
            addMessage('system', `No ${direction} scene available`);
        }
    }
    
    /**
     * Show help
     */
    function showHelp() {
        addMessage('system', '─── COMMANDS ───');
        addMessage('system', '/roll XdY+Z - Roll dice');
        addMessage('system', '/who - List connected players');
        addMessage('system', '/name <name> - Change name');
        addMessage('system', '/ping - Test connection');
        addMessage('system', '/clear - Clear log');
        addMessage('system', '/help - Show this help');
        addMessage('system', '─── NPC COMMANDS ───');
        addMessage('system', '/npcs - List NPCs in scene');
        addMessage('system', '/look <name> - Examine NPC');
        addMessage('system', '─── GM COMMANDS ───');
        addMessage('system', '/gm <pass> - Authenticate as GM');
        addMessage('system', '/scenes - List available scenes');
        addMessage('system', '/scene <num> - Change scene');
        addMessage('system', '/next - Next scene');
        addMessage('system', '/prev - Previous scene');
        addMessage('system', '/overlay - Toggle GM overlay');
        addMessage('system', '/views - See player views');
        addMessage('system', '/logout - Logout from GM');
        addMessage('system', '─── DICE COMMANDS ───');
        addMessage('system', '/dice - Show dice settings');
        addMessage('system', '/dicecolor #hex - Set dice color');
        addMessage('system', '/dicetest - Test roll animation');
        addMessage('system', '─── SHORTCUTS ───');
        addMessage('system', '` - Scene Viewer controls');
        addMessage('system', '~ - Terminal controls');
        addMessage('system', 'TAB - Header navigation');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // DICE CUSTOMIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Handle /dice command - show or modify dice settings
     */
    function handleDiceCommand(args) {
        if (typeof DiceManager === 'undefined') {
            addMessage('error', '3D dice not available');
            return;
        }
        
        if (args.length === 0) {
            // Show current settings
            const settings = DiceManager.getSettings();
            addMessage('system', '─── DICE SETTINGS ───');
            addMessage('system', `Theme: ${settings.theme}`);
            addMessage('system', `Color: ${settings.themeColor}`);
            addMessage('system', `Scale: ${settings.scale}`);
            addMessage('system', '─── COMMANDS ───');
            addMessage('system', '/dicecolor #hex - Set color');
            addMessage('system', '/dicetest - Test roll');
            addMessage('system', '/dice reset - Reset to defaults');
            return;
        }
        
        const subCmd = args[0].toLowerCase();
        
        switch (subCmd) {
            case 'reset':
                DiceManager.resetSettings();
                addMessage('system', 'Dice settings reset to defaults');
                break;
            case 'color':
            case 'colour':
                if (args[1]) {
                    setDiceColor(args[1]);
                } else {
                    addMessage('error', 'Usage: /dice color #hexcode');
                }
                break;
            case 'scale':
                if (args[1]) {
                    const scale = parseFloat(args[1]);
                    if (!isNaN(scale) && scale >= 1 && scale <= 20) {
                        DiceManager.updateSettings({ scale });
                        addMessage('system', `Dice scale set to ${scale}`);
                    } else {
                        addMessage('error', 'Scale must be between 1 and 20');
                    }
                } else {
                    addMessage('error', 'Usage: /dice scale <1-20>');
                }
                break;
            case 'theme':
                if (args[1]) {
                    DiceManager.setTheme(args[1]);
                    addMessage('system', `Dice theme set to: ${args[1]}`);
                } else {
                    const themes = DiceManager.getAvailableThemes();
                    addMessage('system', `Available themes: ${themes.join(', ')}`);
                }
                break;
            default:
                addMessage('error', `Unknown dice command: ${subCmd}`);
        }
    }
    
    /**
     * Set dice color
     */
    function setDiceColor(color) {
        if (typeof DiceManager === 'undefined') {
            addMessage('error', '3D dice not available');
            return;
        }
        
        // Validate hex color
        const hexMatch = color.match(/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
        if (!hexMatch) {
            addMessage('error', 'Invalid color. Use hex format: #ff0000');
            return;
        }
        
        const hexColor = color.startsWith('#') ? color : `#${color}`;
        DiceManager.setColor(hexColor);
        addMessage('system', `Dice color set to ${hexColor}`);
    }
    
    /**
     * Test dice rolling
     */
    function testDice() {
        if (typeof DiceManager === 'undefined') {
            addMessage('error', '3D dice not available');
            return;
        }
        
        if (!DiceManager.isInitialized()) {
            addMessage('error', '3D dice not initialized');
            return;
        }
        
        addMessage('system', 'Testing 3D dice...');
        rollDice('2d6');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SCROLLING
    // ═══════════════════════════════════════════════════════════════════
    
    function scrollUp(lines = 3) {
        const maxScroll = Math.max(0, getTotalLines() - layout.maxVisibleLines);
        state.scrollOffset = Math.min(maxScroll, state.scrollOffset + lines);
        dirty = true;
    }
    
    function scrollDown(lines = 3) {
        state.scrollOffset = Math.max(0, state.scrollOffset - lines);
        dirty = true;
    }
    
    function getTotalLines() {
        let total = 0;
        for (const msg of state.messages) {
            total += wrapText(msg.text, layout.width - layout.padding * 2).length;
        }
        return total;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // VISIBILITY
    // ═══════════════════════════════════════════════════════════════════
    
    function show() {
        visible = true;
        if (plane) plane.visible = true;
        dirty = true;
    }
    
    function hide() {
        visible = false;
        if (plane) plane.visible = false;
    }
    
    function isVisible() {
        return visible;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // CLICK HANDLING (for raycasting)
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Handle a click at canvas coordinates
     * @param {number} x - X position in canvas pixels
     * @param {number} y - Y position in canvas pixels
     * @returns {boolean} True if a clickable element was hit
     */
    function handleClick(x, y) {
        // Check if click is in header area (controls + sliders)
        const headerHeight = layout.fontSize * 3.2;
        if (y < headerHeight) {
            // Check control bar regions first
            for (const region of controlBar.regions) {
                if (x >= region.x && x <= region.x + region.width &&
                    y >= region.y && y <= region.y + region.height) {
                    
                    // Select and activate the control
                    state.selectedControlIndex = region.index;
                    state.headerMode = 'controls';
                    state.controlBarFocused = true;
                    state.inputActive = false;
                    activateControl(region.index);
                    return true;
                }
            }
            
            // Then check effects slider regions
            for (const region of effectsBar.regions) {
                if (x >= region.x && x <= region.x + region.width &&
                    y >= region.y && y <= region.y + region.height) {
                    
                    // Map click position to slider level
                    const slider = effectsBar.sliders[region.index];
                    if (slider) {
                        const relative = (x - region.x) / region.width;
                        const level = Math.round(relative * slider.steps);
                        slider.level = Math.max(0, Math.min(slider.steps, level));
                        applySliderValue(slider);
                    }
                    
                    state.headerMode = 'sliders';
                    state.selectedSliderIndex = region.index;
                    state.controlBarFocused = true;
                    state.inputActive = false;
                    dirty = true;
                    return true;
                }
            }
            
            // Clicked in header but not on a specific element - focus header controls
            state.controlBarFocused = true;
            state.inputActive = false;
            state.headerMode = 'controls';
            if (state.selectedControlIndex < 0) {
                state.selectedControlIndex = 0;
            }
            dirty = true;
            return true;
        }
        
        for (const element of clickableElements) {
            if (x >= element.x && x <= element.x + element.width &&
                y >= element.y && y <= element.y + element.height) {
                
                executeClickAction(element.action);
                return true;
            }
        }
        
        // Check if click is in input area
        const inputY = layout.height - layout.padding - layout.fontSize * layout.lineHeight;
        if (y >= inputY) {
            setInputActive(true);
            state.controlBarFocused = false;
            state.selectedControlIndex = -1;
            return true;
        }
        
        return false;
    }
    
    /**
     * Execute a click action
     */
    function executeClickAction(action) {
        switch (action.type) {
            case 'dice':
                rollDice(`d${action.value}`);
                break;
            case 'command':
                if (action.value === 'terminal') {
                    if (typeof EventBus !== 'undefined') {
                        EventBus.emit('ui:terminal-toggle');
                    }
                } else if (action.value === 'roll') {
                    // Roll whatever is queued
                    if (typeof EventBus !== 'undefined') {
                        EventBus.emit('ui:roll');
                    }
                } else if (action.value === 'clear') {
                    clear();
                }
                break;
        }
    }
    
    /**
     * Get clickable elements for raycasting
     */
    function getClickableElements() {
        return clickableElements;
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
        addMessage,
        clear,
        
        // Input
        setInputActive,
        handleChar,
        handleKey,
        
        // Control bar
        focusControlBar,
        setControlState: (id, active) => {
            const ctrl = controlBar.controls.find(c => c.id === id);
            if (!ctrl) return;
            ctrl.active = !!active;
            dirty = true;

            // Keep 3D control panel LEDs in sync if present
            if (typeof ControlPanelManager !== 'undefined' &&
                typeof ControlPanelManager.setButtonState === 'function') {
                ControlPanelManager.setButtonState(id, ctrl.active);
            }
        },
        getControlState: (id) => {
            const ctrl = controlBar.controls.find(c => c.id === id);
            return ctrl ? ctrl.active : false;
        },
        
        // Scrolling
        scrollUp,
        scrollDown,
        
        // Click handling
        handleClick,
        getClickableElements,
        
        // State access
        getState: () => ({ ...state }),
        isInputActive: () => state.inputActive,
        isControlBarFocused: () => state.controlBarFocused,
        getLayout: () => ({ ...layout }),
        
        // Three.js objects
        getPlane: () => plane,
        getTexture: () => texture,
        getCanvas: () => canvas
    };
})();

console.log('[ChatManager] Module loaded');
