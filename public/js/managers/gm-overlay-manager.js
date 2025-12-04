/**
 * GMOverlayManager - GM-only overlay for scene information and controls
 * 
 * Renders over the Scene Viewer when GM is authenticated:
 * - Scene title bar
 * - Narrative text (read-aloud)
 * - GM notes (private)
 * - Skill check buttons
 * - Trigger buttons
 * - Navigation (Prev / Select / Next)
 * 
 * Uses canvas-based rendering like ChatManager/TerminalManager.
 * Players never see this overlay.
 */

const GMOverlayManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let initialized = false;
    let visible = false;
    let dirty = true;
    
    // Canvas and Three.js objects
    let canvas = null;
    let ctx = null;
    let texture = null;
    let plane = null;
    let config = null;
    
    // Current scene data
    let currentScene = null;
    
    // Scroll state for narrative/notes
    const scrollState = {
        narrativeOffset: 0,
        notesOffset: 0,
        activeSection: 'narrative' // 'narrative' or 'notes'
    };
    
    // Clickable regions (recalculated on render)
    const clickableRegions = [];
    
    // Layout configuration
    const layout = {
        width: 800,
        height: 600,
        padding: 16,
        fontSize: 14,
        lineHeight: 1.4,
        fontFamily: '"IBM Plex Mono", monospace',
        
        // Section heights (proportional)
        titleBarHeight: 40,
        navBarHeight: 50,
        
        // Colors
        colors: {
            // Use fully opaque backgrounds so previous scenes/overlays
            // are never visible through the GM overlay.
            background: 'rgba(5, 5, 5, 1.0)',
            titleBg: 'rgba(20, 20, 20, 1.0)',
            navBg: 'rgba(15, 15, 15, 1.0)',
            text: '#33ff66',
            textDim: '#228844',
            textBright: '#66ff99',
            accent: '#ffaa00',
            button: 'rgba(40, 40, 40, 0.9)',
            buttonHover: 'rgba(60, 60, 60, 0.9)',
            buttonActive: 'rgba(51, 255, 102, 0.3)',
            border: '#33ff66',
            borderDim: '#225533'
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Initialize the GM overlay
     * @param {THREE.Scene} scene - Three.js scene
     * @param {Object} options - Configuration options
     */
    function init(scene, options = {}) {
        if (initialized) {
            console.warn('[GMOverlayManager] Already initialized');
            return;
        }
        
        // Merge options
        Object.assign(layout, options);
        
        // Create canvas
        canvas = document.createElement('canvas');
        canvas.width = layout.width;
        canvas.height = layout.height;
        ctx = canvas.getContext('2d');
        
        // Build config for text rendering
        config = {
            fontSize: layout.fontSize,
            lineHeight: layout.lineHeight,
            fontFamily: layout.fontFamily,
            phosphorColors: {
                primary: layout.colors.text,
                dim: layout.colors.textDim,
                bright: layout.colors.textBright,
                glow: layout.colors.text
            },
            glowIntensity: 0.5
        };
        
        // Create Three.js texture
        texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        // Get position from LayoutManager
        // Default size if LayoutManager is not available
        let planeWidth = 2.67;  // 4:3 aspect
        let planeHeight = 2;
        let targetX = 0;
        let targetY = 0;
        let targetZ = 0.15;  // In front of scene
        
        if (typeof LayoutManager !== 'undefined' && LayoutManager.isInitialized()) {
            const rect = LayoutManager.getMainDisplayRect();
            targetX = rect.x;
            targetY = rect.y;
            targetZ = rect.z + 0.15;

            // Make the GM overlay noticeably smaller than the full CRT window
            // so more of the scene remains visible around it.
            const scale = 0.75; // 75% of main display size
            planeWidth = rect.width * scale;
            planeHeight = rect.height * scale;
        }
        
        // Create plane
        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false
        });
        
        plane = new THREE.Mesh(geometry, material);
        plane.position.set(targetX, targetY, targetZ);
        plane.visible = false;  // Start hidden
        
        if (scene) {
            scene.add(plane);
        }
        
        // Register with AnimationManager
        if (typeof AnimationManager !== 'undefined') {
            AnimationManager.register('gm-overlay', update, { priority: 20 });
        }
        
        // Listen for scene changes
        if (typeof EventBus !== 'undefined') {
            EventBus.on('scene:changed', handleSceneChanged);
            EventBus.on('sync:gm_authenticated', handleGMAuth);
            EventBus.on('sync:gm_logout', handleGMLogout);
        }
        
        initialized = true;
        console.log('[GMOverlayManager] Initialized');
        
        return { canvas, texture, plane };
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════
    
    function handleSceneChanged(data) {
        currentScene = data.scene;
        scrollState.narrativeOffset = 0;
        scrollState.notesOffset = 0;
        dirty = true;
    }
    
    function handleGMAuth() {
        // Show overlay when GM authenticates
        if (currentScene) {
            show();
        }
    }
    
    function handleGMLogout() {
        hide();
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UPDATE LOOP
    // ═══════════════════════════════════════════════════════════════════
    
    function update(delta, now) {
        if (!initialized || !visible) return;
        
        if (dirty) {
            render();
            dirty = false;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════
    
    function render() {
        if (!ctx || !currentScene) return;
        
        const { width, height, padding, colors } = layout;
        
        // Clear clickable regions
        clickableRegions.length = 0;
        
        // Clear canvas
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, width, height);
        
        // Draw border
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        
        let y = 0;
        
        // ─────────────────────────────────────────────────────────────────
        // TITLE BAR
        // ─────────────────────────────────────────────────────────────────
        y = renderTitleBar(y);
        
        // ─────────────────────────────────────────────────────────────────
        // CONTENT AREA
        // ─────────────────────────────────────────────────────────────────
        const contentTop = y;
        const contentBottom = height - layout.navBarHeight;
        const contentHeight = contentBottom - contentTop;
        
        // Split content: narrative (left), notes + checks (right)
        const splitX = width * 0.55;
        
        // Narrative section (left)
        y = renderNarrativeSection(contentTop, splitX - padding, contentHeight);
        
        // GM Notes + Skill Checks + Triggers (right)
        renderRightPanel(splitX, contentTop, width - splitX - padding, contentHeight);
        
        // ─────────────────────────────────────────────────────────────────
        // NAVIGATION BAR
        // ─────────────────────────────────────────────────────────────────
        renderNavBar(contentBottom);
        
        // Update texture
        if (texture) {
            texture.needsUpdate = true;
        }
    }
    
    function renderTitleBar(startY) {
        const { width, padding, colors, titleBarHeight } = layout;
        
        // Background
        ctx.fillStyle = colors.titleBg;
        ctx.fillRect(0, startY, width, titleBarHeight);
        
        // Scene label
        const label = SceneManager ? SceneManager.getSceneLabel(currentScene) : currentScene.title;
        
        ctx.font = `bold ${layout.fontSize + 2}px ${layout.fontFamily}`;
        ctx.fillStyle = colors.textBright;
        ctx.textBaseline = 'middle';
        ctx.fillText(label, padding, startY + titleBarHeight / 2);
        
        // Scene position indicator (right side)
        if (typeof SceneManager !== 'undefined') {
            const pos = `${SceneManager.getCurrentIndex() + 1} / ${SceneManager.getSceneCount()}`;
            ctx.font = `${layout.fontSize}px ${layout.fontFamily}`;
            ctx.fillStyle = colors.textDim;
            ctx.textAlign = 'right';
            ctx.fillText(pos, width - padding, startY + titleBarHeight / 2);
            ctx.textAlign = 'left';
        }
        
        // Bottom border
        ctx.strokeStyle = colors.borderDim;
        ctx.beginPath();
        ctx.moveTo(0, startY + titleBarHeight);
        ctx.lineTo(width, startY + titleBarHeight);
        ctx.stroke();
        
        return startY + titleBarHeight;
    }
    
    function renderNarrativeSection(startY, width, height) {
        const { padding, colors, fontSize, lineHeight } = layout;
        const lineHeightPx = fontSize * lineHeight;
        
        // Section header
        ctx.font = `bold ${fontSize}px ${layout.fontFamily}`;
        ctx.fillStyle = colors.accent;
        ctx.fillText('NARRATIVE', padding, startY + padding + fontSize);
        
        let y = startY + padding + fontSize + lineHeightPx;
        
        // Narrative text
        if (currentScene.narrative) {
            ctx.font = `${fontSize}px ${layout.fontFamily}`;
            ctx.fillStyle = colors.text;
            
            const lines = wrapText(currentScene.narrative, width - padding * 2);
            const maxLines = Math.floor((height - padding * 3 - fontSize) / lineHeightPx);
            
            for (let i = scrollState.narrativeOffset; i < Math.min(lines.length, scrollState.narrativeOffset + maxLines); i++) {
                ctx.fillText(lines[i], padding, y);
                y += lineHeightPx;
            }
            
            // Scroll indicator
            if (lines.length > maxLines) {
                ctx.fillStyle = colors.textDim;
                ctx.font = `${fontSize - 2}px ${layout.fontFamily}`;
                ctx.fillText(`[${scrollState.narrativeOffset + 1}-${Math.min(scrollState.narrativeOffset + maxLines, lines.length)} of ${lines.length}]`, 
                    padding, startY + height - padding);
            }
        }
        
        // Vertical divider
        ctx.strokeStyle = colors.borderDim;
        ctx.beginPath();
        ctx.moveTo(width + padding / 2, startY);
        ctx.lineTo(width + padding / 2, startY + height);
        ctx.stroke();
        
        return startY + height;
    }
    
    function renderRightPanel(startX, startY, width, height) {
        const { padding, colors, fontSize, lineHeight } = layout;
        const lineHeightPx = fontSize * lineHeight;
        
        let y = startY + padding;
        
        // ─────────────────────────────────────────────────────────────────
        // GM NOTES (collapsible)
        // ─────────────────────────────────────────────────────────────────
        ctx.font = `bold ${fontSize}px ${layout.fontFamily}`;
        ctx.fillStyle = colors.accent;
        ctx.fillText('GM NOTES', startX, y + fontSize);
        y += fontSize + lineHeightPx * 0.5;
        
        if (currentScene.gmNotes) {
            ctx.font = `${fontSize - 1}px ${layout.fontFamily}`;
            ctx.fillStyle = colors.textDim;
            
            const noteLines = wrapText(currentScene.gmNotes, width - padding);
            const maxNoteLines = 4;
            
            for (let i = 0; i < Math.min(noteLines.length, maxNoteLines); i++) {
                ctx.fillText(noteLines[i], startX, y);
                y += lineHeightPx * 0.9;
            }
            
            if (noteLines.length > maxNoteLines) {
                ctx.fillText('...', startX, y);
                y += lineHeightPx * 0.9;
            }
        }
        
        y += lineHeightPx * 0.5;
        
        // ─────────────────────────────────────────────────────────────────
        // SKILL CHECKS
        // ─────────────────────────────────────────────────────────────────
        if (currentScene.skillChecks && currentScene.skillChecks.length > 0) {
            ctx.font = `bold ${fontSize}px ${layout.fontFamily}`;
            ctx.fillStyle = colors.accent;
            ctx.fillText('SKILL CHECKS', startX, y + fontSize);
            y += fontSize + lineHeightPx * 0.5;
            
            for (const check of currentScene.skillChecks) {
                const btnY = y;
                const btnWidth = width - padding;
                const btnHeight = lineHeightPx * 1.5;
                
                // Button background
                ctx.fillStyle = colors.button;
                ctx.fillRect(startX, btnY, btnWidth, btnHeight);
                
                // Button border
                ctx.strokeStyle = colors.borderDim;
                ctx.strokeRect(startX, btnY, btnWidth, btnHeight);
                
                // Button text
                ctx.font = `${fontSize}px ${layout.fontFamily}`;
                ctx.fillStyle = colors.text;
                ctx.fillText(`${check.name} (DC ${check.dc})`, startX + padding / 2, btnY + btnHeight / 2 + fontSize / 3);
                
                // Register clickable region
                clickableRegions.push({
                    x: startX,
                    y: btnY,
                    width: btnWidth,
                    height: btnHeight,
                    type: 'skillCheck',
                    data: check
                });
                
                y += btnHeight + 4;
            }
        }
        
        y += lineHeightPx * 0.5;
        
        // ─────────────────────────────────────────────────────────────────
        // TRIGGERS
        // ─────────────────────────────────────────────────────────────────
        if (currentScene.triggers && currentScene.triggers.length > 0) {
            ctx.font = `bold ${fontSize}px ${layout.fontFamily}`;
            ctx.fillStyle = colors.accent;
            ctx.fillText('TRIGGERS', startX, y + fontSize);
            y += fontSize + lineHeightPx * 0.5;
            
            for (const trigger of currentScene.triggers) {
                const btnY = y;
                const btnWidth = width - padding;
                const btnHeight = lineHeightPx * 1.5;
                
                // Button background
                ctx.fillStyle = colors.button;
                ctx.fillRect(startX, btnY, btnWidth, btnHeight);
                
                // Button border
                ctx.strokeStyle = colors.borderDim;
                ctx.strokeRect(startX, btnY, btnWidth, btnHeight);
                
                // Button text
                ctx.font = `${fontSize}px ${layout.fontFamily}`;
                ctx.fillStyle = colors.textBright;
                ctx.fillText(trigger.label, startX + padding / 2, btnY + btnHeight / 2 + fontSize / 3);
                
                // Register clickable region
                clickableRegions.push({
                    x: startX,
                    y: btnY,
                    width: btnWidth,
                    height: btnHeight,
                    type: 'trigger',
                    data: trigger
                });
                
                y += btnHeight + 4;
            }
        }
    }
    
    function renderNavBar(startY) {
        const { width, padding, colors, navBarHeight, fontSize } = layout;
        
        // Background
        ctx.fillStyle = colors.navBg;
        ctx.fillRect(0, startY, width, navBarHeight);
        
        // Top border
        ctx.strokeStyle = colors.borderDim;
        ctx.beginPath();
        ctx.moveTo(0, startY);
        ctx.lineTo(width, startY);
        ctx.stroke();
        
        // Navigation buttons
        const btnWidth = 120;
        const btnHeight = 32;
        const btnY = startY + (navBarHeight - btnHeight) / 2;
        const spacing = 20;
        
        // Center the buttons
        const totalWidth = btnWidth * 3 + spacing * 2;
        let btnX = (width - totalWidth) / 2;
        
        // PREV button
        const hasPrev = typeof SceneManager !== 'undefined' && SceneManager.hasPrev();
        renderNavButton(btnX, btnY, btnWidth, btnHeight, '◀ PREV', hasPrev, 'prev');
        btnX += btnWidth + spacing;
        
        // SELECT button
        renderNavButton(btnX, btnY, btnWidth, btnHeight, 'SELECT', true, 'select');
        btnX += btnWidth + spacing;
        
        // NEXT button
        const hasNext = typeof SceneManager !== 'undefined' && SceneManager.hasNext();
        renderNavButton(btnX, btnY, btnWidth, btnHeight, 'NEXT ▶', hasNext, 'next');
    }
    
    function renderNavButton(x, y, width, height, label, enabled, action) {
        const { colors, fontSize } = layout;
        
        // Button background
        ctx.fillStyle = enabled ? colors.button : 'rgba(30, 30, 30, 0.5)';
        ctx.fillRect(x, y, width, height);
        
        // Button border
        ctx.strokeStyle = enabled ? colors.border : colors.borderDim;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        
        // Button text
        ctx.font = `bold ${fontSize}px ${layout.fontFamily}`;
        ctx.fillStyle = enabled ? colors.textBright : colors.textDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + width / 2, y + height / 2);
        ctx.textAlign = 'left';
        
        // Register clickable region
        if (enabled) {
            clickableRegions.push({
                x, y, width, height,
                type: 'nav',
                data: { action }
            });
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // TEXT WRAPPING
    // ═══════════════════════════════════════════════════════════════════
    
    function wrapText(text, maxWidth) {
        if (!text) return [];
        
        const lines = [];
        const paragraphs = text.split('\n');
        
        ctx.font = `${layout.fontSize}px ${layout.fontFamily}`;
        
        for (const para of paragraphs) {
            if (para.trim() === '') {
                lines.push('');
                continue;
            }
            
            const words = para.split(' ');
            let currentLine = '';
            
            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const metrics = ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            
            if (currentLine) {
                lines.push(currentLine);
            }
        }
        
        return lines;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // CLICK HANDLING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Handle click at canvas coordinates
     * @param {number} x - X position in canvas pixels
     * @param {number} y - Y position in canvas pixels
     * @returns {boolean} True if click was handled
     */
    function handleClick(x, y) {
        for (const region of clickableRegions) {
            if (x >= region.x && x <= region.x + region.width &&
                y >= region.y && y <= region.y + region.height) {
                
                handleRegionClick(region);
                return true;
            }
        }
        return false;
    }
    
    function handleRegionClick(region) {
        switch (region.type) {
            case 'skillCheck':
                executeSkillCheck(region.data);
                break;
            case 'trigger':
                executeTrigger(region.data);
                break;
            case 'nav':
                executeNavAction(region.data.action);
                break;
        }
        
        dirty = true;
    }
    
    function executeSkillCheck(check) {
        // Roll d20
        const roll = Math.floor(Math.random() * 20) + 1;
        const success = roll >= check.dc;
        
        // Format result
        const resultText = success ? check.success : check.fail;
        const rollStr = `[GM] ${check.name} check (DC ${check.dc}): d20 = ${roll} - ${success ? 'SUCCESS' : 'FAIL'}`;
        
        // Broadcast to chat
        if (typeof SyncManager !== 'undefined' && SyncManager.isConnected()) {
            SyncManager.broadcastChat(rollStr, 'system');
            if (resultText) {
                SyncManager.broadcastChat(resultText, 'system');
            }
        }
        
        // Also show locally
        if (typeof ChatManager !== 'undefined') {
            ChatManager.addMessage('system', rollStr);
            if (resultText) {
                ChatManager.addMessage('system', resultText);
            }
        }
        
        console.log('[GMOverlayManager] Skill check:', check.name, roll, success ? 'SUCCESS' : 'FAIL');
    }
    
    function executeTrigger(trigger) {
        switch (trigger.action) {
            case 'chat':
                // Broadcast text to chat
                if (typeof SyncManager !== 'undefined' && SyncManager.isConnected()) {
                    SyncManager.broadcastChat(trigger.text, 'system');
                }
                if (typeof ChatManager !== 'undefined') {
                    ChatManager.addMessage('system', trigger.text);
                }
                break;
            
            case 'sound':
                // Play a sound effect
                if (typeof AudioManager !== 'undefined' && trigger.sound) {
                    AudioManager.playSound(trigger.sound);
                }
                break;
            
            default:
                console.log('[GMOverlayManager] Unknown trigger action:', trigger.action);
        }
        
        console.log('[GMOverlayManager] Trigger executed:', trigger.label);
    }
    
    function executeNavAction(action) {
        if (typeof SceneManager === 'undefined') return;
        
        switch (action) {
            case 'prev':
                SceneManager.prevScene();
                break;
            case 'next':
                SceneManager.nextScene();
                break;
            case 'select':
                // TODO: Open scene selector modal
                console.log('[GMOverlayManager] Scene selector not yet implemented');
                break;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SCROLLING
    // ═══════════════════════════════════════════════════════════════════
    
    function scrollNarrative(delta) {
        scrollState.narrativeOffset = Math.max(0, scrollState.narrativeOffset + delta);
        dirty = true;
    }
    
    function scrollNotes(delta) {
        scrollState.notesOffset = Math.max(0, scrollState.notesOffset + delta);
        dirty = true;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // VISIBILITY
    // ═══════════════════════════════════════════════════════════════════
    
    function show() {
        // Only show if GM
        if (typeof SyncManager !== 'undefined' && !SyncManager.isGM()) {
            console.log('[GMOverlayManager] Not GM, cannot show overlay');
            return;
        }
        
        visible = true;
        if (plane) plane.visible = true;
        dirty = true;
        
        console.log('[GMOverlayManager] Shown');
    }
    
    function hide() {
        visible = false;
        if (plane) plane.visible = false;
        
        console.log('[GMOverlayManager] Hidden');
    }
    
    function toggle() {
        if (visible) {
            hide();
        } else {
            show();
        }
    }
    
    function isVisible() {
        return visible;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        // Lifecycle
        init,
        
        // Visibility
        show,
        hide,
        toggle,
        isVisible,
        
        // Interaction
        handleClick,
        scrollNarrative,
        scrollNotes,
        
        // Scene
        setScene: (scene) => {
            currentScene = scene;
            scrollState.narrativeOffset = 0;
            scrollState.notesOffset = 0;
            dirty = true;
        },
        
        // Access
        getPlane: () => plane,
        getLayout: () => ({ ...layout }),
        getClickableRegions: () => [...clickableRegions]
    };
})();

console.log('[GMOverlayManager] Module loaded');
