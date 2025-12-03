/**
 * Phosphor Text System
 * Authentic CRT terminal text rendering with:
 * - Phosphor glow and bloom
 * - Burn-in persistence effect
 * - Ghosting/decay trails
 * - Blinking caret with phosphor persistence
 * - Typewriter animation with variable timing
 * - Screen flicker and interference
 */

const PhosphorText = (function() {
    
    // Phosphor color presets (P1, P3, P31, etc.)
    const PHOSPHOR_PRESETS = {
        p1: { // Classic green (P1 phosphor)
            primary: '#33ff33',
            glow: '#00ff00',
            dim: '#003300',
            decay: '#001a00',
            persistence: 0.15 // Long persistence
        },
        p3: { // Amber (P3 phosphor)
            primary: '#ffaa00',
            glow: '#ffc040',
            dim: '#4a3000',
            decay: '#1a1000',
            persistence: 0.12
        },
        p31: { // Blue-white (P31 phosphor) - short persistence
            primary: '#aaccff',
            glow: '#ffffff',
            dim: '#334455',
            decay: '#111822',
            persistence: 0.05
        },
        p4: { // White (P4 phosphor)
            primary: '#ffffff',
            glow: '#ffffff',
            dim: '#444444',
            decay: '#111111',
            persistence: 0.08
        },
        p7: { // Blue with yellow persistence (P7 phosphor)
            primary: '#4488ff',
            glow: '#88aaff',
            dim: '#223344',
            decay: '#ffdd44', // Yellow afterglow!
            persistence: 0.25 // Very long persistence
        }
    };
    
    // Current phosphor type
    let currentPhosphor = PHOSPHOR_PRESETS.p3; // Amber by default
    
    // Text state
    const textBuffers = new Map(); // element -> { chars, burnIn, lastUpdate }
    
    // Caret state
    let caretVisible = true;
    let caretPhase = 0;
    let caretGhosts = []; // Previous caret positions for persistence
    
    // Animation state
    let animationFrame = null;
    let lastTime = 0;
    
    /**
     * Initialize phosphor text on an element
     * @param {HTMLElement} element - Container element
     * @param {Object} options - Configuration options
     */
    function init(element, options = {}) {
        const config = {
            phosphor: options.phosphor || 'p3',
            fontSize: options.fontSize || 14,
            lineHeight: options.lineHeight || 1.4,
            charWidth: options.charWidth || null, // Auto-calculate if null
            showCaret: options.showCaret !== false,
            caretChar: options.caretChar || '█',
            caretBlinkRate: options.caretBlinkRate || 530, // ms
            burnInEnabled: options.burnInEnabled !== false,
            burnInRate: options.burnInRate || 0.002, // How fast burn-in accumulates
            burnInDecay: options.burnInDecay || 0.0001, // How fast burn-in fades
            flickerEnabled: options.flickerEnabled !== false,
            flickerIntensity: options.flickerIntensity || 0.02,
            glowEnabled: options.glowEnabled !== false,
            glowIntensity: options.glowIntensity || 1.0,
            scanlineOverlay: options.scanlineOverlay !== false,
            ...options
        };
        
        // Set phosphor type
        if (typeof config.phosphor === 'string') {
            currentPhosphor = PHOSPHOR_PRESETS[config.phosphor] || PHOSPHOR_PRESETS.p3;
        } else {
            currentPhosphor = config.phosphor;
        }
        
        // Create phosphor display structure
        setupPhosphorDisplay(element, config);
        
        // Initialize text buffer
        textBuffers.set(element, {
            chars: [],
            burnIn: new Map(), // position -> intensity
            lastUpdate: performance.now(),
            config
        });
        
        // Start animation loop if not running
        if (!animationFrame) {
            lastTime = performance.now();
            animate();
        }
        
        console.log('[PHOSPHOR] Initialized with', config.phosphor, 'phosphor');
        return element;
    }
    
    /**
     * Set up the DOM structure for phosphor display
     */
    function setupPhosphorDisplay(element, config) {
        element.classList.add('phosphor-display');
        
        // Apply phosphor CSS variables
        element.style.setProperty('--phosphor-primary', currentPhosphor.primary);
        element.style.setProperty('--phosphor-glow', currentPhosphor.glow);
        element.style.setProperty('--phosphor-dim', currentPhosphor.dim);
        element.style.setProperty('--phosphor-decay', currentPhosphor.decay);
        element.style.setProperty('--phosphor-persistence', currentPhosphor.persistence);
        element.style.setProperty('--phosphor-font-size', config.fontSize + 'px');
        element.style.setProperty('--phosphor-line-height', config.lineHeight);
        
        // Create layers
        const layers = `
            <div class="phosphor-burn-layer"></div>
            <div class="phosphor-ghost-layer"></div>
            <div class="phosphor-text-layer"></div>
            <div class="phosphor-glow-layer"></div>
            <div class="phosphor-caret-layer"></div>
            ${config.scanlineOverlay ? '<div class="phosphor-scanlines"></div>' : ''}
            <div class="phosphor-flicker-overlay"></div>
        `;
        
        element.innerHTML = layers;
    }
    
    /**
     * Write text with typewriter effect
     * @param {HTMLElement} element - Phosphor display element
     * @param {string} text - Text to write
     * @param {Object} options - Animation options
     */
    async function typeText(element, text, options = {}) {
        const buffer = textBuffers.get(element);
        if (!buffer) return;
        
        const config = {
            speed: options.speed || 50, // ms per character
            variance: options.variance || 20, // Random variance in timing
            startDelay: options.startDelay || 0,
            sound: options.sound !== false,
            callback: options.callback || null,
            ...options
        };
        
        if (config.startDelay > 0) {
            await sleep(config.startDelay);
        }
        
        const textLayer = element.querySelector('.phosphor-text-layer');
        const glowLayer = element.querySelector('.phosphor-glow-layer');
        const caretLayer = element.querySelector('.phosphor-caret-layer');
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            // Add character to buffer
            buffer.chars.push({
                char,
                time: performance.now(),
                intensity: 1.0,
                position: buffer.chars.length
            });
            
            // Render character with glow burst
            const charSpan = createCharElement(char, true);
            textLayer.appendChild(charSpan);
            
            // Create glow duplicate
            const glowSpan = createCharElement(char, false);
            glowSpan.classList.add('phosphor-char-glow');
            glowLayer.appendChild(glowSpan);
            
            // Update caret position
            updateCaretPosition(caretLayer, buffer);
            
            // Accumulate burn-in
            if (buffer.config.burnInEnabled) {
                accumulateBurnIn(buffer, buffer.chars.length - 1, char);
            }
            
            // Auto-scroll to keep newest output visible
            // Assumes the phosphor element itself is the scroll container
            if (typeof element.scrollTop === 'number') {
                element.scrollTop = element.scrollHeight;
            }

            // Variable delay for organic feel, unless speed <= 0 (instant block mode)
            if (config.speed > 0) {
                const delay = config.speed + (Math.random() - 0.5) * config.variance * 2;
                await sleep(Math.max(10, delay));
            }

            // Remove initial burst glow
            charSpan.classList.remove('phosphor-char-burst');
        }
        
        if (config.callback) {
            config.callback();
        }
    }
    
    /**
     * Write text instantly (no animation)
     */
    function setText(element, text) {
        const buffer = textBuffers.get(element);
        if (!buffer) return;
        
        const textLayer = element.querySelector('.phosphor-text-layer');
        const glowLayer = element.querySelector('.phosphor-glow-layer');
        const caretLayer = element.querySelector('.phosphor-caret-layer');
        
        // Clear existing
        textLayer.innerHTML = '';
        glowLayer.innerHTML = '';
        buffer.chars = [];
        
        // Add all characters
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            buffer.chars.push({
                char,
                time: performance.now(),
                intensity: 1.0,
                position: i
            });
            
            const charSpan = createCharElement(char, false);
            textLayer.appendChild(charSpan);
            
            const glowSpan = createCharElement(char, false);
            glowSpan.classList.add('phosphor-char-glow');
            glowLayer.appendChild(glowSpan);
        }
        
        updateCaretPosition(caretLayer, buffer);

        // Ensure latest text is visible
        if (typeof element.scrollTop === 'number') {
            element.scrollTop = element.scrollHeight;
        }
    }
    
    /**
     * Clear display with phosphor decay effect
     */
    async function clearWithDecay(element, options = {}) {
        const buffer = textBuffers.get(element);
        if (!buffer) return;
        
        const textLayer = element.querySelector('.phosphor-text-layer');
        const glowLayer = element.querySelector('.phosphor-glow-layer');
        const ghostLayer = element.querySelector('.phosphor-ghost-layer');
        
        // Move current text to ghost layer for decay
        const currentChars = textLayer.querySelectorAll('.phosphor-char');
        currentChars.forEach((char, i) => {
            const ghost = char.cloneNode(true);
            ghost.classList.add('phosphor-ghost');
            ghost.style.animationDelay = (i * 10) + 'ms';
            ghostLayer.appendChild(ghost);
        });
        
        // Clear main layers
        textLayer.innerHTML = '';
        glowLayer.innerHTML = '';
        buffer.chars = [];
        
        // Clean up ghosts after decay
        setTimeout(() => {
            ghostLayer.innerHTML = '';
        }, 2000);
    }
    
    /**
     * Create a character element
     */
    function createCharElement(char, withBurst = false) {
        const span = document.createElement('span');
        span.className = 'phosphor-char' + (withBurst ? ' phosphor-char-burst' : '');
        span.textContent = char === ' ' ? '\u00A0' : char; // Non-breaking space for spaces
        span.dataset.char = char;
        return span;
    }
    
    /**
     * Update caret position and render
     */
    function updateCaretPosition(caretLayer, buffer) {
        if (!buffer.config.showCaret) return;
        
        // Store ghost position
        const existingCaret = caretLayer.querySelector('.phosphor-caret');
        if (existingCaret) {
            const ghost = existingCaret.cloneNode(true);
            ghost.classList.remove('phosphor-caret');
            ghost.classList.add('phosphor-caret-ghost');
            caretLayer.appendChild(ghost);
            
            // Remove ghost after decay
            setTimeout(() => ghost.remove(), 500);
        }
        
        caretLayer.innerHTML = '';
        
        // Create new caret
        const caret = document.createElement('span');
        caret.className = 'phosphor-caret';
        caret.textContent = buffer.config.caretChar;
        caret.style.setProperty('--caret-position', buffer.chars.length);
        caretLayer.appendChild(caret);
    }
    
    /**
     * Accumulate burn-in at a position
     */
    function accumulateBurnIn(buffer, position, char) {
        const key = `${position}:${char}`;
        const current = buffer.burnIn.get(key) || 0;
        buffer.burnIn.set(key, Math.min(1, current + buffer.config.burnInRate));
    }
    
    /**
     * Render burn-in layer
     */
    function renderBurnIn(element, buffer) {
        const burnLayer = element.querySelector('.phosphor-burn-layer');
        if (!burnLayer || !buffer.config.burnInEnabled) return;
        
        // Decay existing burn-in
        buffer.burnIn.forEach((intensity, key) => {
            const newIntensity = intensity - buffer.config.burnInDecay;
            if (newIntensity <= 0) {
                buffer.burnIn.delete(key);
            } else {
                buffer.burnIn.set(key, newIntensity);
            }
        });
        
        // Render burn-in characters
        let burnHtml = '';
        buffer.burnIn.forEach((intensity, key) => {
            const [pos, char] = key.split(':');
            if (intensity > 0.1) {
                burnHtml += `<span class="phosphor-burn-char" style="--burn-intensity: ${intensity}; --burn-position: ${pos}">${char}</span>`;
            }
        });
        burnLayer.innerHTML = burnHtml;
    }
    
    /**
     * Animation loop
     */
    function animate() {
        const now = performance.now();
        const delta = now - lastTime;
        lastTime = now;
        
        // Update caret blink
        caretPhase += delta;
        
        // Update all phosphor displays
        textBuffers.forEach((buffer, element) => {
            // Caret blink
            if (buffer.config.showCaret) {
                const caretLayer = element.querySelector('.phosphor-caret-layer');
                const caret = caretLayer?.querySelector('.phosphor-caret');
                if (caret) {
                    const blinkCycle = caretPhase % (buffer.config.caretBlinkRate * 2);
                    const isOn = blinkCycle < buffer.config.caretBlinkRate;
                    
                    // Smooth phosphor-style transition instead of hard blink
                    const phase = blinkCycle / (buffer.config.caretBlinkRate * 2);
                    const intensity = isOn 
                        ? 1.0 - (phase * currentPhosphor.persistence * 2)
                        : Math.max(0, 1.0 - ((phase - 0.5) * 2) + currentPhosphor.persistence);
                    
                    caret.style.opacity = Math.max(0.1, Math.min(1, intensity));
                }
            }
            
            // Flicker effect
            if (buffer.config.flickerEnabled) {
                const flickerOverlay = element.querySelector('.phosphor-flicker-overlay');
                if (flickerOverlay && Math.random() < 0.05) {
                    const flickerAmount = Math.random() * buffer.config.flickerIntensity;
                    flickerOverlay.style.opacity = flickerAmount;
                    setTimeout(() => {
                        flickerOverlay.style.opacity = 0;
                    }, 50 + Math.random() * 100);
                }
            }
            
            // Update burn-in
            if (buffer.config.burnInEnabled && delta > 100) {
                renderBurnIn(element, buffer);
            }
        });
        
        animationFrame = requestAnimationFrame(animate);
    }
    
    /**
     * Trigger a screen interference effect
     */
    function triggerInterference(element, intensity = 0.5, duration = 200) {
        element.classList.add('phosphor-interference');
        element.style.setProperty('--interference-intensity', intensity);
        
        setTimeout(() => {
            element.classList.remove('phosphor-interference');
        }, duration);
    }
    
    /**
     * Trigger horizontal sync loss effect
     */
    function triggerHSync(element, duration = 300) {
        element.classList.add('phosphor-hsync-loss');
        
        setTimeout(() => {
            element.classList.remove('phosphor-hsync-loss');
        }, duration);
    }
    
    /**
     * Set phosphor type
     */
    function setPhosphor(element, phosphorType) {
        const phosphor = PHOSPHOR_PRESETS[phosphorType] || PHOSPHOR_PRESETS.p3;
        currentPhosphor = phosphor;
        
        element.style.setProperty('--phosphor-primary', phosphor.primary);
        element.style.setProperty('--phosphor-glow', phosphor.glow);
        element.style.setProperty('--phosphor-dim', phosphor.dim);
        element.style.setProperty('--phosphor-decay', phosphor.decay);
        element.style.setProperty('--phosphor-persistence', phosphor.persistence);
    }
    
    /**
     * Create a complete terminal display
     */
    function createTerminal(container, options = {}) {
        const config = {
            rows: options.rows || 24,
            cols: options.cols || 80,
            phosphor: options.phosphor || 'p3',
            prompt: options.prompt || '> ',
            ...options
        };
        
        const terminal = document.createElement('div');
        terminal.className = 'phosphor-terminal';
        terminal.style.setProperty('--terminal-rows', config.rows);
        terminal.style.setProperty('--terminal-cols', config.cols);
        
        container.appendChild(terminal);
        init(terminal, config);
        
        return {
            element: terminal,
            type: (text, opts) => typeText(terminal, text, opts),
            print: (text) => setText(terminal, text),
            clear: (opts) => clearWithDecay(terminal, opts),
            setPhosphor: (type) => setPhosphor(terminal, type),
            interference: (i, d) => triggerInterference(terminal, i, d),
            hsync: (d) => triggerHSync(terminal, d)
        };
    }
    
    // Utility
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Cleanup
    function destroy(element) {
        textBuffers.delete(element);
        if (textBuffers.size === 0 && animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    }
    
    return {
        init,
        typeText,
        setText,
        clearWithDecay,
        triggerInterference,
        triggerHSync,
        setPhosphor,
        createTerminal,
        destroy,
        PHOSPHOR_PRESETS
    };
})();
