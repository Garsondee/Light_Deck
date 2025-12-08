/**
 * CompleteScreen - Final onboarding completion screen
 * 
 * Shows a brief welcome message and saves the character.
 * This is a transitional screen that auto-completes.
 */

const CompleteScreen = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    const state = {
        characterData: null,
        saving: false,
        saved: false,
        error: null,
        
        // Callbacks
        onComplete: null
    };
    
    // Style
    const style = {
        fontFamily: 'IBM Plex Mono, Courier New, monospace',
        fontSize: 16,
        lineHeight: 1.5,
        textColor: '#ffaa00',
        dimColor: '#885500',
        highlightColor: '#ffcc44',
        successColor: '#00ff88',
        errorColor: '#ff4444',
        backgroundColor: '#0a0a0a'
    };
    
    let animationStart = 0;
    
    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create a new complete screen instance
     */
    function create(options = {}) {
        state.onComplete = options.onComplete || null;
        state.characterData = options.characterData || null;
        
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
            
            // Allow setting character data
            setCharacterData: (data) => { state.characterData = data; }
        };
    }
    
    /**
     * Called when screen becomes active
     */
    async function enter() {
        console.log('[CompleteScreen] Entered');
        
        state.saving = true;
        state.saved = false;
        state.error = null;
        animationStart = Date.now();
        
        // Save character
        await saveCharacter();
        
        // Auto-complete after a brief delay
        setTimeout(() => {
            complete();
        }, 2500);
    }
    
    /**
     * Called when leaving screen
     */
    function exit() {
        console.log('[CompleteScreen] Exited');
    }
    
    /**
     * Save character to server and localStorage
     */
    async function saveCharacter() {
        if (!state.characterData) {
            state.error = 'No character data to save';
            state.saving = false;
            return;
        }
        
        try {
            // Save to server
            const response = await fetch('/api/characters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state.characterData)
            });
            
            if (response.ok) {
                console.log('[CompleteScreen] Character saved to server');
            } else {
                console.warn('[CompleteScreen] Server save failed, continuing with localStorage');
            }
        } catch (err) {
            console.warn('[CompleteScreen] Server save error:', err);
        }
        
        // Save to localStorage
        try {
            const existing = JSON.parse(localStorage.getItem('lightdeck_characters') || '[]');
            const filtered = existing.filter(c => c.id !== state.characterData.id);
            filtered.unshift(state.characterData);
            const trimmed = filtered.slice(0, 10);
            
            localStorage.setItem('lightdeck_characters', JSON.stringify(trimmed));
            localStorage.setItem('lightdeck_active_character', state.characterData.id);
            
            console.log('[CompleteScreen] Character saved to localStorage');
            state.saved = true;
        } catch (err) {
            console.error('[CompleteScreen] localStorage save error:', err);
            state.error = 'Failed to save character locally';
        }
        
        state.saving = false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UPDATE & RENDER
    // ═══════════════════════════════════════════════════════════════════
    
    function update(dt) {
        // Nothing to update
    }
    
    function needsRender() {
        return true;
    }
    
    function render(ctx, layout) {
        const padding = layout.padding || 40;
        const centerX = layout.width / 2;
        const centerY = layout.height / 2;
        
        // Clear background
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(0, 0, layout.width, layout.height);
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.textAlign = 'center';
        
        // Get character name/handle
        const name = state.characterData?.identity?.handle || 
                     state.characterData?.identity?.name || 
                     state.characterData?.handle ||
                     state.characterData?.name ||
                     'choom';
        
        // Title
        ctx.fillStyle = style.textColor;
        ctx.fillText('═══════════════════════════════════════════════════════════', centerX, centerY - 100);
        
        ctx.fillStyle = style.successColor;
        ctx.font = `bold ${style.fontSize + 4}px ${style.fontFamily}`;
        ctx.fillText(`Welcome to the sprawl, ${name}.`, centerX, centerY - 60);
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.fillStyle = style.textColor;
        ctx.fillText('═══════════════════════════════════════════════════════════', centerX, centerY - 20);
        
        // Status message
        ctx.fillStyle = style.dimColor;
        
        if (state.saving) {
            const dots = '.'.repeat((Math.floor((Date.now() - animationStart) / 300) % 4));
            ctx.fillText(`Saving character${dots}`, centerX, centerY + 40);
        } else if (state.error) {
            ctx.fillStyle = style.errorColor;
            ctx.fillText(state.error, centerX, centerY + 40);
        } else if (state.saved) {
            ctx.fillStyle = style.successColor;
            ctx.fillText('Character saved successfully.', centerX, centerY + 40);
            ctx.fillStyle = style.dimColor;
            ctx.fillText('Entering the world...', centerX, centerY + 70);
        }
        
        // Flavor text
        ctx.fillStyle = style.dimColor;
        ctx.font = `italic ${style.fontSize - 2}px ${style.fontFamily}`;
        ctx.fillText('"The city never sleeps. Neither should you."', centerX, centerY + 120);
        
        ctx.textAlign = 'left';
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // INPUT HANDLING
    // ═══════════════════════════════════════════════════════════════════
    
    function handleClick(x, y) {
        // Always allow click to proceed past this screen, even if
        // saving is still in progress or encountered an error.
        complete();
        return true;
    }
    
    function handleMouseMove(x, y) {
        return 'default';
    }
    
    function handleKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            // Allow keyboard to immediately advance regardless of
            // save status so players never get stuck here.
            complete();
            return true;
        }
        return false;
    }
    
    function handleCommand(cmd, args) {
        if (cmd === 'continue' || cmd === 'enter') {
            // Terminal commands should also always be able to
            // advance from this screen, independent of save state.
            complete();
            return true;
        }
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════════
    
    function complete() {
        console.log('[CompleteScreen] Onboarding complete');
        
        if (state.onComplete) {
            state.onComplete(state.characterData);
        }
        
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:complete', state.characterData);
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
        setCharacterData: (data) => { state.characterData = data; },
        isSaved: () => state.saved
    };
    
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CompleteScreen;
}
