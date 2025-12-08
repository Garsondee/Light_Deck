/**
 * PortraitPickerScreen - Character portrait selection with visual preview
 * 
 * Features:
 * - < > navigation buttons to cycle through portraits
 * - ASCII art preview of current portrait
 * - Portrait name and description
 * - Keyboard arrow navigation
 * - Terminal command support
 */

const PortraitPickerScreen = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let form = null;
    let portraits = [];
    let previewImage = null;
    let previewCanvas = null;
    let previewCtx = null;
    let asciiPreview = [];
    
    const state = {
        currentIndex: 0,
        selectedPortrait: null,
        loading: false,
        
        // Callbacks
        onComplete: null
    };
    
    // Preview configuration - now shows actual PNG images
    const preview = {
        width: 300,   // Pixels wide
        height: 300,  // Pixels tall
        imageLoaded: false
    };
    
    // Style
    const style = {
        fontFamily: 'IBM Plex Mono, Courier New, monospace',
        fontSize: 14,
        lineHeight: 1.2,
        textColor: '#ffaa00',
        dimColor: '#885500',
        highlightColor: '#ffcc44',
        backgroundColor: '#0a0a0a'
    };
    
    // Hit boxes for navigation
    const hitBoxes = {
        prev: null,
        next: null,
        accept: null
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create a new portrait picker screen instance
     */
    function create(options = {}) {
        state.onComplete = options.onComplete || null;
        state.currentIndex = options.initialIndex || 0;
        
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
            getSelectedPortrait: () => state.selectedPortrait,
            setPortraits: (p) => { portraits = p; }
        };
    }
    
    /**
     * Called when screen becomes active
     */
    async function enter() {
        console.log('[PortraitPickerScreen] Entered');
        
        // Create preview canvas for image processing
        previewCanvas = document.createElement('canvas');
        previewCanvas.width = preview.width;
        previewCanvas.height = preview.height;
        previewCtx = previewCanvas.getContext('2d');
        
        // Load portraits if not already loaded
        if (portraits.length === 0) {
            await loadPortraits();
        }
        
        // Create form elements
        createForm();
        
        // Load first portrait preview
        if (portraits.length > 0) {
            loadPortraitPreview(state.currentIndex);
        }
    }
    
    /**
     * Called when leaving screen
     */
    function exit() {
        console.log('[PortraitPickerScreen] Exited');
        previewImage = null;
    }
    
    /**
     * Load available portraits from server
     */
    async function loadPortraits() {
        state.loading = true;
        
        try {
            const response = await fetch('/api/portraits');
            if (response.ok) {
                portraits = await response.json();
                console.log('[PortraitPickerScreen] Loaded', portraits.length, 'portraits');
            }
        } catch (err) {
            console.warn('[PortraitPickerScreen] Failed to load portraits:', err);
            portraits = [];
        }
        
        state.loading = false;
    }
    
    /**
     * Create form elements
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
            text: '═══════════════════════════════════════════════════════════',
            x: 2,
            y: 1
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'title2',
            text: '  SELECT YOUR APPEARANCE',
            x: 2,
            y: 2
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'title3',
            text: '═══════════════════════════════════════════════════════════',
            x: 2,
            y: 3
        });
        
        // Terminal hint at bottom
        ASCIIFormRenderer.addDivider(form, {
            id: 'divider',
            x: 2,
            y: 32,
            width: 60
        });
        
        ASCIIFormRenderer.addLabel(form, {
            id: 'terminal_hint',
            text: 'Terminal: portrait <number> | Use arrow keys or click < >',
            x: 2,
            y: 33,
            dim: true
        });
    }
    
    /**
     * Load portrait image for preview
     */
    function loadPortraitPreview(index) {
        if (index < 0 || index >= portraits.length) return;
        
        const portrait = portraits[index];
        state.selectedPortrait = portrait;
        preview.imageLoaded = false;
        
        // Load image
        previewImage = new Image();
        previewImage.crossOrigin = 'anonymous';
        
        previewImage.onload = () => {
            console.log('[PortraitPickerScreen] Image loaded:', portrait.url);
            preview.imageLoaded = true;
        };
        
        previewImage.onerror = () => {
            console.warn('[PortraitPickerScreen] Failed to load portrait:', portrait.url);
            preview.imageLoaded = false;
        };
        
        previewImage.src = portrait.url;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════════
    
    function previousPortrait() {
        if (portraits.length === 0) return;
        
        state.currentIndex--;
        if (state.currentIndex < 0) {
            state.currentIndex = portraits.length - 1;
        }
        
        loadPortraitPreview(state.currentIndex);
        
        if (typeof OnboardingScreenManager !== 'undefined') {
            const portrait = portraits[state.currentIndex];
            OnboardingScreenManager.addLogLine(`Portrait ${state.currentIndex + 1}: ${portrait.name}`, 'system');
        }
    }
    
    function nextPortrait() {
        if (portraits.length === 0) return;
        
        state.currentIndex++;
        if (state.currentIndex >= portraits.length) {
            state.currentIndex = 0;
        }
        
        loadPortraitPreview(state.currentIndex);
        
        if (typeof OnboardingScreenManager !== 'undefined') {
            const portrait = portraits[state.currentIndex];
            OnboardingScreenManager.addLogLine(`Portrait ${state.currentIndex + 1}: ${portrait.name}`, 'system');
        }
    }
    
    function selectPortrait(index) {
        if (index < 0 || index >= portraits.length) {
            if (typeof OnboardingScreenManager !== 'undefined') {
                OnboardingScreenManager.addLogLine(`Invalid portrait number. Choose 1-${portraits.length}.`, 'error');
            }
            return;
        }
        
        state.currentIndex = index;
        loadPortraitPreview(index);
        
        if (typeof OnboardingScreenManager !== 'undefined') {
            const portrait = portraits[index];
            OnboardingScreenManager.addLogLine(`Selected: ${portrait.name}`, 'system');
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UPDATE & RENDER
    // ═══════════════════════════════════════════════════════════════════
    
    function update(dt) {
        // Nothing to update
    }
    
    function needsRender() {
        return true;  // Always render for smooth preview
    }
    
    function render(ctx, layout) {
        const padding = layout.padding || 40;
        
        // Clear background
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(0, 0, layout.width, layout.height);
        
        // Render form (title, hints)
        if (form) {
            ASCIIFormRenderer.render(ctx, form, padding, padding);
        }
        
        // Render portrait preview
        renderPortraitPreview(ctx, layout);
        
        // Render navigation controls
        renderNavigation(ctx, layout);
        
        // Render portrait info
        renderPortraitInfo(ctx, layout);
    }
    
    function renderPortraitPreview(ctx, layout) {
        const padding = layout.padding || 40;
        
        // Center the preview in the available space
        const centerX = layout.width / 2;
        const frameX = centerX - preview.width / 2;
        const frameY = padding + 80;
        
        // Draw frame border (amber colored)
        ctx.strokeStyle = style.textColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(frameX - 5, frameY - 5, preview.width + 10, preview.height + 10);
        
        // Draw inner border
        ctx.strokeStyle = style.dimColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(frameX - 2, frameY - 2, preview.width + 4, preview.height + 4);
        
        // Draw the actual portrait image
        if (previewImage && preview.imageLoaded) {
            // Calculate aspect-correct scaling
            const imgAspect = previewImage.width / previewImage.height;
            const previewAspect = preview.width / preview.height;
            
            let drawWidth = preview.width;
            let drawHeight = preview.height;
            let offsetX = 0;
            let offsetY = 0;
            
            if (imgAspect > previewAspect) {
                // Image is wider - fit to width
                drawHeight = preview.width / imgAspect;
                offsetY = (preview.height - drawHeight) / 2;
            } else {
                // Image is taller - fit to height
                drawWidth = preview.height * imgAspect;
                offsetX = (preview.width - drawWidth) / 2;
            }
            
            // Fill background
            ctx.fillStyle = '#111';
            ctx.fillRect(frameX, frameY, preview.width, preview.height);
            
            // Draw the image
            ctx.drawImage(previewImage, frameX + offsetX, frameY + offsetY, drawWidth, drawHeight);
        } else {
            // Show loading or error state
            ctx.fillStyle = '#111';
            ctx.fillRect(frameX, frameY, preview.width, preview.height);
            
            ctx.font = `${style.fontSize}px ${style.fontFamily}`;
            ctx.fillStyle = style.dimColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (portraits.length === 0) {
                ctx.fillText('No portraits available', centerX, frameY + preview.height / 2);
            } else {
                ctx.fillText('Loading...', centerX, frameY + preview.height / 2);
            }
            
            ctx.textAlign = 'left';
        }
    }
    
    function renderNavigation(ctx, layout) {
        const padding = layout.padding || 40;
        const centerX = layout.width / 2;
        // Position navigation below the portrait image
        const navY = padding + 80 + preview.height + 30;
        
        ctx.font = `20px ${style.fontFamily}`;
        ctx.textBaseline = 'middle';
        
        // Previous button - larger hit area
        const prevText = '[ < ]';
        const prevWidth = ctx.measureText(prevText).width;
        const prevX = centerX - 150;
        
        hitBoxes.prev = {
            x: prevX - 20,
            y: navY - 20,
            width: prevWidth + 40,
            height: 40
        };
        
        ctx.fillStyle = style.highlightColor;
        ctx.fillText(prevText, prevX, navY);
        
        // Portrait counter
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.fillStyle = style.textColor;
        ctx.textAlign = 'center';
        
        if (portraits.length > 0) {
            ctx.fillText(`Portrait ${state.currentIndex + 1} of ${portraits.length}`, centerX, navY);
        } else {
            ctx.fillText('No portraits available', centerX, navY);
        }
        
        ctx.textAlign = 'left';
        
        // Next button - larger hit area
        ctx.font = `20px ${style.fontFamily}`;
        const nextText = '[ > ]';
        const nextWidth = ctx.measureText(nextText).width;
        const nextX = centerX + 150 - nextWidth;
        
        hitBoxes.next = {
            x: nextX - 20,
            y: navY - 20,
            width: nextWidth + 40,
            height: 40
        };
        
        ctx.fillStyle = style.highlightColor;
        ctx.fillText(nextText, nextX, navY);
        
        // Accept button - larger hit area
        const acceptY = navY + 60;
        const acceptText = '[ ACCEPT ]';
        const acceptWidth = ctx.measureText(acceptText).width;
        const acceptX = centerX - acceptWidth / 2;
        
        hitBoxes.accept = {
            x: acceptX - 20,
            y: acceptY - 20,
            width: acceptWidth + 40,
            height: 40
        };
        
        ctx.fillStyle = style.highlightColor;
        ctx.fillText(acceptText, acceptX, acceptY);
    }
    
    function renderPortraitInfo(ctx, layout) {
        const padding = layout.padding || 40;
        const centerX = layout.width / 2;
        // Position info between navigation and accept button
        const infoY = padding + 80 + preview.height + 55;
        
        if (portraits.length === 0 || !state.selectedPortrait) return;
        
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = style.textColor;
        
        // Portrait name
        ctx.fillText(`"${state.selectedPortrait.name}"`, centerX, infoY);
        
        ctx.textAlign = 'left';
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // INPUT HANDLING
    // ═══════════════════════════════════════════════════════════════════
    
    function hitTest(box, x, y) {
        if (!box) return false;
        return x >= box.x && x <= box.x + box.width &&
               y >= box.y && y <= box.y + box.height;
    }
    
    function handleClick(x, y) {
        console.log('[PortraitPickerScreen] Click at:', x, y);
        console.log('[PortraitPickerScreen] Hit boxes:', hitBoxes);
        
        // Check navigation buttons
        if (hitTest(hitBoxes.prev, x, y)) {
            console.log('[PortraitPickerScreen] Prev button clicked');
            previousPortrait();
            return true;
        }
        
        if (hitTest(hitBoxes.next, x, y)) {
            console.log('[PortraitPickerScreen] Next button clicked');
            nextPortrait();
            return true;
        }
        
        if (hitTest(hitBoxes.accept, x, y)) {
            console.log('[PortraitPickerScreen] Accept button clicked');
            complete();
            return true;
        }
        
        // Check form elements
        if (form) {
            return ASCIIFormRenderer.handleClick(form, x, y);
        }
        
        return false;
    }
    
    function handleMouseMove(x, y) {
        // Check if over any button
        if (hitTest(hitBoxes.prev, x, y) ||
            hitTest(hitBoxes.next, x, y) ||
            hitTest(hitBoxes.accept, x, y)) {
            return 'pointer';
        }
        
        if (form) {
            return ASCIIFormRenderer.handleMouseMove(form, x, y);
        }
        
        return 'default';
    }
    
    function handleKeyDown(event) {
        switch (event.key) {
            case 'ArrowLeft':
                previousPortrait();
                return true;
                
            case 'ArrowRight':
                nextPortrait();
                return true;
                
            case 'Enter':
                complete();
                return true;
        }
        
        if (form) {
            return ASCIIFormRenderer.handleKeyDown(form, event);
        }
        
        return false;
    }
    
    function handleCommand(cmd, args) {
        switch (cmd) {
            case 'portrait':
                const num = parseInt(args[0]);
                if (!isNaN(num)) {
                    selectPortrait(num - 1);  // Convert to 0-indexed
                    return true;
                }
                break;
                
            case 'prev':
            case 'previous':
                previousPortrait();
                return true;
                
            case 'next':
                nextPortrait();
                return true;
                
            case 'accept':
            case 'select':
            case 'continue':
                complete();
                return true;
                
            case 'back':
                goBack();
                return true;
        }
        
        // Check for raw number input
        const num = parseInt(cmd);
        if (!isNaN(num) && num >= 1 && num <= portraits.length) {
            selectPortrait(num - 1);
            return true;
        }
        
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // COMPLETION
    // ═══════════════════════════════════════════════════════════════════
    
    function complete() {
        if (portraits.length === 0) {
            // Skip if no portraits
            if (typeof OnboardingScreenManager !== 'undefined') {
                OnboardingScreenManager.addLogLine('No portraits available, skipping...', 'system');
            }
        }
        
        console.log('[PortraitPickerScreen] Complete:', state.selectedPortrait);
        
        if (state.onComplete) {
            state.onComplete(state.selectedPortrait);
        }
        
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:portrait_complete', state.selectedPortrait);
        }
    }
    
    function goBack() {
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('onboarding:back');
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
        getSelectedPortrait: () => state.selectedPortrait,
        setPortraits: (p) => { portraits = p; },
        getPortraits: () => portraits
    };
    
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortraitPickerScreen;
}
