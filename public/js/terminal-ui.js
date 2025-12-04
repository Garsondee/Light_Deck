/**
 * Terminal UI - Tweakpane controls for Phosphor Terminal
 * Separate from the Scene Viewer CRT controls for independent fine-tuning
 * Controls the Terminal display (text-based interface for hacking, info, etc.)
 */

const TerminalUI = (function() {
    let pane;
    
    // Terminal-specific configuration (canvas + CRT curvature)
    const config = {
        // === Font Settings (for TextRenderer canvas) ===
        fontFamily: 'IBM Plex Mono',
        fontSize: 19,
        lineHeight: 1.35,
        letterSpacing: 0,
        fontWeight: 400,

        // === Caret / typing ===
        showCaret: true,
        caretBlinkRate: 530,

        // === CRT Curvature (Terminal plane only) ===
        barrelDistortion: 0.22,
        barrelZoom: 0.97
    };
    
    // Layout controls for the canvas-based TerminalManager plane
    // Note: termScale is uniform to avoid squashing the 4:3 content
    const layoutConfig = {
        termX: 0,
        termY: 0,
        termScale: 1.0
    };
    
    // Available font options - trimmed to commonly available monospace faces
    const FONT_OPTIONS = {
        'IBM Plex Mono': 'IBM Plex Mono',
        'Courier New': 'Courier New',
        'Consolas': 'Consolas',
        'Lucida Console': 'Lucida Console',
        'JetBrains Mono': 'JetBrains Mono'
    };
    
    function init() {
        // Create Tweakpane instance
        pane = new Tweakpane.Pane({
            title: 'Terminal Settings',
            expanded: true
        });
        
        // Position in top-right
        pane.element.style.position = 'fixed';
        pane.element.style.top = '10px';
        pane.element.style.right = '320px'; // Right of sidebar
        pane.element.style.zIndex = '10000';
        
        // Start hidden by default
        pane.element.style.display = 'none';
        
        // === Layout Controls (Canvas Terminal plane) ===
        const layoutFolder = pane.addFolder({ title: '📐 Layout (Terminal Display)', expanded: true });
        
        // Initialize from TerminalManager plane if available
        if (typeof TerminalManager !== 'undefined' && TerminalManager.getPlane) {
            const termPlane = TerminalManager.getPlane();
            if (termPlane) {
                layoutConfig.termX = termPlane.position.x;
                layoutConfig.termY = termPlane.position.y;
                // Use X scale as the canonical uniform scale
                layoutConfig.termScale = termPlane.scale.x;
            }
        }
        
        layoutFolder.addInput(layoutConfig, 'termX', {
            label: 'Position X',
            min: -3, max: 3, step: 0.01
        }).on('change', updateTerminalLayout);
        
        layoutFolder.addInput(layoutConfig, 'termY', {
            label: 'Position Y',
            min: -2, max: 2, step: 0.01
        }).on('change', updateTerminalLayout);
        
        layoutFolder.addInput(layoutConfig, 'termScale', {
            label: 'Scale',
            min: 0.5, max: 2.0, step: 0.01
        }).on('change', updateTerminalLayout);
        
        // === Font Settings (canvas text) ===
        const fontFolder = pane.addFolder({ title: '🔤 Font', expanded: true });
        
        fontFolder.addInput(config, 'fontFamily', {
            label: 'Font Family',
            options: FONT_OPTIONS
        }).on('change', applyFontSettings);
        
        fontFolder.addInput(config, 'fontSize', {
            label: 'Size (px)',
            min: 10, max: 32, step: 1
        }).on('change', applyFontSettings);
        
        fontFolder.addInput(config, 'lineHeight', {
            label: 'Line Height',
            min: 1.0, max: 2.0, step: 0.05
        }).on('change', applyFontSettings);
        
        fontFolder.addInput(config, 'letterSpacing', {
            label: 'Letter Spacing',
            min: -2, max: 5, step: 0.5
        }).on('change', applyFontSettings);
        
        fontFolder.addInput(config, 'fontWeight', {
            label: 'Weight',
            options: {
                'Light (300)': 300,
                'Normal (400)': 400,
                'Medium (500)': 500,
                'Bold (700)': 700
            }
        }).on('change', applyFontSettings);

        // === CRT Curvature (Terminal plane shader) ===
        const crtFolder = pane.addFolder({ title: '📺 CRT Curvature', expanded: true });

        crtFolder.addInput(config, 'barrelDistortion', {
            label: 'Barrel Distortion',
            min: 0, max: 0.5, step: 0.01
        }).on('change', applyCRTSettings);

        crtFolder.addInput(config, 'barrelZoom', {
            label: 'Zoom Compensation',
            min: 0.9, max: 1.2, step: 0.01
        }).on('change', applyCRTSettings);

        // NOTE: Keyboard toggle is handled by InputManager
        // Do not add duplicate keydown listeners here
        
        console.log('[TERMINAL UI] Initialized. Press ~ to toggle visibility.');
        return pane;
    }
    
    // === Apply Settings Functions ===

    function applyFontSettings() {
        // Forward basic font configuration into TextRenderer via TerminalManager
        if (typeof TerminalManager !== 'undefined') {
            // Re-init or expose a proper API later; for now, log for bake-in
            console.log('[TERMINAL UI] Font settings changed:', {
                fontFamily: config.fontFamily,
                fontSize: config.fontSize,
                lineHeight: config.lineHeight,
                letterSpacing: config.letterSpacing,
                fontWeight: config.fontWeight
            });
        }
    }

    function applyCRTSettings() {
        if (typeof TerminalManager !== 'undefined' && TerminalManager.setCRTConfig) {
            TerminalManager.setCRTConfig({
                barrelDistortion: config.barrelDistortion,
                barrelZoom: config.barrelZoom
            });
        }
    }
    
    function updateTerminalLayout() {
        // Temporarily disabled: keep terminal plane driven purely by LayoutManager
        // This avoids manual overrides while we debug layout sizing.
        return;
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
    
    function getConfig() {
        return config;
    }
    
    return {
        init,
        config,
        getConfig,
        toggleVisibility,
        show,
        hide,
        refresh,
        applyFontSettings,
        applyCRTSettings
    };
})();
