/**
 * BootScreen - Initial loading/boot sequence screen
 * 
 * Displays:
 * - Fade from black
 * - ASCII "Light Deck" logo animation
 * - Loading progress bar
 * - "Press any key to continue" prompt
 * 
 * This is the first screen shown during onboarding.
 */

const BootScreen = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // ASCII ART
    // ═══════════════════════════════════════════════════════════════════
    
    // Light Deck logo in ASCII art (block letters)
    const LOGO_LINES = [
        '██╗     ██╗ ██████╗ ██╗  ██╗████████╗',
        '██║     ██║██╔════╝ ██║  ██║╚══██╔══╝',
        '██║     ██║██║  ███╗███████║   ██║   ',
        '██║     ██║██║   ██║██╔══██║   ██║   ',
        '███████╗██║╚██████╔╝██║  ██║   ██║   ',
        '╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ',
        '                                      ',
        '██████╗ ███████╗ ██████╗██╗  ██╗     ',
        '██╔══██╗██╔════╝██╔════╝██║ ██╔╝     ',
        '██║  ██║█████╗  ██║     █████╔╝      ',
        '██║  ██║██╔══╝  ██║     ██╔═██╗      ',
        '██████╔╝███████╗╚██████╗██║  ██╗     ',
        '╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝     '
    ];
    
    // Boot messages that appear during loading
    const BOOT_MESSAGES = [
        { text: 'MERIDIAN SYSTEMS CORP. BIOS v3.2.1', delay: 0 },
        { text: 'Copyright (c) 2157 Meridian Systems', delay: 100 },
        { text: '', delay: 200 },
        { text: 'Initializing neural interface...', delay: 400 },
        { text: '[OK] Cortical link established', delay: 800 },
        { text: '[OK] Optic feed synchronized', delay: 1000 },
        { text: '[OK] Audio subsystem online', delay: 1200 },
        { text: '[OK] Haptic feedback calibrated', delay: 1400 },
        { text: '', delay: 1600 },
        { text: 'Loading identity protocols...', delay: 1800 },
        { text: '[OK] SIN database connected', delay: 2200 },
        { text: '[OK] Credential forge ready', delay: 2400 },
        { text: '', delay: 2600 },
        { text: 'System ready.', delay: 2800 }
    ];
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    const state = {
        phase: 'logo',  // 'logo', 'boot', 'ready'
        
        // Logo animation
        logoRevealProgress: 0,
        logoFullyRevealed: false,
        
        // Boot sequence
        bootStartTime: 0,
        visibleMessages: [],
        bootComplete: false,
        
        // Loading bar
        loadingProgress: 0,
        
        // Ready state
        promptVisible: true,
        promptBlinkTimer: 0,
        
        // Timing
        startTime: 0,
        elapsed: 0,
        
        // Callbacks
        onComplete: null
    };
    
    // Style configuration
    const style = {
        fontFamily: 'IBM Plex Mono, Courier New, monospace',
        fontSize: 16,
        lineHeight: 1.3,
        
        // Colors
        logoColor: '#ffaa00',
        logoGlow: '#ffcc44',
        textColor: '#ffaa00',
        dimColor: '#885500',
        okColor: '#44ff44',
        
        // Glow
        glowRadius: 8,
        glowIntensity: 0.6
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create a new boot screen instance
     * @param {Object} options - Configuration options
     * @returns {Object} Screen instance
     */
    function create(options = {}) {
        const instance = {
            // Lifecycle methods
            enter,
            exit,
            update,
            render,
            needsRender,
            
            // Input handlers
            handleClick,
            handleKeyDown,
            handleCommand,
            
            // State access
            isComplete: () => state.phase === 'ready' && state.bootComplete,
            
            // Callbacks
            onComplete: options.onComplete || null
        };
        
        state.onComplete = options.onComplete || null;
        
        return instance;
    }
    
    /**
     * Called when screen becomes active
     */
    function enter() {
        // Reset state
        state.phase = 'logo';
        state.logoRevealProgress = 0;
        state.logoFullyRevealed = false;
        state.bootStartTime = 0;
        state.visibleMessages = [];
        state.bootComplete = false;
        state.loadingProgress = 0;
        state.promptVisible = true;
        state.promptBlinkTimer = 0;
        state.startTime = performance.now();
        state.elapsed = 0;
        
        console.log('[BootScreen] Entered');
    }
    
    /**
     * Called when leaving screen
     */
    function exit() {
        console.log('[BootScreen] Exited');
    }
    
    /**
     * Update screen state
     * @param {number} dt - Delta time in seconds
     */
    function update(dt) {
        state.elapsed = performance.now() - state.startTime;
        
        switch (state.phase) {
            case 'logo':
                updateLogoPhase(dt);
                break;
            case 'boot':
                updateBootPhase(dt);
                break;
            case 'ready':
                updateReadyPhase(dt);
                break;
        }
    }
    
    function updateLogoPhase(dt) {
        // Reveal logo character by character
        const totalChars = LOGO_LINES.reduce((sum, line) => sum + line.length, 0);
        const revealSpeed = 15;  // Characters per frame
        
        state.logoRevealProgress += revealSpeed;
        
        if (state.logoRevealProgress >= totalChars) {
            state.logoFullyRevealed = true;
            
            // Wait a moment, then transition to boot phase
            setTimeout(() => {
                state.phase = 'boot';
                state.bootStartTime = performance.now();
            }, 500);
        }
    }
    
    function updateBootPhase(dt) {
        const bootElapsed = performance.now() - state.bootStartTime;
        
        // Show messages based on timing
        state.visibleMessages = BOOT_MESSAGES.filter(msg => bootElapsed >= msg.delay);
        
        // Update loading progress
        const totalDuration = BOOT_MESSAGES[BOOT_MESSAGES.length - 1].delay + 500;
        state.loadingProgress = Math.min(1, bootElapsed / totalDuration);
        
        // Check if boot complete
        if (bootElapsed >= totalDuration && !state.bootComplete) {
            state.bootComplete = true;
            state.phase = 'ready';
        }
    }
    
    function updateReadyPhase(dt) {
        // Blink the prompt
        state.promptBlinkTimer += dt * 1000;
        state.promptVisible = Math.floor(state.promptBlinkTimer / 500) % 2 === 0;
    }
    
    /**
     * Check if screen needs re-render
     */
    function needsRender() {
        // Always needs render during animations
        return state.phase !== 'ready' || true;  // Prompt blinks
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Render the screen
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} layout - Layout dimensions
     */
    function render(ctx, layout) {
        // Clear background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, layout.width, layout.height);
        
        switch (state.phase) {
            case 'logo':
                renderLogoPhase(ctx, layout);
                break;
            case 'boot':
                renderBootPhase(ctx, layout);
                break;
            case 'ready':
                renderReadyPhase(ctx, layout);
                break;
        }
    }
    
    function renderLogoPhase(ctx, layout) {
        // Logo-only stage: center logo slightly higher for cinematic feel
        renderLogo(ctx, layout, state.logoRevealProgress, -60);
    }
    
    function renderBootPhase(ctx, layout) {
        // Stage 2: logo plus boot log + loading bar
        // Move logo a bit higher to make room for the log
        renderLogo(ctx, layout, Infinity, -110);
        
        const logoHeight = LOGO_LINES.length * style.fontSize * style.lineHeight;
        const logoCenterY = (layout.height - logoHeight) / 2 - 110;
        const logoBottomY = logoCenterY + logoHeight;
        
        // Reserve space above the loading bar for messages
        const loadingBarMetrics = getLoadingBarMetrics(layout);
        const messagesTopY = logoBottomY + 32;
        const messagesBottomY = loadingBarMetrics.y - 24;
        
        renderBootMessages(ctx, layout, messagesTopY, messagesBottomY);
        
        // Render loading bar at bottom
        renderLoadingBar(ctx, layout);
    }
    
    function renderReadyPhase(ctx, layout) {
        // Render full logo higher to keep everything on one screen
        renderLogo(ctx, layout, Infinity, -110);
        
        const logoHeight = LOGO_LINES.length * style.fontSize * style.lineHeight;
        const logoCenterY = (layout.height - logoHeight) / 2 - 110;
        const logoBottomY = logoCenterY + logoHeight;
        
        const loadingBarMetrics = getLoadingBarMetrics(layout);
        const messagesTopY = logoBottomY + 32;
        const messagesBottomY = loadingBarMetrics.y - 24;
        
        renderBootMessages(ctx, layout, messagesTopY, messagesBottomY);
        
        // Render "Press any key" prompt
        if (state.promptVisible) {
            ctx.font = `${style.fontSize}px ${style.fontFamily}`;
            ctx.fillStyle = style.logoGlow;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const promptY = layout.height - 80;
            ctx.fillText('[ PRESS ANY KEY TO CONTINUE ]', layout.width / 2, promptY);
            
            ctx.textAlign = 'left';
        }
        
        // Full loading bar
        renderLoadingBar(ctx, layout, 1);
    }
    
    /**
     * Render the ASCII logo with optional reveal animation
     */
    function renderLogo(ctx, layout, revealChars, verticalOffset) {
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.textBaseline = 'top';
        
        // Calculate logo dimensions
        const logoWidth = ctx.measureText(LOGO_LINES[0]).width;
        const logoHeight = LOGO_LINES.length * style.fontSize * style.lineHeight;
        
        // Center the logo, allowing a caller-provided vertical offset
        const startX = (layout.width - logoWidth) / 2;
        const baseY = (layout.height - logoHeight) / 2;
        const startY = baseY + (verticalOffset !== undefined ? verticalOffset : -60);
        
        let charCount = 0;
        
        for (let i = 0; i < LOGO_LINES.length; i++) {
            const line = LOGO_LINES[i];
            const y = startY + i * style.fontSize * style.lineHeight;
            
            for (let j = 0; j < line.length; j++) {
                if (charCount >= revealChars) return;
                
                const char = line[j];
                if (char !== ' ') {
                    const x = startX + j * ctx.measureText('█').width;
                    
                    // Draw glow
                    ctx.shadowColor = style.logoGlow;
                    ctx.shadowBlur = style.glowRadius;
                    ctx.fillStyle = style.logoColor;
                    ctx.fillText(char, x, y);
                    
                    // Draw solid
                    ctx.shadowBlur = 0;
                    ctx.fillText(char, x, y);
                }
                
                charCount++;
            }
        }
    }
    
    /**
     * Render boot messages, constrained to available vertical space.
     * Only the most recent lines that fit are drawn so content never
     * flows off the bottom of the screen.
     */
    function renderBootMessages(ctx, layout, startY, maxY) {
        ctx.font = `14px ${style.fontFamily}`;
        ctx.textBaseline = 'top';
        ctx.shadowBlur = 0;
        
        const lineHeight = 18;
        const startX = layout.padding || 40;
        const availableHeight = (maxY !== undefined ? maxY : layout.height - 160) - startY;
        const maxLines = Math.max(1, Math.floor(availableHeight / lineHeight));

        // Take only the last N messages that can fit
        const messages = state.visibleMessages.slice(-maxLines);
        
        messages.forEach((msg, i) => {
            const y = startY + i * lineHeight;
            
            // Color based on content
            if (msg.text.startsWith('[OK]')) {
                ctx.fillStyle = style.okColor;
            } else if (msg.text === '') {
                return;  // Skip empty lines
            } else {
                ctx.fillStyle = style.textColor;
            }
            
            ctx.fillText(msg.text, startX, y);
        });
    }
    
    /**
     * Render loading bar
     */
    function renderLoadingBar(ctx, layout, overrideProgress) {
        const progress = overrideProgress !== undefined ? overrideProgress : state.loadingProgress;
        
        const metrics = getLoadingBarMetrics(layout);
        const barX = metrics.x;
        const barY = metrics.y;
        const barWidth = metrics.width;
        const barHeight = metrics.height;
        
        // Draw border
        ctx.strokeStyle = style.dimColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Draw fill
        const fillWidth = Math.floor(progress * (barWidth - 4));
        ctx.fillStyle = style.logoColor;
        ctx.fillRect(barX + 2, barY + 2, fillWidth, barHeight - 4);
        
        // Draw percentage
        ctx.font = `12px ${style.fontFamily}`;
        ctx.fillStyle = style.textColor;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(progress * 100)}%`, layout.width / 2, barY + barHeight + 8);
        ctx.textAlign = 'left';
    }

    /**
     * Compute loading bar layout so other elements can reserve space.
     */
    function getLoadingBarMetrics(layout) {
        const barWidth = 400;
        const barHeight = 12;
        const barX = (layout.width - barWidth) / 2;
        const barY = layout.height - 120;
        return { x: barX, y: barY, width: barWidth, height: barHeight };
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // INPUT HANDLING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Handle click
     */
    function handleClick(x, y) {
        if (state.phase === 'ready') {
            complete();
            return true;
        }
        
        // Skip to ready if in boot phase
        if (state.phase === 'boot') {
            skipToReady();
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle key press
     */
    function handleKeyDown(event) {
        if (state.phase === 'ready') {
            complete();
            return true;
        }
        
        // Skip to ready if in boot phase
        if (state.phase === 'boot' || state.phase === 'logo') {
            skipToReady();
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle terminal command
     */
    function handleCommand(cmd, args) {
        // 'continue' or 'skip' advances
        if (cmd === 'continue' || cmd === 'skip') {
            if (state.phase === 'ready') {
                complete();
            } else {
                skipToReady();
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * Skip animations and go to ready state
     */
    function skipToReady() {
        state.phase = 'ready';
        state.logoFullyRevealed = true;
        state.visibleMessages = BOOT_MESSAGES;
        state.loadingProgress = 1;
        state.bootComplete = true;
    }
    
    /**
     * Complete the boot screen and trigger callback
     */
    function complete() {
        console.log('[BootScreen] Complete');
        
        if (state.onComplete) {
            state.onComplete();
        }
        
        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:boot_complete');
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        create,
        
        // For direct use without create()
        enter,
        exit,
        update,
        render,
        needsRender,
        handleClick,
        handleKeyDown,
        handleCommand,
        
        // State
        isComplete: () => state.phase === 'ready' && state.bootComplete,
        getPhase: () => state.phase
    };
    
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BootScreen;
}
