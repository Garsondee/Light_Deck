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
    
    // Image aspect ratio (4:3)
    const IMAGE_ASPECT = 4 / 3;
    
    function init() {
        const canvas = document.getElementById('scene-canvas');
        const container = document.getElementById('viewport');
        
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0a);
        
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
        
        // Load default test image
        loadSceneImage('/assets/scene_backgrounds/test.png');
        
        // Handle resize
        window.addEventListener('resize', onResize);
        
        // Start render loop
        animate();
        
        console.log('[THREE] Scene initialized');
        return { scene, camera, renderer };
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
        // 16:9 plane geometry
        const geometry = new THREE.PlaneGeometry(2 * IMAGE_ASPECT, 2);
        
        // Use ASCII shader material
        const material = ASCIIShader.createMaterial(null, resolution);
        
        scenePlane = new THREE.Mesh(geometry, material);
        scene.add(scenePlane);
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
            if (ASCIIShader.config.useShapeMatching) {
                ASCIIShader.applyShapeMatching(scenePlane.material, img);
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
            scenePlane.material.uniforms.time.value = performance.now() * 0.001;
            
            // Update uniforms from ASCIIShader config (for Tweakpane)
            ASCIIShader.updateUniforms(scenePlane.material);
        }
        
        renderer.render(scene, camera);
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
    }
    
    // Trigger glitch effect
    function triggerGlitch(intensity, duration) {
        ASCIIShader.triggerGlitch(intensity, duration);
    }
    
    function getScene() { return scene; }
    function getCamera() { return camera; }
    function getRenderer() { return renderer; }
    function getMaterial() { return scenePlane ? scenePlane.material : null; }
    
    return {
        init,
        loadSceneImage,
        triggerGlitch,
        getScene,
        getCamera,
        getRenderer,
        getMaterial
    };
})();
