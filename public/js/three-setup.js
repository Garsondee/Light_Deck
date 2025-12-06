/**
 * Three.js Scene Setup
 * Creates the basic rendering infrastructure for the visual feed
 */

const ThreeSetup = (function() {
    let scene, camera, renderer;
    let scenePlane;
    let animationId;
    let textureLoader;
    let currentTexture;
    let resolution;
    
    // Post-processing
    let composer;
    let bloomPass;
    let chromaticPass;
    
    // Chromatic Aberration Shader (applied after bloom, outside CRT)
    const ChromaticAberrationShader = {
        uniforms: {
            'tDiffuse': { value: null },
            'amount': { value: 0.003 },
            'centerBased': { value: 1.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float amount;
            uniform float centerBased;
            varying vec2 vUv;
            
            void main() {
                if (amount < 0.0001) {
                    gl_FragColor = texture2D(tDiffuse, vUv);
                    return;
                }
                
                float edgeDist = centerBased > 0.5 ? length(vUv - 0.5) * 2.0 : 1.0;
                float aberr = amount * edgeDist;
                
                vec2 dir = normalize(vUv - 0.5 + 0.0001); // avoid zero vector
                float r = texture2D(tDiffuse, vUv + dir * aberr).r;
                float g = texture2D(tDiffuse, vUv).g;
                float b = texture2D(tDiffuse, vUv - dir * aberr).b;
                
                gl_FragColor = vec4(r, g, b, 1.0);
            }
        `
    };
    
    // Automatic glitch scheduling
    let nextAutoGlitchTime = 0; // ms timestamp for when the next random glitch can occur
    
    // Terminal render-to-texture
    let terminalCanvas = null;
    let terminalTexture = null;
    let terminalMode = false;
    let backgroundTexture = null; // Store the scene background when switching to terminal
    let terminalElementRef = null; // DOM element whose phosphor text we mirror into the CRT
    
    // Separate CRT shader config presets for Scene Viewer vs Terminal Mode
    let sceneViewerConfigSnapshot = null; // Captured from CRTShader.config on first terminal switch
    const TERMINAL_MODE_CRT_CONFIG = {
        fontFamily: 'IBM Plex Mono',
        fontWeight: 400,
        charSet: 'extended',
        customCharSet: '',
        liftR: 0,
        liftG: 0,
        liftB: -0.01,
        gammaR: 1.11,
        gammaG: 1.17,
        gammaB: 1.19,
        gainR: 2,
        gainG: 1.8,
        gainB: 2,
        colorTemperature: -0.2,
        colorTint: 0.2,
        saturation: 2,
        vibrance: 0.73,
        exposure: -0.25,
        gamma: 0.8099999999999999,
        unrealBloomEnabled: true,
        unrealBloomStrength: 0.58,
        unrealBloomRadius: 1,
        unrealBloomThreshold: 0.56,
        cellWidth: 24,
        cellHeight: 32,
        gapX: 0,
        gapY: 0,
        charCount: 42,
        useShapeMatching: false,
        asciiMode: false,
        tintColor: { r: 0, g: 255, b: 32 },
        tintStrength: 0,
        brightness: 1.11,
        contrast: 0.95,
        backgroundBleed: 0.95,
        bloomIntensity: 0.68,
        bloomThreshold: 0.23,
        shimmerIntensity: 0.24,
        shimmerSpeed: 0.5,
        scanlineIntensity: 0.01,
        scanlineCount: 100,
        scanlineSpeed: 2,
        noiseIntensity: 0,
        vignetteStrength: 0.39999999999999997,
        glitchAmount: 0,
        glitchSeed: 87.25510321861039,
        chromaticAberration: 0.001,
        chromaticCenter: true,
        // Terminal-mode curvature (slightly flatter than Scene Viewer)
        barrelDistortion: 0.09,
        barrelZoom: 1.07,
        phosphorMaskType: 1,
        phosphorMaskIntensity: 0.09999999999999996,
        phosphorMaskScale: 4,
        interlaceEnabled: true,
        interlaceIntensity: 0.5,
        hSyncWobble: 0.020000000000000004,
        hSyncWobbleSpeed: 0.5,
        beamWidth: 0.6,
        persistenceEnabled: true,
        persistenceIntensity: 0.86,
        persistenceDecay: 0.85,
        glowIntensity: 0.059999999999999984,
        glowRadius: 7,
        ambientLight: 0,
        filmGrainIntensity: 0.05,
        filmGrainSize: 7.8,
        filmGrainSpeed: 12
    };
    
    // Image aspect ratio (4:3)
    const IMAGE_ASPECT = 4 / 3;
    
    function init() {
        const canvas = document.getElementById('scene-canvas');
        const container = document.getElementById('viewport');
        
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0a);
        
        // Initialize GlitchEffects
        if (typeof GlitchEffects !== 'undefined') {
            GlitchEffects.init();
        }
        
        // Texture loader
        textureLoader = new THREE.TextureLoader();
        
        // Store resolution for shader
        resolution = new THREE.Vector2(container.clientWidth, container.clientHeight);
        
        // Orthographic camera - sized to fit 16:9 content
        updateCameraForContainer(container);
        
        // Renderer
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // Create the scene plane (starts with placeholder)
        createScenePlane();
        
        // Set up post-processing with UnrealBloomPass
        initPostProcessing();
        
        // Load default test image
        loadSceneImage('/assets/scene_backgrounds/test.png');
        
        // Handle resize
        window.addEventListener('resize', onResize);
        
        // Start render loop
        animate();
        
        console.log('[THREE] Scene initialized with UnrealBloomPass');
        return { scene, camera, renderer, composer };
    }
    
    function updateCameraForContainer(container) {
        const containerAspect = container.clientWidth / container.clientHeight;
        
        // We want to show the full 16:9 image, letterboxed if needed
        let frustumWidth, frustumHeight;
        
        if (containerAspect > IMAGE_ASPECT) {
            // Container is wider than image - fit to height, letterbox sides
            frustumHeight = 2;
            frustumWidth = frustumHeight * containerAspect;
        } else {
            // Container is taller than image - fit to width, letterbox top/bottom
            frustumWidth = 2 * IMAGE_ASPECT;
            frustumHeight = frustumWidth / containerAspect;
        }
        
        if (!camera) {
            camera = new THREE.OrthographicCamera(
                -frustumWidth / 2, frustumWidth / 2,
                frustumHeight / 2, -frustumHeight / 2,
                0.1, 100
            );
            camera.position.z = 1;
        } else {
            camera.left = -frustumWidth / 2;
            camera.right = frustumWidth / 2;
            camera.top = frustumHeight / 2;
            camera.bottom = -frustumHeight / 2;
            camera.updateProjectionMatrix();
        }
    }
    
    function createScenePlane() {
        // 4:3 plane geometry - positioned on the LEFT side of the viewport
        // This leaves room for the chat panel on the right
        const planeWidth = 2 * IMAGE_ASPECT;  // 2.67 units wide
        const planeHeight = 2;                 // 2 units tall
        
        // Use high-segment geometry for CRT bulge effect
        // More segments = smoother curve
        const segmentsX = 64;
        const segmentsY = 48;
        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, segmentsX, segmentsY);
        
        // Apply CRT bulge - push center vertices forward (toward camera)
        // This simulates the curved glass of a real CRT monitor
        const bulgeStrength = 0.08;  // How much the center bulges forward
        const positions = geometry.attributes.position;
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            
            // Normalize coordinates to -1 to 1 range
            const nx = (x / (planeWidth / 2));
            const ny = (y / (planeHeight / 2));
            
            // Calculate distance from center (0-1)
            // Use elliptical distance to account for aspect ratio
            const dist = Math.sqrt(nx * nx + ny * ny);
            
            // Bulge formula: parabolic falloff from center
            // Center (dist=0) gets full bulge, edges (dist=1) get none
            const bulge = bulgeStrength * (1 - dist * dist);
            
            // Push vertex forward (positive Z)
            positions.setZ(i, Math.max(0, bulge));
        }
        
        // Update geometry
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
        
        // Use CRT shader material
        const material = CRTShader.createMaterial(null, resolution);
        
        scenePlane = new THREE.Mesh(geometry, material);
        
        // Initial fallback position (will be updated by LayoutManager later)
        if (camera) {
            const leftEdge = camera.left + 0.02;
            scenePlane.position.x = leftEdge + planeWidth / 2;
        }
        
        scene.add(scenePlane);
        
        console.log('[THREE] CRT screen created with bulge effect');
    }
    
    /**
     * Update scene plane position from LayoutManager
     * Called after LayoutManager is initialized
     */
    function updateScenePlanePosition() {
        if (!scenePlane) return;
        
        if (typeof LayoutManager !== 'undefined' && LayoutManager.isInitialized()) {
            const rect = LayoutManager.getMainDisplayRect();

            // Fit the curved CRT plane directly to the full main display hole.
            // The visible image is still inset by the shader/barrel zoom, but the
            // black surround now fills the entire bezel width and height.
            const targetWidthMax = rect.width;
            const targetHeightMax = rect.height;

            // Maintain 4:3 aspect
            let targetWidth = targetWidthMax;
            let targetHeight = targetWidth / IMAGE_ASPECT;
            if (targetHeight > targetHeightMax) {
                targetHeight = targetHeightMax;
                targetWidth = targetHeight * IMAGE_ASPECT;
            }

            // Base geometry size used when we created the plane
            const baseWidth = 2 * IMAGE_ASPECT;
            const baseHeight = 2;

            const scaleX = targetWidth / baseWidth;
            const scaleY = targetHeight / baseHeight;
            scenePlane.scale.set(scaleX, scaleY, 1);
            scenePlane.position.set(rect.x, rect.y, rect.z);
            console.log('[THREE] CRT repositioned & scaled from LayoutManager:', {
                x: rect.x.toFixed(2),
                y: rect.y.toFixed(2),
                width: targetWidth.toFixed(2),
                height: targetHeight.toFixed(2)
            });
        }
    }
    
    function initPostProcessing() {
        const container = document.getElementById('viewport');
        
        // Create EffectComposer
        composer = new THREE.EffectComposer(renderer);
        
        // RenderPass - renders the scene to a buffer
        const renderPass = new THREE.RenderPass(scene, camera);
        composer.addPass(renderPass);
        
        // UnrealBloomPass - proper multi-pass Gaussian bloom
        // Parameters: resolution, strength, radius, threshold
        const bloomConfig = CRTShader.config;
        bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(container.clientWidth, container.clientHeight),
            bloomConfig.unrealBloomStrength,  // strength
            bloomConfig.unrealBloomRadius,    // radius (blur spread)
            bloomConfig.unrealBloomThreshold  // threshold
        );
        composer.addPass(bloomPass);
        
        // Chromatic Aberration Pass - RGB split applied after bloom (outside CRT)
        chromaticPass = new THREE.ShaderPass(ChromaticAberrationShader);
        chromaticPass.uniforms['amount'].value = bloomConfig.chromaticAberration;
        chromaticPass.uniforms['centerBased'].value = bloomConfig.chromaticCenter ? 1.0 : 0.0;
        composer.addPass(chromaticPass);
        
        console.log('[THREE] Post-processing initialized with UnrealBloomPass + ChromaticAberration');
    }
    
    function updateBloomPass() {
        if (!bloomPass) return;
        const config = CRTShader.config;
        
        // Update bloom parameters from config
        bloomPass.strength = config.unrealBloomEnabled ? config.unrealBloomStrength : 0;
        bloomPass.radius = config.unrealBloomRadius;
        bloomPass.threshold = config.unrealBloomThreshold;
    }
    
    function updateChromaticPass() {
        if (!chromaticPass) return;
        const config = CRTShader.config;
        
        // Update chromatic aberration parameters from config
        chromaticPass.uniforms['amount'].value = config.chromaticAberration;
        chromaticPass.uniforms['centerBased'].value = config.chromaticCenter ? 1.0 : 0.0;
    }
    
    function loadSceneImage(url) {
        console.log('[THREE] Loading scene image:', url);
        
        // Load as Image first for shape-matching analysis
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Create texture from image
            const texture = new THREE.Texture(img);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
            
            currentTexture = texture;
            scenePlane.material.uniforms.sceneTexture.value = texture;
            
            // Apply shape-matching analysis for static backgrounds
            if (CRTShader.config.useShapeMatching) {
                CRTShader.applyShapeMatching(scenePlane.material, img);
            }
            
            console.log('[THREE] Scene image loaded with shape-matching');
        };
        img.onerror = (error) => {
            console.error('[THREE] Error loading scene image:', error);
        };
        img.src = url;
    }
    
    function animate() {
        animationId = requestAnimationFrame(animate);
        
        // Update time uniform for animations
        if (scenePlane && scenePlane.material.uniforms) {
            const now = performance.now();
            scenePlane.material.uniforms.time.value = now * 0.001;
            
            // Update uniforms from CRT shader config (for Tweakpane)
            CRTShader.updateUniforms(scenePlane.material);
        }

        // Random automatic glitching
        // Uses a simple time-based scheduler so glitches are occasional and non-spammy.
        if (CRTShader && CRTShader.config) {
            const nowMs = performance.now();

            // Initialize nextAutoGlitchTime on first run
            if (nextAutoGlitchTime === 0) {
                // First glitch sometime in the next 5–15 seconds
                const initialDelay = 5000 + Math.random() * 10000;
                nextAutoGlitchTime = nowMs + initialDelay;
            }

            // Don't trigger light glitches if a dramatic effect is running
            const dramaticEffectActive = typeof GlitchEffects !== 'undefined' && GlitchEffects.isActive();

            if (nowMs >= nextAutoGlitchTime && CRTShader.config.glitchAmount === 0 && !dramaticEffectActive) {
                // Decide whether to trigger a glitch this frame.
                // Small chance overall so we don't fire exactly every window.
                const triggerChance = 0.25; // 25% chance when window opens
                if (Math.random() < triggerChance) {
                    // Heavy glitches are rarer than light ones
                    const heavyChance = 0.2; // 20% heavy, 80% light
                    const isHeavy = Math.random() < heavyChance;

                    // Slightly randomize intensity and duration within ranges
                    let intensity;
                    let duration;
                    if (isHeavy) {
                        intensity = 0.7 + Math.random() * 0.2;      // ~0.7–0.9
                        duration = 450 + Math.random() * 250;       // ~450–700 ms
                    } else {
                        intensity = 0.25 + Math.random() * 0.15;    // ~0.25–0.40
                        duration = 160 + Math.random() * 120;       // ~160–280 ms
                    }

                    triggerGlitch(intensity, duration);

                    // Schedule next possible glitch window 6–18 seconds from now
                    const cooldown = 6000 + Math.random() * 12000;
                    nextAutoGlitchTime = nowMs + cooldown;
                } else {
                    // Didn't fire this time; try again in a short while
                    const retryDelay = 1000 + Math.random() * 2000; // 1–3 seconds
                    nextAutoGlitchTime = nowMs + retryDelay;
                }
            }
        }
        
        // Update dramatic glitch effects (power loss, signal loss, VHS corruption)
        if (typeof GlitchEffects !== 'undefined') {
            GlitchEffects.update(scenePlane ? scenePlane.material : null);
            GlitchEffects.maybeAutoTrigger();
        }

        // If we're in terminal mode, continuously refresh the terminal texture
        if (terminalMode && terminalElementRef) {
            updateTerminalTexture(terminalElementRef);
        }
        
        // Update post-processing passes from config
        updateBloomPass();
        updateChromaticPass();
        
        // Render through EffectComposer (includes UnrealBloomPass + ChromaticAberration)
        if (composer) {
            composer.render();
        } else {
            renderer.render(scene, camera);
        }
    }
    
    function onResize() {
        const container = document.getElementById('viewport');
        updateCameraForContainer(container);
        renderer.setSize(container.clientWidth, container.clientHeight);
        
        // Update resolution uniform
        resolution.set(container.clientWidth, container.clientHeight);
        if (scenePlane && scenePlane.material.uniforms.resolution) {
            scenePlane.material.uniforms.resolution.value = resolution;
        }
        
        // Update composer size
        if (composer) {
            composer.setSize(container.clientWidth, container.clientHeight);
        }
        
        // Update bloom pass resolution
        if (bloomPass) {
            bloomPass.resolution.set(container.clientWidth, container.clientHeight);
        }
    }
    
    // Trigger glitch effect
    function triggerGlitch(intensity, duration) {
        CRTShader.triggerGlitch(intensity, duration);
    }
    
    function getScene() { return scene; }
    function getCamera() { return camera; }
    function getRenderer() { return renderer; }
    function getMaterial() { return scenePlane ? scenePlane.material : null; }
    function getScenePlaneMaterial() { return scenePlane ? scenePlane.material : null; }
    
    /**
     * Initialize terminal canvas for render-to-texture
     * @param {HTMLElement} terminalElement - The phosphor terminal content element
     */
    function initTerminalTexture(terminalElement) {
        // Create an offscreen canvas for terminal rendering
        terminalCanvas = document.createElement('canvas');
        terminalCanvas.width = 1024;
        terminalCanvas.height = 768;
        
        // Create Three.js texture from canvas
        terminalTexture = new THREE.CanvasTexture(terminalCanvas);
        terminalTexture.minFilter = THREE.LinearFilter;
        terminalTexture.magFilter = THREE.LinearFilter;
        
        console.log('[THREE] Terminal texture initialized');
    }
    
    /**
     * Update terminal texture from DOM element
     * Uses html2canvas-style rendering to capture the phosphor terminal
     * Accounts for scroll position to show the visible portion
     */
    function updateTerminalTexture(terminalElement) {
        if (!terminalCanvas || !terminalTexture) return;
        
        const ctx = terminalCanvas.getContext('2d');
        const width = terminalCanvas.width;
        const height = terminalCanvas.height;
        
        // Clear with dark background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);
        
        // Get computed styles from terminal
        const computedStyle = getComputedStyle(terminalElement);
        const phosphorColor = computedStyle.getPropertyValue('--phosphor-primary').trim() || '#ffaa00';
        
        // Render terminal text content
        ctx.font = '16px "Courier New", monospace';
        ctx.fillStyle = phosphorColor;
        ctx.textBaseline = 'top';
        
        // Get all text from the phosphor layers
        const textLayer = terminalElement.querySelector('.phosphor-text-layer');
        if (textLayer) {
            const lines = textLayer.innerText.split('\n');
            const lineHeight = 22;
            const padding = 20;
            
            // Calculate scroll offset - show bottom of content when it overflows
            const totalContentHeight = lines.length * lineHeight + padding * 2;
            const visibleHeight = height;
            
            // If content is taller than canvas, offset to show the bottom (most recent)
            let yOffset = 0;
            if (totalContentHeight > visibleHeight) {
                yOffset = totalContentHeight - visibleHeight;
            }
            
            // Draw lines with scroll offset applied
            lines.forEach((line, i) => {
                const y = padding + i * lineHeight - yOffset;
                // Only draw if line is visible
                if (y > -lineHeight && y < height) {
                    ctx.fillText(line, padding, y);
                }
            });
            
            // Add glow effect (second pass)
            ctx.shadowColor = phosphorColor;
            ctx.shadowBlur = 8;
            lines.forEach((line, i) => {
                const y = padding + i * lineHeight - yOffset;
                if (y > -lineHeight && y < height) {
                    ctx.fillText(line, padding, y);
                }
            });
            ctx.shadowBlur = 0;
        }
        
        // Mark texture as needing update
        terminalTexture.needsUpdate = true;
    }
    
    /**
     * Switch to terminal mode - render terminal through ASCII shader
     */
    function enableTerminalMode(terminalElement) {
        if (terminalMode) return;
        
        // Store current background texture
        backgroundTexture = currentTexture;
        
        // Initialize terminal texture if needed
        if (!terminalTexture) {
            initTerminalTexture(terminalElement);
        }
        
        // Remember which DOM element we're mirroring into the CRT
        terminalElementRef = terminalElement;
        
        // Capture current terminal contents into texture once on enable
        updateTerminalTexture(terminalElement);
        
        // Switch shader input to terminal texture
        if (scenePlane && scenePlane.material.uniforms) {
            scenePlane.material.uniforms.sceneTexture.value = terminalTexture;
        }
        
        // Swap CRT shader config to terminal-mode defaults
        if (CRTShader && CRTShader.config) {
            const cfg = CRTShader.config;
            if (!sceneViewerConfigSnapshot) {
                // Deep clone current scene viewer config once
                sceneViewerConfigSnapshot = JSON.parse(JSON.stringify(cfg));
            }
            Object.assign(cfg, TERMINAL_MODE_CRT_CONFIG);
            cfg.asciiMode = false;
            // Keep post-processing in sync with new config
            updateBloomPass();
            updateChromaticPass();
        }
        
        terminalMode = true;
        console.log('[THREE] Terminal mode enabled');
    }
    
    /**
     * Switch back to scene mode
     */
    function disableTerminalMode() {
        if (!terminalMode) return;
        
        // Restore background texture
        if (scenePlane && scenePlane.material.uniforms && backgroundTexture) {
            scenePlane.material.uniforms.sceneTexture.value = backgroundTexture;
        }
        
        // Stop updating terminal texture
        terminalElementRef = null;
        
        // Restore Scene Viewer CRT config when leaving terminal mode
        if (CRTShader && CRTShader.config) {
            const cfg = CRTShader.config;
            if (sceneViewerConfigSnapshot) {
                Object.assign(cfg, sceneViewerConfigSnapshot);
            }
            cfg.asciiMode = true;
            // Keep post-processing in sync with restored config
            updateBloomPass();
            updateChromaticPass();
        }
        
        terminalMode = false;
        console.log('[THREE] Terminal mode disabled');
    }
    
    /**
     * Toggle terminal mode
     */
    function toggleTerminalMode(terminalElement) {
        if (terminalMode) {
            disableTerminalMode();
        } else {
            enableTerminalMode(terminalElement);
        }
        return terminalMode;
    }
    
    /**
     * Check if in terminal mode
     */
    function isTerminalMode() {
        return terminalMode;
    }
    
    /**
     * Get terminal canvas for external rendering
     */
    function getTerminalCanvas() {
        return terminalCanvas;
    }
    
    /**
     * Get terminal texture
     */
    function getTerminalTexture() {
        return terminalTexture;
    }
    
    return {
        init,
        loadSceneImage,
        triggerGlitch,
        getScene,
        getCamera,
        getRenderer,
        getMaterial,
        getScenePlane: () => scenePlane,
        getScenePlaneMaterial,
        updateScenePlanePosition,
        initTerminalTexture,
        updateTerminalTexture,
        enableTerminalMode,
        disableTerminalMode,
        toggleTerminalMode,
        isTerminalMode,
        getTerminalCanvas,
        getTerminalTexture
    };
})();
