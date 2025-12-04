/**
 * RenderManager - Central orchestrator for all Three.js rendering
 * 
 * This is THE rendering authority. All visual output goes through here.
 * 
 * Responsibilities:
 * - Scene, camera, renderer setup
 * - EffectComposer for post-processing
 * - UI panel management (terminal, chat, dice as Three.js planes)
 * - Render loop coordination (called by AnimationManager)
 * - Texture updates from canvas-based UI
 */

const RenderManager = (function() {
    
    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════
    
    let scene = null;
    let camera = null;
    let renderer = null;
    let composer = null;
    
    // Post-processing passes
    let bloomPass = null;
    let chromaticPass = null;
    
    // Main scene plane (background + ASCII shader)
    let scenePlane = null;
    
    // UI panels (Three.js meshes with canvas textures)
    const uiPanels = {
        terminal: null,     // Terminal overlay
        chat: null,         // Chat log sidebar
        dice: null          // Dice panel
    };
    
    // Canvas textures for UI panels
    const uiTextures = {
        terminal: null,
        chat: null,
        dice: null
    };
    
    // Resolution tracking
    let resolution = null;
    let containerElement = null;
    
    // Render state
    let initialized = false;
    let needsRender = true;
    
    // Layout constants
    const LAYOUT = {
        // Main viewport takes most of the screen
        viewport: {
            aspect: 4 / 3,  // CRT aspect ratio
            margin: 0.02    // Small margin around viewport
        },
        // Sidebar for chat/dice (right side)
        sidebar: {
            width: 0.25,    // 25% of screen width
            chatHeight: 0.7, // 70% of sidebar for chat
            diceHeight: 0.3  // 30% of sidebar for dice
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Initialize the render manager
     * @param {Object} options - Configuration options
     */
    function init(options = {}) {
        if (initialized) {
            console.warn('[RenderManager] Already initialized');
            return;
        }
        
        containerElement = options.container || document.getElementById('viewport');
        if (!containerElement) {
            console.error('[RenderManager] No container element found');
            return;
        }
        
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0a);
        
        // Store resolution
        resolution = new THREE.Vector2(
            containerElement.clientWidth,
            containerElement.clientHeight
        );
        
        // Create camera (orthographic for 2D UI)
        createCamera();
        
        // Create renderer
        const canvas = options.canvas || document.getElementById('scene-canvas');
        renderer = new THREE.WebGLRenderer({ 
            canvas, 
            antialias: false,
            alpha: false
        });
        renderer.setSize(resolution.x, resolution.y);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // Set up post-processing
        initPostProcessing();
        
        // Handle window resize
        window.addEventListener('resize', handleResize);
        
        initialized = true;
        console.log('[RenderManager] Initialized');
        
        return { scene, camera, renderer, composer };
    }
    
    /**
     * Create orthographic camera sized for the container
     */
    function createCamera() {
        const aspect = resolution.x / resolution.y;
        const frustumHeight = 2;
        const frustumWidth = frustumHeight * aspect;
        
        camera = new THREE.OrthographicCamera(
            -frustumWidth / 2, frustumWidth / 2,
            frustumHeight / 2, -frustumHeight / 2,
            0.1, 100
        );
        camera.position.z = 10;
    }
    
    /**
     * Initialize post-processing pipeline
     */
    function initPostProcessing() {
        composer = new THREE.EffectComposer(renderer);
        
        // Render pass - renders scene to buffer
        const renderPass = new THREE.RenderPass(scene, camera);
        composer.addPass(renderPass);
        
        // Bloom pass (UnrealBloomPass)
        const bloomConfig = typeof CRTShader !== 'undefined' ? CRTShader.config : {
            unrealBloomStrength: 0.5,
            unrealBloomRadius: 0.5,
            unrealBloomThreshold: 0.8
        };
        
        bloomPass = new THREE.UnrealBloomPass(
            resolution,
            bloomConfig.unrealBloomStrength,
            bloomConfig.unrealBloomRadius,
            bloomConfig.unrealBloomThreshold
        );
        composer.addPass(bloomPass);
        
        console.log('[RenderManager] Post-processing initialized');
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UI PANEL MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create a UI panel (Three.js plane with canvas texture)
     * @param {string} name - Panel name ('terminal', 'chat', 'dice')
     * @param {Object} options - Panel options
     * @returns {Object} { mesh, canvas, ctx, texture, config }
     */
    function createUIPanel(name, options = {}) {
        const width = options.width || 512;
        const height = options.height || 512;
        const position = options.position || { x: 0, y: 0, z: 0 };
        const scale = options.scale || { x: 1, y: 1 };
        
        // Create canvas for this panel
        const { canvas, ctx, config } = TextRenderer.createCanvas(width, height, {
            phosphor: options.phosphor || 'p3',
            fontSize: options.fontSize || 16,
            ...options
        });
        
        // Create Three.js texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        // Create material
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: options.opacity ?? 1.0
        });
        
        // Create plane geometry
        const geometry = new THREE.PlaneGeometry(scale.x, scale.y);
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, position.z);
        
        // Add to scene
        scene.add(mesh);
        
        // Store references
        uiPanels[name] = mesh;
        uiTextures[name] = texture;
        
        console.log(`[RenderManager] Created UI panel: ${name}`);
        
        return { mesh, canvas, ctx, texture, config };
    }
    
    /**
     * Update a UI panel's texture (call after rendering to canvas)
     * @param {string} name - Panel name
     */
    function updatePanelTexture(name) {
        const texture = uiTextures[name];
        if (texture) {
            texture.needsUpdate = true;
            needsRender = true;
        }
    }
    
    /**
     * Show/hide a UI panel
     * @param {string} name - Panel name
     * @param {boolean} visible
     */
    function setPanelVisible(name, visible) {
        const panel = uiPanels[name];
        if (panel) {
            panel.visible = visible;
            needsRender = true;
        }
    }
    
    /**
     * Get a UI panel
     * @param {string} name - Panel name
     * @returns {THREE.Mesh|null}
     */
    function getPanel(name) {
        return uiPanels[name] || null;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SCENE PLANE (MAIN VIEWPORT)
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Create the main scene plane (for background + CRT shader)
     * @param {Object} options
     */
    function createScenePlane(options = {}) {
        const aspect = LAYOUT.viewport.aspect;
        const geometry = new THREE.PlaneGeometry(2 * aspect, 2);
        
        // Use CRT shader if available
        let material;
        if (typeof CRTShader !== 'undefined') {
            material = CRTShader.createMaterial(null, resolution);
        } else {
            material = new THREE.MeshBasicMaterial({ color: 0x111111 });
        }
        
        scenePlane = new THREE.Mesh(geometry, material);
        scenePlane.position.z = 0;
        scene.add(scenePlane);
        
        console.log('[RenderManager] Scene plane created');
        return scenePlane;
    }
    
    /**
     * Set the scene plane texture (background image)
     * @param {THREE.Texture} texture
     */
    function setSceneTexture(texture) {
        if (scenePlane && scenePlane.material.uniforms) {
            scenePlane.material.uniforms.sceneTexture.value = texture;
            needsRender = true;
        }
    }
    
    /**
     * Get the scene plane material
     * @returns {THREE.Material|null}
     */
    function getScenePlaneMaterial() {
        return scenePlane ? scenePlane.material : null;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Main render function - called by AnimationManager each frame
     * @param {number} delta - Time since last frame in ms
     * @param {number} now - Current timestamp
     */
    function render(delta, now) {
        if (!initialized) return;
        
        // Update time uniform for CRT shader
        if (scenePlane && scenePlane.material.uniforms) {
            scenePlane.material.uniforms.time.value = now * 0.001;
            
            // Update other uniforms from config
            if (typeof CRTShader !== 'undefined') {
                CRTShader.updateUniforms(scenePlane.material);
            }
        }
        
        // Update bloom pass from config
        if (bloomPass && typeof CRTShader !== 'undefined') {
            const config = CRTShader.config;
            bloomPass.strength = config.unrealBloomEnabled ? config.unrealBloomStrength : 0;
            bloomPass.radius = config.unrealBloomRadius;
            bloomPass.threshold = config.unrealBloomThreshold;
        }
        
        // Render through composer (includes post-processing)
        if (composer) {
            composer.render();
        } else {
            renderer.render(scene, camera);
        }
        
        needsRender = false;
    }
    
    /**
     * Force a render on next frame
     */
    function requestRender() {
        needsRender = true;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // RESIZE HANDLING
    // ═══════════════════════════════════════════════════════════════════
    
    function handleResize() {
        if (!containerElement || !renderer) return;
        
        resolution.set(
            containerElement.clientWidth,
            containerElement.clientHeight
        );
        
        // Update camera
        const aspect = resolution.x / resolution.y;
        const frustumHeight = 2;
        const frustumWidth = frustumHeight * aspect;
        
        camera.left = -frustumWidth / 2;
        camera.right = frustumWidth / 2;
        camera.top = frustumHeight / 2;
        camera.bottom = -frustumHeight / 2;
        camera.updateProjectionMatrix();
        
        // Update renderer
        renderer.setSize(resolution.x, resolution.y);
        
        // Update composer
        if (composer) {
            composer.setSize(resolution.x, resolution.y);
        }
        
        // Update bloom pass
        if (bloomPass) {
            bloomPass.resolution.set(resolution.x, resolution.y);
        }
        
        // Update scene plane material
        if (scenePlane && scenePlane.material.uniforms && scenePlane.material.uniforms.resolution) {
            scenePlane.material.uniforms.resolution.value = resolution;
        }
        
        needsRender = true;
        console.log('[RenderManager] Resized to', resolution.x, 'x', resolution.y);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // GETTERS
    // ═══════════════════════════════════════════════════════════════════
    
    function getScene() { return scene; }
    function getCamera() { return camera; }
    function getRenderer() { return renderer; }
    function getComposer() { return composer; }
    function getResolution() { return resolution; }
    function isInitialized() { return initialized; }
    
    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    return {
        // Initialization
        init,
        isInitialized,
        
        // Core Three.js objects
        getScene,
        getCamera,
        getRenderer,
        getComposer,
        getResolution,
        
        // Scene plane (main viewport)
        createScenePlane,
        setSceneTexture,
        getScenePlaneMaterial,
        
        // UI panels
        createUIPanel,
        updatePanelTexture,
        setPanelVisible,
        getPanel,
        
        // Rendering
        render,
        requestRender,
        
        // Layout constants
        LAYOUT
    };
})();

console.log('[RenderManager] Module loaded');
