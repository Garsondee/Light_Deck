/**
 * Terminal UI - Tweakpane controls for Terminal
 * Controls the Terminal display CRT curvature and font settings
 */

const TerminalUI = (function() {
    let pane;
    
    // Terminal-specific configuration (CRT curvature)
    const config = {
        // === CRT Curvature (Terminal plane only) ===
        barrelDistortion: 0.09,
        barrelZoom: 1.07
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
    
    function applyCRTSettings() {
        if (typeof TerminalManager !== 'undefined' && TerminalManager.setCRTConfig) {
            TerminalManager.setCRTConfig({
                barrelDistortion: config.barrelDistortion,
                barrelZoom: config.barrelZoom
            });
        }
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
        applyCRTSettings
    };
})();
