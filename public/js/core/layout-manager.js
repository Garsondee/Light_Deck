/**
 * LayoutManager - Single source of truth for all UI element positions
 * 
 * This manager defines the exact positions, sizes, and bounds for:
 * - Main CRT display (4:3)
 * - Chat panel (right sidebar)
 * - Hardware bezel frame
 * - Control panel buttons and dials
 * 
 * All other managers (ChassisManager, ChatManager, ControlPanelManager, etc.)
 * MUST read their positions from this manager. No independent calculations.
 * 
 * Coordinate System:
 * - Origin (0,0) is at the center of the viewport
 * - X increases to the right
 * - Y increases upward
 * - Z increases toward the camera (positive Z is "in front")
 */

const LayoutManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let initialized = false;
    let camera = null;
    
    // Core layout values - the single source of truth
    const layout = {
        // Camera frustum (set on init)
        frustum: {
            width: 0,
            height: 0,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
        },
        
        // Main CRT display (4:3 aspect, left side)
        mainDisplay: {
            x: 0,
            y: 0,
            z: 0,
            width: 2 * (4/3),   // 2.67 units
            height: 2,
            scale: { x: 1, y: 1 }
        },
        
        // Chat panel (right side)
        chatPanel: {
            x: 0,
            y: 0,
            z: 0.05,
            width: 0,           // Calculated from remaining space
            height: 2,          // Same as main display
            scale: { x: 1, y: 1 },
            // Insets from bezel edge
            inset: {
                horizontal: 0.08,
                vertical: 0.12
            }
        },
        
        // Hardware bezel frame
        bezel: {
            x: 0,               // Center X of the bezel
            y: 0,               // Center Y of the bezel
            z: 0.08,            // Slightly in front of displays
            outerWidth: 0,      // Calculated
            outerHeight: 0,     // Calculated
            depth: 0.15,
            bevelSize: 0.08,
            bevelThickness: 0.05,
            cornerRadius: 0.12,
            margin: 0.05,       // Gap around screen holes (reduced to shrink top band)
            bottomMargin: 0.08  // Extra space at bottom for controls (further reduced)
        },
        
        // Divider bar between displays
        divider: {
            x: 0,
            y: 0,
            z: 0.05,
            width: 0.06,
            height: 0            // Calculated
        },
        
        // Control panel (buttons at bottom-left)
        controlPanel: {
            buttons: {
                y: 0,            // Calculated
                z: 0.20,         // In front of bezel (bezel depth is 0.15)
                startX: 0,       // Calculated
                spacing: 0.32,   // Spacing between button centers
                width: 0.28,
                height: 0.08
            },
            dials: {
                y: 0,            // Calculated
                z: 0.20,         // In front of bezel
                startX: 0,       // Calculated
                spacing: 0.14,
                radius: 0.04
            }
        },
        
        // Status LEDs
        leds: {
            y: 0,                // Calculated
            z: 0.12,
            startX: 0,           // Calculated
            spacing: 0.12,
            radius: 0.02
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Initialize the layout manager
     * @param {THREE.OrthographicCamera} cam - The orthographic camera
     */
    function init(cam) {
        if (initialized) {
            console.warn('[LayoutManager] Already initialized');
            return layout;
        }
        
        if (!cam) {
            console.error('[LayoutManager] Camera required for initialization');
            return null;
        }
        
        camera = cam;
        
        // Calculate all positions
        calculateLayout();
        
        initialized = true;
        console.log('[LayoutManager] Initialized', getDebugSummary());
        
        return layout;
    }
    
    /**
     * Recalculate layout (call on window resize)
     */
    function recalculate() {
        if (!camera) return;
        calculateLayout();
        console.log('[LayoutManager] Recalculated', getDebugSummary());
    }
    
    /**
     * Main calculation function - derives all positions from camera frustum
     */
    function calculateLayout() {
        // Get frustum dimensions
        const frustumWidth = camera.right - camera.left;
        const frustumHeight = camera.top - camera.bottom;
        
        layout.frustum = {
            width: frustumWidth,
            height: frustumHeight,
            left: camera.left,
            right: camera.right,
            top: camera.top,
            bottom: camera.bottom
        };
        
        // ─────────────────────────────────────────────────────────────────
        // SIMPLIFIED LAYOUT: Everything fits within frustum, no offsets
        // ─────────────────────────────────────────────────────────────────
        
        const margin = layout.bezel.margin;           // 0.08
        const bottomExtra = layout.bezel.bottomMargin; // 0.20 for controls
        
        // Screen area: frustum minus margins
        // Top margin = margin, bottom margin = bottomExtra
        const screenAreaTop = frustumHeight / 2 - margin;
        const screenAreaBottom = -frustumHeight / 2 + bottomExtra;
        const screenHeight = screenAreaTop - screenAreaBottom;
        const screenCenterY = (screenAreaTop + screenAreaBottom) / 2;
        
        // ─────────────────────────────────────────────────────────────────
        // MAIN DISPLAY (4:3, left side)
        // ─────────────────────────────────────────────────────────────────
        const mainWidth = layout.mainDisplay.width;   // 2.67 units (fixed)
        const mainHeight = Math.min(screenHeight, 2); // Clamp to available or 2 units
        
        // Position main display on the left
        const mainX = camera.left + margin + mainWidth / 2;
        
        layout.mainDisplay.x = mainX;
        layout.mainDisplay.y = screenCenterY;
        layout.mainDisplay.z = 0;
        layout.mainDisplay.height = mainHeight;
        
        // ─────────────────────────────────────────────────────────────────
        // CHAT PANEL (right side, fills remaining width)
        // ─────────────────────────────────────────────────────────────────
        const dividerWidth = layout.divider.width;
        const mainRightEdge = mainX + mainWidth / 2;
        const chatLeftEdge = mainRightEdge + dividerWidth;
        const chatRightEdge = camera.right - margin;
        const chatWidth = Math.max(0.4, chatRightEdge - chatLeftEdge);
        
        layout.chatPanel.width = chatWidth;
        layout.chatPanel.height = mainHeight;
        layout.chatPanel.x = chatLeftEdge + chatWidth / 2;
        layout.chatPanel.y = screenCenterY;
        
        // ─────────────────────────────────────────────────────────────────
        // DIVIDER BAR
        // ─────────────────────────────────────────────────────────────────
        layout.divider.x = mainRightEdge + dividerWidth / 2;
        layout.divider.y = screenCenterY;
        layout.divider.height = mainHeight;
        
        // ─────────────────────────────────────────────────────────────────
        // BEZEL FRAME (covers full frustum width, with margins)
        // ─────────────────────────────────────────────────────────────────
        const bezelLeft = mainX - mainWidth / 2 - margin;
        const bezelRight = layout.chatPanel.x + chatWidth / 2 + margin;
        const bezelWidth = bezelRight - bezelLeft;
        const bezelHeight = frustumHeight * 0.98;  // Nearly full height
        
        layout.bezel.outerWidth = bezelWidth;
        layout.bezel.outerHeight = bezelHeight;
        layout.bezel.x = (bezelLeft + bezelRight) / 2;
        layout.bezel.y = 0;  // Centered vertically
        
        // Screen Y offset for bezel holes (relative to bezel center)
        layout.bezel.screenYOffset = screenCenterY;
        
        // ─────────────────────────────────────────────────────────────────
        // CONTROL PANEL (buttons at bottom of bezel, in the extra margin)
        // ─────────────────────────────────────────────────────────────────
        const controlY = -frustumHeight / 2 + bottomExtra / 2;
        
        layout.controlPanel.buttons.y = controlY;
        layout.controlPanel.buttons.startX = bezelLeft + margin + layout.controlPanel.buttons.width / 2;
        
        // Dials go on the right side (under chat panel)
        layout.controlPanel.dials.y = controlY;
        layout.controlPanel.dials.startX = layout.chatPanel.x - layout.controlPanel.dials.spacing;
        
        // ─────────────────────────────────────────────────────────────────
        // STATUS LEDs (below chat panel, above control area)
        // ─────────────────────────────────────────────────────────────────
        layout.leds.y = layout.chatPanel.y - layout.chatPanel.height / 2 - 0.08;
        layout.leds.startX = layout.chatPanel.x - layout.leds.spacing * 1.5;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC GETTERS - These are what other managers should use
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Get main display rect (for CRT plane positioning)
     */
    function getMainDisplayRect() {
        return {
            x: layout.mainDisplay.x,
            y: layout.mainDisplay.y,  // Already includes correct Y position
            z: layout.mainDisplay.z,
            width: layout.mainDisplay.width,
            height: layout.mainDisplay.height,
            scale: { ...layout.mainDisplay.scale }
        };
    }
    
    /**
     * Get chat panel rect (for chat plane positioning)
     */
    function getChatPanelRect() {
        const inset = layout.chatPanel.inset;
        return {
            x: layout.chatPanel.x,
            y: layout.chatPanel.y,  // Already includes correct Y position
            z: layout.chatPanel.z,
            width: layout.chatPanel.width - inset.horizontal * 2,
            height: layout.chatPanel.height - inset.vertical * 2,
            scale: { ...layout.chatPanel.scale },
            // Full slot dimensions (before inset)
            slotWidth: layout.chatPanel.width,
            slotHeight: layout.chatPanel.height
        };
    }
    
    /**
     * Get bezel frame dimensions (for ChassisManager)
     */
    function getBezelRect() {
        return {
            x: layout.bezel.x,
            y: layout.bezel.y,
            z: layout.bezel.z,
            outerWidth: layout.bezel.outerWidth,
            outerHeight: layout.bezel.outerHeight,
            depth: layout.bezel.depth,
            bevelSize: layout.bezel.bevelSize,
            bevelThickness: layout.bezel.bevelThickness,
            cornerRadius: layout.bezel.cornerRadius,
            margin: layout.bezel.margin,
            screenYOffset: layout.bezel.screenYOffset,
            // Screen hole positions (relative to bezel center)
            mainHole: {
                x: layout.mainDisplay.x - layout.bezel.x,
                y: layout.bezel.screenYOffset,
                width: layout.mainDisplay.width,
                height: layout.mainDisplay.height
            },
            chatHole: {
                x: layout.chatPanel.x - layout.bezel.x,
                y: layout.bezel.screenYOffset,
                width: layout.chatPanel.width,
                height: layout.chatPanel.height
            }
        };
    }
    
    /**
     * Get divider bar position
     */
    function getDividerRect() {
        return {
            x: layout.divider.x,
            y: layout.divider.y,  // Already includes correct Y position
            z: layout.divider.z,
            width: layout.divider.width,
            height: layout.divider.height
        };
    }
    
    /**
     * Get control panel layout (buttons and dials)
     */
    function getControlPanelLayout() {
        return {
            buttons: {
                y: layout.controlPanel.buttons.y,
                z: layout.controlPanel.buttons.z,
                startX: layout.controlPanel.buttons.startX,
                spacing: layout.controlPanel.buttons.spacing,
                width: layout.controlPanel.buttons.width,
                height: layout.controlPanel.buttons.height
            },
            dials: {
                y: layout.controlPanel.dials.y,
                z: layout.controlPanel.dials.z,
                startX: layout.controlPanel.dials.startX,
                spacing: layout.controlPanel.dials.spacing,
                radius: layout.controlPanel.dials.radius
            }
        };
    }
    
    /**
     * Get LED positions
     */
    function getLEDLayout() {
        return {
            y: layout.leds.y,  // Already includes correct Y position
            z: layout.leds.z,
            startX: layout.leds.startX,
            spacing: layout.leds.spacing,
            radius: layout.leds.radius
        };
    }
    
    /**
     * Get frustum dimensions
     */
    function getFrustum() {
        return { ...layout.frustum };
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // DEBUG
    // ═══════════════════════════════════════════════════════════════════
    
    function getDebugSummary() {
        return {
            frustum: `${layout.frustum.width.toFixed(2)} x ${layout.frustum.height.toFixed(2)}`,
            mainDisplay: `(${layout.mainDisplay.x.toFixed(2)}, ${layout.mainDisplay.y.toFixed(2)}) ${layout.mainDisplay.width.toFixed(2)}x${layout.mainDisplay.height.toFixed(2)}`,
            chatPanel: `(${layout.chatPanel.x.toFixed(2)}, ${layout.chatPanel.y.toFixed(2)}) ${layout.chatPanel.width.toFixed(2)}x${layout.chatPanel.height.toFixed(2)}`,
            bezel: `(${layout.bezel.x.toFixed(2)}, ${layout.bezel.y.toFixed(2)}) ${layout.bezel.outerWidth.toFixed(2)}x${layout.bezel.outerHeight.toFixed(2)}`,
            screenYOffset: layout.bezel.screenYOffset?.toFixed(3) || '0'
        };
    }
    
    /**
     * Get full layout object (for debugging)
     */
    function getFullLayout() {
        return JSON.parse(JSON.stringify(layout));
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        // Lifecycle
        init,
        recalculate,
        
        // Getters for specific components
        getMainDisplayRect,
        getChatPanelRect,
        getBezelRect,
        getDividerRect,
        getControlPanelLayout,
        getLEDLayout,
        getFrustum,
        
        // Debug
        getDebugSummary,
        getFullLayout,
        
        // Check state
        isInitialized: () => initialized
    };
    
})();

console.log('[LayoutManager] Module loaded');
