/**
 * ChassisManager - Procedural retro-futuristic hardware frame
 * 
 * Creates a diegetic "Cassette Futurism" chassis around the viewport.
 * Think Alien, Blade Runner, Neuromancer deck aesthetics.
 * 
 * Features:
 * - Extruded bezel with beveled edges (80s plastic mold look)
 * - Dual-window design (main 4:3 display + chat panel)
 * - Procedural worn plastic/metal textures
 * - Status LEDs and hardware details
 * - Screen glow lighting
 */

const ChassisManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let initialized = false;
    
    // Three.js objects
    let chassisGroup = null;    // Parent group for all chassis geometry
    let bezelMesh = null;       // The main extruded bezel frame
    let backingPlate = null;    // Dark backing behind screens
    let dividerBar = null;      // Vertical bar between displays
    let screenLight = null;     // Light emitted from screens
    
    // Status LEDs
    const leds = {
        power: null,
        network: null,
        activity: null,
        error: null
    };
    
    // Configuration
    const config = {
        // Bezel dimensions (world units)
        bezel: {
            depth: 0.15,            // How thick the casing is
            bevelSize: 0.08,        // The angled chamfer
            bevelThickness: 0.05,
            cornerRadius: 0.12,     // Rounded corners
            margin: 0.08,           // Gap around screens (top, left, right)
            bottomMargin: 0.25      // Extra space at bottom for control panel
        },
        
        // Material colors
        colors: {
            plastic: 0x1a1a1a,      // Dark grey plastic
            metal: 0x2a2a2a,        // Slightly lighter metal
            accent: 0x0a0a0a,       // Near black accents
            screenGlow: 0x33ff66    // Green phosphor glow
        },
        
        // LED colors
        ledColors: {
            power: 0x00ff00,        // Green
            network: 0xffaa00,      // Amber
            activity: 0x00ff00,     // Green (blinks)
            error: 0xff0000         // Red
        }
    };
    
    // Screen dimensions (calculated from camera frustum)
    let screenLayout = {
        main: { x: 0, y: 0, width: 0, height: 0 },
        chat: { x: 0, y: 0, width: 0, height: 0 },
        total: { width: 0, height: 0 }
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Initialize the chassis
     * @param {THREE.Scene} scene - Three.js scene
     * @param {Object} options - Configuration options
     */
    function init(scene, options = {}) {
        if (initialized) {
            console.warn('[ChassisManager] Already initialized');
            return;
        }
        
        // Merge options
        Object.assign(config, options);
        
        // Create parent group
        chassisGroup = new THREE.Group();
        chassisGroup.name = 'chassis';
        
        // Get layout from LayoutManager (single source of truth)
        if (typeof LayoutManager !== 'undefined' && LayoutManager.isInitialized()) {
            loadLayoutFromManager();
        } else {
            console.warn('[ChassisManager] LayoutManager not available');
            return;
        }
        
        // Build chassis components
        createBezel();
        createBackingPlate();
        createDividerBar();
        createStatusLEDs();
        createScreenLight();
        
        // Add scene lighting for PBR materials
        if (scene) {
            createSceneLighting(scene);
        }
        
        // Add to scene
        if (scene) {
            scene.add(chassisGroup);
        }
        
        initialized = true;
        console.log('[ChassisManager] Initialized', screenLayout);
        
        return chassisGroup;
    }
    
    /**
     * Load layout from LayoutManager
     */
    function loadLayoutFromManager() {
        const mainRect = LayoutManager.getMainDisplayRect();
        const chatRect = LayoutManager.getChatPanelRect();
        const bezelRect = LayoutManager.getBezelRect();
        const frustum = LayoutManager.getFrustum();
        
        screenLayout = {
            main: {
                x: mainRect.x,
                y: mainRect.y,
                width: mainRect.width,
                height: mainRect.height
            },
            chat: {
                x: chatRect.x,
                y: chatRect.y,
                width: chatRect.slotWidth,  // Use slot width for bezel hole
                height: chatRect.slotHeight || chatRect.height
            },
            total: {
                width: frustum.width,
                height: frustum.height
            },
            bezel: bezelRect
        };
        
        // Update config from LayoutManager
        config.bezel.margin = bezelRect.margin;
        config.bezel.depth = bezelRect.depth;
        config.bezel.bevelSize = bezelRect.bevelSize;
        config.bezel.bevelThickness = bezelRect.bevelThickness;
        config.bezel.cornerRadius = bezelRect.cornerRadius;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // GEOMETRY CREATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create the main bezel frame with dual screen cutouts
     * Uses THREE.Shape with holes and ExtrudeGeometry
     */
    function createBezel() {
        const { bezel, colors } = config;
        const bezelRect = screenLayout.bezel;
        
        // Get pre-calculated dimensions from LayoutManager
        const outerWidth = bezelRect.outerWidth;
        const outerHeight = bezelRect.outerHeight;
        const bezelCenterX = bezelRect.x;
        const r = bezel.cornerRadius;
        
        // Create outer shape (rounded rectangle) - centered at origin
        const shape = new THREE.Shape();
        const x = -outerWidth / 2;
        const y = -outerHeight / 2;
        const w = outerWidth;
        const h = outerHeight;
        
        // Draw rounded rectangle clockwise
        shape.moveTo(x + r, y);
        shape.lineTo(x + w - r, y);
        shape.quadraticCurveTo(x + w, y, x + w, y + r);
        shape.lineTo(x + w, y + h - r);
        shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        shape.lineTo(x + r, y + h);
        shape.quadraticCurveTo(x, y + h, x, y + h - r);
        shape.lineTo(x, y + r);
        shape.quadraticCurveTo(x, y, x + r, y);
        
        // Create hole for main display using pre-calculated positions
        // IMPORTANT: Holes must be counter-clockwise for correct rendering
        const mainHole = bezelRect.mainHole;
        const mh = new THREE.Path();
        const mx = mainHole.x - mainHole.width / 2;
        const my = mainHole.y - mainHole.height / 2;
        // Counter-clockwise winding
        mh.moveTo(mx, my);
        mh.lineTo(mx, my + mainHole.height);
        mh.lineTo(mx + mainHole.width, my + mainHole.height);
        mh.lineTo(mx + mainHole.width, my);
        mh.closePath();
        shape.holes.push(mh);
        
        // Create hole for chat panel
        const chatHole = bezelRect.chatHole;
        const ch = new THREE.Path();
        const cx = chatHole.x - chatHole.width / 2;
        const cy = chatHole.y - chatHole.height / 2;
        // Counter-clockwise winding
        ch.moveTo(cx, cy);
        ch.lineTo(cx, cy + chatHole.height);
        ch.lineTo(cx + chatHole.width, cy + chatHole.height);
        ch.lineTo(cx + chatHole.width, cy);
        ch.closePath();
        shape.holes.push(ch);
        
        // Extrude settings for 80s plastic mold look
        const extrudeSettings = {
            steps: 2,
            depth: bezel.depth,
            bevelEnabled: true,
            bevelThickness: bezel.bevelThickness,
            bevelSize: bezel.bevelSize,
            bevelOffset: 0,
            bevelSegments: 3
        };
        
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        // Center the geometry (extrude goes in +Z, we want it centered)
        geometry.translate(0, 0, -bezel.depth / 2);
        
        // Create material with procedural texture
        const material = createPlasticMaterial(colors.plastic);
        
        bezelMesh = new THREE.Mesh(geometry, material);
        // Position at the center of the combined display area (from LayoutManager)
        bezelMesh.position.set(bezelCenterX, bezelRect.y, bezelRect.z);
        bezelMesh.name = 'bezel';
        
        chassisGroup.add(bezelMesh);
        
        console.log('[ChassisManager] Bezel created at x:', bezelCenterX);
    }
    
    /**
     * Create dark backing plate behind the screens
     */
    function createBackingPlate() {
        const { main, chat, total } = screenLayout;
        const { colors } = config;
        
        // Calculate combined center
        const combinedLeft = main.x - main.width / 2;
        const combinedRight = chat.x + chat.width / 2;
        const combinedCenterX = (combinedLeft + combinedRight) / 2;
        const combinedWidth = combinedRight - combinedLeft;
        
        // Simple box behind everything
        const geometry = new THREE.BoxGeometry(
            combinedWidth + 0.2,
            total.height + 0.2,
            0.1
        );
        
        const material = new THREE.MeshStandardMaterial({
            color: colors.accent,
            roughness: 0.9,
            metalness: 0.1
        });
        
        backingPlate = new THREE.Mesh(geometry, material);
        backingPlate.position.set(combinedCenterX, 0, -0.1);  // Behind screens
        backingPlate.name = 'backingPlate';
        
        chassisGroup.add(backingPlate);
    }
    
    /**
     * Create vertical divider bar between main display and chat
     */
    function createDividerBar() {
        const { main, chat } = screenLayout;
        const { bezel, colors } = config;
        
        // Position between the two screens
        const dividerX = (main.x + main.width / 2 + chat.x - chat.width / 2) / 2;
        const dividerWidth = 0.08;
        
        const geometry = new THREE.BoxGeometry(
            dividerWidth,
            main.height + bezel.margin,  // Match main display height
            bezel.depth + 0.02
        );
        
        const material = createMetalMaterial(colors.metal);
        
        dividerBar = new THREE.Mesh(geometry, material);
        dividerBar.position.set(dividerX, 0, 0.05);
        dividerBar.name = 'dividerBar';
        
        chassisGroup.add(dividerBar);
        
        console.log('[ChassisManager] Divider bar created at x:', dividerX);
    }
    
    /**
     * Create status LEDs on the chassis
     */
    function createStatusLEDs() {
        const { chat } = screenLayout;
        const { ledColors } = config;
        
        // Position LEDs below the chat panel
        const ledY = chat.y - chat.height / 2 - 0.15;
        const ledZ = 0.12;
        const ledRadius = 0.025;
        const ledSpacing = 0.08;
        
        const ledGeometry = new THREE.SphereGeometry(ledRadius, 8, 8);
        
        // Create each LED
        const ledConfigs = [
            // Push LEDs outward so they sit neatly in the outer bevel
            { name: 'power', color: ledColors.power, x: chat.x - 0.18 },
            { name: 'network', color: ledColors.network, x: chat.x - 0.06 },
            { name: 'activity', color: ledColors.activity, x: chat.x + 0.06 },
            { name: 'error', color: ledColors.error, x: chat.x + 0.18 }
        ];
        
        ledConfigs.forEach(cfg => {
            // LED sphere (self-illuminated)
            const material = new THREE.MeshBasicMaterial({
                color: cfg.color,
                transparent: true,
                opacity: 0.9
            });
            
            const led = new THREE.Mesh(ledGeometry, material);
            led.position.set(cfg.x, ledY, ledZ);
            led.name = `led_${cfg.name}`;
            
            // Store reference
            leds[cfg.name] = {
                mesh: led,
                baseColor: cfg.color,
                on: cfg.name === 'power' || cfg.name === 'network'  // Power and network start on
            };
            
            // Dim if off
            if (!leds[cfg.name].on) {
                material.opacity = 0.2;
            }
            
            chassisGroup.add(led);
        });
        
        console.log('[ChassisManager] Status LEDs created');
    }
    
    /**
     * Create light that simulates screen glow hitting the bezel
     */
    function createScreenLight() {
        const { main, chat } = screenLayout;
        const { colors } = config;
        
        // Point light in front of main screen
        screenLight = new THREE.PointLight(colors.screenGlow, 0.3, 2);
        screenLight.position.set(main.x, main.y, 0.3);
        screenLight.name = 'screenLight';
        
        chassisGroup.add(screenLight);
        
        console.log('[ChassisManager] Screen light created');
    }
    
    /**
     * Add scene lighting for PBR materials
     * Called during init to ensure chassis geometry is visible
     */
    function createSceneLighting(scene) {
        // Ambient light for base visibility
        const ambient = new THREE.AmbientLight(0x404040, 0.5);
        ambient.name = 'ambientLight';
        scene.add(ambient);
        
        // Directional light from above (simulates overhead lighting)
        const directional = new THREE.DirectionalLight(0xffffff, 0.4);
        directional.position.set(0, 2, 2);
        directional.name = 'directionalLight';
        scene.add(directional);
        
        // Subtle fill light from below
        const fill = new THREE.DirectionalLight(0x222244, 0.2);
        fill.position.set(0, -1, 1);
        fill.name = 'fillLight';
        scene.add(fill);
        
        console.log('[ChassisManager] Scene lighting created');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PROCEDURAL MATERIALS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create worn plastic material with procedural texture
     */
    function createPlasticMaterial(baseColor) {
        // For now, use a simple MeshStandardMaterial
        // TODO: Add procedural noise/scratch texture via CanvasTexture
        return new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.7,
            metalness: 0.1,
            flatShading: false
        });
    }
    
    /**
     * Create anodized metal material
     */
    function createMetalMaterial(baseColor) {
        return new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.4,
            metalness: 0.6,
            flatShading: false
        });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // LED CONTROL
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Set LED state
     * @param {string} name - LED name ('power', 'network', 'activity', 'error')
     * @param {boolean} on - Whether LED is on
     */
    function setLED(name, on) {
        const led = leds[name];
        if (!led) return;
        
        led.on = on;
        led.mesh.material.opacity = on ? 0.9 : 0.2;
    }
    
    /**
     * Blink an LED
     * @param {string} name - LED name
     * @param {number} duration - Blink duration in ms
     */
    function blinkLED(name, duration = 100) {
        const led = leds[name];
        if (!led) return;
        
        setLED(name, true);
        setTimeout(() => setLED(name, false), duration);
    }
    
    /**
     * Update activity LED (call when chat scrolls or terminal updates)
     */
    function pulseActivity() {
        blinkLED('activity', 50);
    }
    
    /**
     * Set error state
     */
    function setError(hasError) {
        setLED('error', hasError);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SCREEN LIGHT CONTROL
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Set screen glow color (for danger mode, etc.)
     * @param {number} color - Hex color
     */
    function setScreenGlowColor(color) {
        if (screenLight) {
            screenLight.color.setHex(color);
        }
    }
    
    /**
     * Set screen glow intensity
     * @param {number} intensity - Light intensity (0-1)
     */
    function setScreenGlowIntensity(intensity) {
        if (screenLight) {
            screenLight.intensity = intensity;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // VISIBILITY
    // ═══════════════════════════════════════════════════════════════════
    
    function show() {
        if (chassisGroup) {
            chassisGroup.visible = true;
        }
    }
    
    function hide() {
        if (chassisGroup) {
            chassisGroup.visible = false;
        }
    }
    
    function isVisible() {
        return chassisGroup ? chassisGroup.visible : false;
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
        
        // LED control
        setLED,
        blinkLED,
        pulseActivity,
        setError,
        
        // Screen light
        setScreenGlowColor,
        setScreenGlowIntensity,
        
        // Access
        getGroup: () => chassisGroup,
        getScreenLayout: () => ({ ...screenLayout }),
        getConfig: () => ({ ...config })
    };
})();

console.log('[ChassisManager] Module loaded');
