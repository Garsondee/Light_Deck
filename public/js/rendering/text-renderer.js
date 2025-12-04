/**
 * TextRenderer - Canvas-based text rendering with phosphor effects
 * 
 * This is the foundation for ALL text in the application.
 * Terminal, chat, dice results - everything uses this.
 * 
 * Features:
 * - Phosphor glow effect (multi-pass blur)
 * - Configurable colors (amber, green, white, custom)
 * - Caret rendering with intensity control
 * - Line-by-line rendering with proper spacing
 * - High-DPI support
 */

const TextRenderer = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // PHOSPHOR PRESETS
    // ═══════════════════════════════════════════════════════════════════
    
    const PHOSPHOR_PRESETS = {
        p1: { // Classic green (P1 phosphor)
            primary: '#33ff33',
            glow: '#00ff00',
            dim: '#003300',
            name: 'Green P1'
        },
        p3: { // Amber (P3 phosphor)
            primary: '#ffaa00',
            glow: '#ffcc44',
            dim: '#4a3000',
            name: 'Amber P3'
        },
        p4: { // White (P4 phosphor)
            primary: '#ffffff',
            glow: '#ffffff',
            dim: '#444444',
            name: 'White P4'
        },
        p31: { // Blue-white (P31 phosphor)
            primary: '#aaccff',
            glow: '#ffffff',
            dim: '#334455',
            name: 'Blue P31'
        }
    };
    
    // Default configuration
    const defaultConfig = {
        fontFamily: 'IBM Plex Mono, Courier New, monospace',
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: 0,
        phosphor: 'p3',
        glowIntensity: 0.8,
        glowPasses: 3,
        glowRadius: 4
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // CANVAS CREATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create a canvas for text rendering
     * @param {number} width - Canvas width in pixels
     * @param {number} height - Canvas height in pixels
     * @param {Object} options - Configuration options
     * @returns {Object} { canvas, ctx, config }
     */
    function createCanvas(width, height, options = {}) {
        const canvas = document.createElement('canvas');
        const dpr = options.dpr || window.devicePixelRatio || 1;
        
        // Set actual size in memory (scaled for high-DPI)
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        // Set display size
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        const ctx = canvas.getContext('2d');
        
        // Scale context for high-DPI
        ctx.scale(dpr, dpr);
        
        // Build config from defaults + options
        const config = {
            ...defaultConfig,
            ...options,
            width,
            height,
            dpr
        };
        
        // Resolve phosphor preset
        if (typeof config.phosphor === 'string') {
            config.phosphorColors = PHOSPHOR_PRESETS[config.phosphor] || PHOSPHOR_PRESETS.p3;
        } else {
            config.phosphorColors = config.phosphor;
        }
        
        return { canvas, ctx, config };
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // CLEARING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Clear the canvas with a background color
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} config
     * @param {string} color - Background color (default: near-black)
     */
    function clear(ctx, config, color = '#0a0a0a') {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, config.width, config.height);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // TEXT RENDERING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Render a single line of text with phosphor glow
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text - Text to render
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} config - Rendering config
     * @param {Object} options - Per-call options (override config)
     */
    function renderLine(ctx, text, x, y, config, options = {}) {
        const colors = options.phosphorColors || config.phosphorColors;
        const fontSize = options.fontSize || config.fontSize;
        const fontFamily = options.fontFamily || config.fontFamily;
        const fontWeight = options.fontWeight || config.fontWeight;
        const glowIntensity = options.glowIntensity ?? config.glowIntensity;
        const glowPasses = options.glowPasses ?? config.glowPasses;
        const glowRadius = options.glowRadius ?? config.glowRadius;
        
        // Set font
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textBaseline = 'top';
        
        // Render glow passes (back to front, larger blur first)
        if (glowIntensity > 0 && glowPasses > 0) {
            ctx.save();
            ctx.fillStyle = colors.glow;
            
            for (let i = glowPasses; i >= 1; i--) {
                const blur = glowRadius * (i / glowPasses);
                const alpha = glowIntensity * (1 - (i - 1) / glowPasses) * 0.5;
                
                ctx.shadowColor = colors.glow;
                ctx.shadowBlur = blur;
                ctx.globalAlpha = alpha;
                ctx.fillText(text, x, y);
            }
            
            ctx.restore();
        }
        
        // Render main text (sharp, on top)
        ctx.fillStyle = colors.primary;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.fillText(text, x, y);
    }
    
    /**
     * Render multiple lines of text
     * @param {CanvasRenderingContext2D} ctx
     * @param {string[]} lines - Array of text lines
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {Object} config - Rendering config
     * @param {Object} options - Per-call options
     */
    function renderLines(ctx, lines, x, y, config, options = {}) {
        const fontSize = options.fontSize || config.fontSize;
        const lineHeight = options.lineHeight || config.lineHeight;
        const lineSpacing = fontSize * lineHeight;
        
        lines.forEach((line, i) => {
            renderLine(ctx, line, x, y + i * lineSpacing, config, options);
        });
    }
    
    /**
     * Render text with automatic line wrapping
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text - Text to render (may contain \n)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} maxWidth - Maximum width before wrapping
     * @param {Object} config - Rendering config
     * @param {Object} options - Per-call options
     * @returns {number} Total height used
     */
    function renderWrappedText(ctx, text, x, y, maxWidth, config, options = {}) {
        const fontSize = options.fontSize || config.fontSize;
        const fontFamily = options.fontFamily || config.fontFamily;
        const fontWeight = options.fontWeight || config.fontWeight;
        const lineHeight = options.lineHeight || config.lineHeight;
        const lineSpacing = fontSize * lineHeight;
        
        // Set font for measurement
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        
        const lines = [];
        const paragraphs = text.split('\n');
        
        paragraphs.forEach(paragraph => {
            if (paragraph === '') {
                lines.push('');
                return;
            }
            
            const words = paragraph.split(' ');
            let currentLine = '';
            
            words.forEach(word => {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                const metrics = ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });
            
            if (currentLine) {
                lines.push(currentLine);
            }
        });
        
        renderLines(ctx, lines, x, y, config, options);
        
        return lines.length * lineSpacing;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // CARET RENDERING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Render a blinking caret
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} intensity - Blink intensity (0-1)
     * @param {Object} config - Rendering config
     * @param {Object} options - Per-call options
     */
    function renderCaret(ctx, x, y, intensity, config, options = {}) {
        const colors = options.phosphorColors || config.phosphorColors;
        const fontSize = options.fontSize || config.fontSize;
        const caretWidth = options.caretWidth || fontSize * 0.6;
        const caretHeight = options.caretHeight || fontSize;
        const glowIntensity = options.glowIntensity ?? config.glowIntensity;
        
        // Skip if invisible
        if (intensity <= 0) return;
        
        ctx.save();
        
        // Glow effect for caret
        if (glowIntensity > 0) {
            ctx.shadowColor = colors.glow;
            ctx.shadowBlur = 8 * intensity;
        }
        
        // Draw caret block
        ctx.fillStyle = colors.primary;
        ctx.globalAlpha = intensity;
        ctx.fillRect(x, y, caretWidth, caretHeight);
        
        ctx.restore();
    }
    
    /**
     * Render a text cursor (vertical line style)
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} intensity - Blink intensity (0-1)
     * @param {Object} config - Rendering config
     * @param {Object} options - Per-call options
     */
    function renderCursor(ctx, x, y, intensity, config, options = {}) {
        const colors = options.phosphorColors || config.phosphorColors;
        const fontSize = options.fontSize || config.fontSize;
        const cursorWidth = options.cursorWidth || 2;
        const cursorHeight = options.cursorHeight || fontSize;
        const glowIntensity = options.glowIntensity ?? config.glowIntensity;
        
        if (intensity <= 0) return;
        
        ctx.save();
        
        if (glowIntensity > 0) {
            ctx.shadowColor = colors.glow;
            ctx.shadowBlur = 6 * intensity;
        }
        
        ctx.fillStyle = colors.primary;
        ctx.globalAlpha = intensity;
        ctx.fillRect(x, y, cursorWidth, cursorHeight);
        
        ctx.restore();
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // MEASUREMENT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Measure text width
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {Object} config
     * @param {Object} options
     * @returns {number} Width in pixels
     */
    function measureText(ctx, text, config, options = {}) {
        const fontSize = options.fontSize || config.fontSize;
        const fontFamily = options.fontFamily || config.fontFamily;
        const fontWeight = options.fontWeight || config.fontWeight;
        
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        return ctx.measureText(text).width;
    }
    
    /**
     * Get the width of a single character (for monospace fonts)
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} config
     * @param {Object} options
     * @returns {number} Character width in pixels
     */
    function getCharWidth(ctx, config, options = {}) {
        return measureText(ctx, 'M', config, options);
    }
    
    /**
     * Get line height in pixels
     * @param {Object} config
     * @param {Object} options
     * @returns {number} Line height in pixels
     */
    function getLineHeight(config, options = {}) {
        const fontSize = options.fontSize || config.fontSize;
        const lineHeight = options.lineHeight || config.lineHeight;
        return fontSize * lineHeight;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SPECIAL EFFECTS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Apply a scanline overlay effect
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} config
     * @param {number} intensity - Scanline intensity (0-1)
     * @param {number} spacing - Pixels between scanlines
     */
    function applyScanlines(ctx, config, intensity = 0.1, spacing = 2) {
        if (intensity <= 0) return;
        
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${intensity})`;
        
        for (let y = 0; y < config.height; y += spacing) {
            ctx.fillRect(0, y, config.width, 1);
        }
        
        ctx.restore();
    }
    
    /**
     * Apply a noise/static effect
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} config
     * @param {number} intensity - Noise intensity (0-1)
     */
    function applyNoise(ctx, config, intensity = 0.05) {
        if (intensity <= 0) return;
        
        const imageData = ctx.getImageData(0, 0, config.width * config.dpr, config.height * config.dpr);
        const data = imageData.data;
        const amount = intensity * 50;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * amount;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        // Presets
        PHOSPHOR_PRESETS,
        
        // Canvas management
        createCanvas,
        clear,
        
        // Text rendering
        renderLine,
        renderLines,
        renderWrappedText,
        
        // Caret/cursor
        renderCaret,
        renderCursor,
        
        // Measurement
        measureText,
        getCharWidth,
        getLineHeight,
        
        // Effects
        applyScanlines,
        applyNoise
    };
})();

console.log('[TextRenderer] Module loaded');
