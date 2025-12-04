/**
 * ControlPanelManager - Physical buttons and dials on the chassis
 * 
 * Creates diegetic hardware controls for the retro-futuristic UI:
 * - Buttons: OPTIONS, GM MODE, TERMINAL (beveled style matching chassis)
 * - Dials: Brightness, Contrast, Effect Intensity
 * 
 * Buttons are positioned at the bottom-left of the frame.
 * Text glows when button is active.
 */

const ControlPanelManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let initialized = false;
    let controlGroup = null;
    
    // Button meshes and labels
    const buttons = {
        options: { group: null, label: null, labelCanvas: null },
        gmMode: { group: null, label: null, labelCanvas: null },
        terminal: { group: null, label: null, labelCanvas: null }
    };
    
    // Dial meshes and state
    const dials = {
        brightness: { mesh: null, value: 1.0, min: 0.5, max: 1.5 },
        contrast: { mesh: null, value: 1.0, min: 0.5, max: 1.5 },
        effects: { mesh: null, value: 1.0, min: 0.0, max: 1.0 }
    };
    
    // Button state
    const buttonState = {
        options: false,
        gmMode: false,
        terminal: false
    };
    
    // Configuration
    const config = {
        // Button appearance (beveled rectangular style)
        button: {
            width: 0.28,
            height: 0.06,
            depth: 0.015,
            bevelSize: 0.003,      // Very small bevel for subtle edge
            bevelThickness: 0.002,
            cornerRadius: 0.005   // Tiny corner radius for rectangular look
        },
        
        // Dial appearance
        dial: {
            radius: 0.045,
            depth: 0.03,
            segments: 24
        },
        
        // Colors
        colors: {
            buttonBody: 0x1a1a1a,      // Dark plastic like chassis
            buttonActive: 0x252525,
            textOff: '#888888',        // Visible dim text when off
            textOn: '#33ff66',         // Glowing green when on
            textAmber: '#ffaa00',      // Amber for GM mode
            dialBody: 0x1a1a1a,
            dialKnob: 0x3a3a3a,
            dialMarker: 0xffffff
        }
    };
    
    // Screen layout reference (set during init)
    let screenLayout = null;
    let chassisConfig = null;
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    function init(scene, options = {}) {
        if (initialized) {
            console.warn('[ControlPanelManager] Already initialized');
            return;
        }
        
        // Get layout from LayoutManager (single source of truth)
        if (typeof LayoutManager !== 'undefined' && LayoutManager.isInitialized()) {
            const mainRect = LayoutManager.getMainDisplayRect();
            const chatRect = LayoutManager.getChatPanelRect();
            const frustum = LayoutManager.getFrustum();
            const controlLayout = LayoutManager.getControlPanelLayout();
            
            screenLayout = {
                main: mainRect,
                chat: chatRect,
                total: frustum,
                controls: controlLayout
            };
            console.log('[ControlPanelManager] Using LayoutManager');
        } else {
            console.warn('[ControlPanelManager] LayoutManager not available');
            return;
        }
        
        // Create parent group
        controlGroup = new THREE.Group();
        controlGroup.name = 'controlPanel';
        
        // Create buttons below the main display
        createButtons();
        
        // Create dials below the chat panel
        createDials();
        
        // Add to scene
        if (scene) {
            scene.add(controlGroup);
        }
        
        // Register click handlers
        registerClickHandlers();
        
        initialized = true;
        console.log('[ControlPanelManager] Initialized with buttons and dials');
        
        return controlGroup;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // BUTTON CREATION
    // ═══════════════════════════════════════════════════════════════════
    
    function createButtons() {
        const { controls } = screenLayout;
        const { button, colors } = config;
        
        // Use pre-calculated positions from LayoutManager
        const buttonY = controls.buttons.y;
        const buttonZ = controls.buttons.z;
        const startX = controls.buttons.startX;
        const spacing = controls.buttons.spacing;
        
        const buttonConfigs = [
            { name: 'options', label: 'OPTIONS', x: startX },
            { name: 'gmMode', label: 'GM MODE', x: startX + spacing },
            { name: 'terminal', label: 'TERMINAL', x: startX + spacing * 2 }
        ];
        
        buttonConfigs.forEach(cfg => {
            const result = createBeveledButton(cfg.name, cfg.label, cfg.x, buttonY, buttonZ);
            buttons[cfg.name] = result;
            controlGroup.add(result.group);
        });
        
        console.log('[ControlPanelManager] Buttons created at Y:', buttonY, 'startX:', startX);
    }
    
    function createBeveledButton(name, label, x, y, z) {
        const { button, colors } = config;
        
        // Button group
        const buttonGroup = new THREE.Group();
        buttonGroup.position.set(x, y, z);
        buttonGroup.userData.buttonName = name;
        buttonGroup.userData.isButton = true;
        
        // Create beveled button shape using ExtrudeGeometry (matching chassis style)
        const shape = new THREE.Shape();
        const w = button.width;
        const h = button.height;
        const r = button.cornerRadius || 0.005;  // Small corner radius for rectangular look
        
        // Nearly rectangular with tiny rounded corners
        shape.moveTo(-w/2 + r, -h/2);
        shape.lineTo(w/2 - r, -h/2);
        shape.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
        shape.lineTo(w/2, h/2 - r);
        shape.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
        shape.lineTo(-w/2 + r, h/2);
        shape.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
        shape.lineTo(-w/2, -h/2 + r);
        shape.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);
        
        const extrudeSettings = {
            steps: 1,
            depth: button.depth,
            bevelEnabled: true,
            bevelThickness: button.bevelThickness,
            bevelSize: button.bevelSize,
            bevelSegments: 2
        };
        
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.translate(0, 0, -button.depth / 2);
        
        // Use MeshBasicMaterial for buttons so they're always visible (no lighting needed)
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: 0x2a2a2a  // Slightly lighter so it's visible against dark background
        });
        
        const body = new THREE.Mesh(geometry, bodyMaterial);
        body.name = 'buttonBody';
        buttonGroup.add(body);
        
        // Create label with canvas (supports glow effect)
        const labelResult = createGlowingLabel(label, button.width * 0.9, button.height * 0.7, colors.textOff);
        // Position label in front of button (button is centered at z=0 after translate)
        labelResult.mesh.position.set(0, 0, button.depth / 2 + button.bevelThickness + 0.005);
        labelResult.mesh.name = 'buttonLabel';
        buttonGroup.add(labelResult.mesh);
        
        console.log(`[ControlPanelManager] Created button '${label}' at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
        
        return {
            group: buttonGroup,
            body: body,
            label: labelResult.mesh,
            labelCanvas: labelResult.canvas,
            labelCtx: labelResult.ctx,
            labelTexture: labelResult.texture,
            labelText: label
        };
    }
    
    function createGlowingLabel(text, width, height, color) {
        // Create canvas for label with glow capability
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // High-res canvas for crisp text
        const scale = 6;
        canvas.width = Math.round(width * 200 * scale);
        canvas.height = Math.round(height * 200 * scale);
        
        // Draw text
        renderLabelText(ctx, canvas, text, color, false);
        
        // Create texture and mesh
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        return { mesh, canvas, ctx, texture };
    }
    
    function renderLabelText(ctx, canvas, text, color, glowing) {
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Debug: draw a subtle background to verify canvas is rendering
        // ctx.fillStyle = 'rgba(255,0,0,0.2)';
        // ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const fontSize = Math.max(canvas.height * 0.5, 20);
        // Use system fonts as fallback in case IBM Plex Mono isn't loaded
        ctx.font = `bold ${fontSize}px "IBM Plex Mono", "Courier New", Courier, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (glowing) {
            // Draw glow layers
            ctx.shadowColor = color;
            ctx.shadowBlur = fontSize * 0.4;
            ctx.fillStyle = color;
            
            // Multiple passes for stronger glow
            for (let i = 0; i < 3; i++) {
                ctx.fillText(text, canvas.width / 2, canvas.height / 2);
            }
            
            // Final crisp text on top
            ctx.shadowBlur = 0;
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        } else {
            // Simple dim text - ensure it's visible
            ctx.fillStyle = color;
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        }
        
        console.log(`[ControlPanelManager] Rendered label '${text}' on ${canvas.width}x${canvas.height} canvas, color: ${color}`);
    }
    
    function createLabelMesh(text, width, height) {
        // Create canvas for simple label (used by dials)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const scale = 4;
        canvas.width = Math.round(width * 200 * scale);
        canvas.height = Math.round(height * 200 * scale);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666666';
        ctx.font = `bold ${canvas.height * 0.5}px "IBM Plex Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // DIAL CREATION
    // ═══════════════════════════════════════════════════════════════════
    
    function createDials() {
        const { controls } = screenLayout;
        const { dial, colors } = config;
        
        // Use pre-calculated positions from LayoutManager
        const dialY = controls.dials.y;
        const dialZ = controls.dials.z;
        const spacing = controls.dials.spacing;
        const startX = controls.dials.startX;
        
        const dialConfigs = [
            { name: 'brightness', label: 'BRIGHT', x: startX },
            { name: 'contrast', label: 'CONTRAST', x: startX + spacing },
            { name: 'effects', label: 'EFFECTS', x: startX + spacing * 2 }
        ];
        
        dialConfigs.forEach(cfg => {
            const dialMesh = createDial(cfg.label, cfg.x, dialY, dialZ, dials[cfg.name].value);
            dialMesh.userData.dialName = cfg.name;
            dials[cfg.name].mesh = dialMesh;
            controlGroup.add(dialMesh);
        });
        
        console.log('[ControlPanelManager] Dials created at Y:', dialY, 'startX:', startX);
    }
    
    function createDial(label, x, y, z, initialValue) {
        const { dial, colors } = config;
        
        // Dial group
        const dialGroup = new THREE.Group();
        dialGroup.position.set(x, y, z);
        
        // Dial base (cylinder)
        const baseGeometry = new THREE.CylinderGeometry(
            dial.radius,
            dial.radius * 1.1,
            dial.depth * 0.3,
            dial.segments
        );
        baseGeometry.rotateX(Math.PI / 2);
        
        const baseMaterial = new THREE.MeshBasicMaterial({
            color: 0x2a2a2a
        });
        
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.name = 'dialBase';
        dialGroup.add(base);
        
        // Dial knob (cylinder with notch)
        const knobGeometry = new THREE.CylinderGeometry(
            dial.radius * 0.8,
            dial.radius * 0.8,
            dial.depth,
            dial.segments
        );
        knobGeometry.rotateX(Math.PI / 2);
        
        const knobMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a4a4a
        });
        
        const knob = new THREE.Mesh(knobGeometry, knobMaterial);
        knob.position.z = dial.depth * 0.5;
        knob.name = 'dialKnob';
        dialGroup.add(knob);
        
        // Indicator line on knob
        const indicatorGeometry = new THREE.BoxGeometry(
            dial.radius * 0.1,
            dial.radius * 0.6,
            0.005
        );
        
        const indicatorMaterial = new THREE.MeshBasicMaterial({
            color: colors.dialMarker
        });
        
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.set(0, dial.radius * 0.4, dial.depth + 0.003);
        indicator.name = 'dialIndicator';
        knob.add(indicator);
        
        // Set initial rotation based on value (0-1 maps to -135° to +135°)
        const angle = valueToAngle(initialValue);
        knob.rotation.z = angle;
        
        // Label below dial
        const labelMesh = createLabelMesh(label, dial.radius * 3, dial.radius);
        labelMesh.position.set(0, -dial.radius - 0.03, 0.01);
        labelMesh.name = 'dialLabel';
        dialGroup.add(labelMesh);
        
        // Store references
        dialGroup.userData.knob = knob;
        dialGroup.userData.isDial = true;
        
        return dialGroup;
    }
    
    function valueToAngle(value) {
        // Map 0-1 to -135° to +135° (270° total range)
        const minAngle = -Math.PI * 0.75;  // -135°
        const maxAngle = Math.PI * 0.75;   // +135°
        return minAngle + (1 - value) * (maxAngle - minAngle);
    }
    
    function angleToValue(angle) {
        const minAngle = -Math.PI * 0.75;
        const maxAngle = Math.PI * 0.75;
        return 1 - (angle - minAngle) / (maxAngle - minAngle);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // INTERACTION
    // ═══════════════════════════════════════════════════════════════════
    
    function registerClickHandlers() {
        // Register with UIManager for raycasting
        if (typeof UIManager !== 'undefined') {
            // Register each button (use the group, not the whole object)
            Object.keys(buttons).forEach(name => {
                const btn = buttons[name];
                if (btn && btn.group) {
                    UIManager.registerClickable(btn.group, () => handleButtonClick(name));
                }
            });
            
            // Register each dial for drag interaction
            Object.keys(dials).forEach(name => {
                const dial = dials[name];
                if (dial.mesh) {
                    UIManager.registerDraggable(dial.mesh, (delta) => handleDialDrag(name, delta));
                }
            });
        }
    }
    
    function handleButtonClick(name) {
        console.log('[ControlPanelManager] Button clicked:', name);
        
        // Toggle button state
        buttonState[name] = !buttonState[name];
        
        // Update LED
        updateButtonLED(name, buttonState[name]);
        
        // Trigger action
        switch (name) {
            case 'options':
                // Toggle options panel (could be Tweakpane or custom)
                if (typeof EventBus !== 'undefined') {
                    EventBus.emit('ui:options-toggle');
                }
                // Fallback: toggle DebugUI
                if (typeof DebugUI !== 'undefined') {
                    DebugUI.toggleVisibility();
                }
                break;
                
            case 'gmMode':
                // Toggle GM mode
                if (typeof EventBus !== 'undefined') {
                    EventBus.emit('ui:gm-mode-toggle');
                }
                break;
                
            case 'terminal':
                // Toggle terminal
                if (typeof EventBus !== 'undefined') {
                    EventBus.emit('ui:terminal-toggle');
                }
                break;
        }
        
        // Play click sound
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playUISound('click');
        }
    }
    
    function handleDialDrag(name, delta) {
        const dial = dials[name];
        if (!dial || !dial.mesh) return;
        
        // Update value based on drag delta
        const sensitivity = 0.005;
        dial.value = Math.max(dial.min, Math.min(dial.max, dial.value + delta.y * sensitivity));
        
        // Update knob rotation
        const normalizedValue = (dial.value - dial.min) / (dial.max - dial.min);
        const angle = valueToAngle(normalizedValue);
        dial.mesh.userData.knob.rotation.z = angle;
        
        // Apply effect
        applyDialValue(name, dial.value);
    }
    
    function applyDialValue(name, value) {
        if (typeof CRTShader === 'undefined') return;
        
        switch (name) {
            case 'brightness':
                CRTShader.config.brightness = value;
                break;
                
            case 'contrast':
                CRTShader.config.contrast = value;
                break;
                
            case 'effects':
                // Effect intensity scales multiple parameters
                CRTShader.config.scanlineIntensity = 0.02 * value;
                CRTShader.config.phosphorMaskIntensity = 0.41 * value;
                CRTShader.config.chromaticAberration = 0.002 * value;
                CRTShader.config.vignetteStrength = 0.59 * value;
                break;
        }
    }
    
    function updateButtonLED(name, isOn) {
        const btn = buttons[name];
        if (!btn || !btn.labelCanvas) return;
        
        const { colors } = config;
        
        // Determine the glow color based on button type and state
        let textColor;
        if (isOn) {
            textColor = name === 'gmMode' ? colors.textAmber : colors.textOn;
        } else {
            textColor = colors.textOff;
        }
        
        // Re-render the label with glow effect
        renderLabelText(btn.labelCtx, btn.labelCanvas, btn.labelText, textColor, isOn);
        btn.labelTexture.needsUpdate = true;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API - BUTTON CONTROL
    // ═══════════════════════════════════════════════════════════════════
    
    function setButtonState(name, isOn) {
        if (buttons[name]) {
            buttonState[name] = isOn;
            updateButtonLED(name, isOn);
        }
    }
    
    function getButtonState(name) {
        return buttonState[name] || false;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API - DIAL CONTROL
    // ═══════════════════════════════════════════════════════════════════
    
    function setDialValue(name, value) {
        const dial = dials[name];
        if (!dial) return;
        
        dial.value = Math.max(dial.min, Math.min(dial.max, value));
        
        // Update visual
        if (dial.mesh && dial.mesh.userData.knob) {
            const normalizedValue = (dial.value - dial.min) / (dial.max - dial.min);
            const angle = valueToAngle(normalizedValue);
            dial.mesh.userData.knob.rotation.z = angle;
        }
        
        // Apply effect
        applyDialValue(name, dial.value);
    }
    
    function getDialValue(name) {
        return dials[name] ? dials[name].value : 0;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // VISIBILITY
    // ═══════════════════════════════════════════════════════════════════
    
    function show() {
        if (controlGroup) controlGroup.visible = true;
    }
    
    function hide() {
        if (controlGroup) controlGroup.visible = false;
    }
    
    function isVisible() {
        return controlGroup ? controlGroup.visible : false;
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
        
        // Button control
        setButtonState,
        getButtonState,
        handleButtonClick,
        
        // Dial control
        setDialValue,
        getDialValue,
        
        // Access
        getGroup: () => controlGroup,
        getButtons: () => ({ ...buttons }),
        getDials: () => ({ ...dials })
    };
    
})();
