/**
 * ASCII Shader
 * Converts scene images to ASCII-style rendering using GLSL
 * Supports shape-matching mode for static backgrounds
 */

const ASCIIShader = (function() {
    
    // Extended character set organized by visual properties:
    // - Density levels (dark to light)
    // - Edge directions (horizontal, vertical, diagonal)
    // - Shapes (curves, corners, fills)
    // NOTE: Restricted to symbol characters only (no letters/digits) for stronger ASCII "shape" appearance
    const CHAR_SET = '@%#&$[]{}()|/\\<>!?*+~^=;:-_,.\'` ';
    
    // Character shape signatures (computed once)
    let charSignatures = null;
    let charSignatureCanvas = null;
    
    // Shader uniforms configuration (exposed for Tweakpane)
    const config = {
        // ASCII cell settings
        cellWidth: 10.0,         // Width of each ASCII cell in pixels
        cellHeight: 15.0,        // Height of each ASCII cell in pixels
        gapX: 0.0,               // Horizontal gap between cells (0-1, fraction of cell)
        gapY: 0.0,               // Vertical gap between cells (0-1, fraction of cell)
        charCount: CHAR_SET.length, // Number of characters in the set
        useShapeMatching: false, // Start in luminance mode by default
        
        // Color settings
        tintColor: { r: 0, g: 255, b: 37 },  // Green
        tintStrength: 0.0,       // 0 = original colors, 1 = full monochrome tint
        brightness: 1.96,
        contrast: 1.66,
        
        // Background bleed (original image showing through)
        backgroundBleed: 0.80,   // 0 = pure ASCII, 1 = full original image
        
        // Bloom
        bloomIntensity: 0.76,    // Glow intensity
        bloomThreshold: 0.07,    // Brightness threshold for bloom
        
        // Effects
        shimmerIntensity: 0.19,  // Character swap randomness
        shimmerSpeed: 1.5,       // How fast shimmer animates
        scanlineIntensity: 0.05,
        scanlineCount: 100.0,
        scanlineSpeed: 2.0,
        noiseIntensity: 0.08,
        vignetteStrength: 0.55,
        
        // Glitch (triggered)
        glitchAmount: 0.0,
        glitchSeed: 0.0
    };
    
    // Vertex shader - simple passthrough
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    // Fragment shader - ASCII conversion with effects
    const fragmentShader = `
        uniform sampler2D sceneTexture;
        uniform sampler2D charAtlas;
        uniform sampler2D charIndexMap;    // Pre-computed character indices for shape matching
        uniform vec2 resolution;
        uniform vec2 charMapSize;          // Size of the character index map
        uniform float time;
        uniform float useShapeMatching;    // 1.0 = use pre-computed map, 0.0 = luminance-based
        
        // ASCII settings
        uniform float cellWidth;
        uniform float cellHeight;
        uniform float gapX;
        uniform float gapY;
        uniform float charCount;
        
        // Color settings
        uniform vec3 tintColor;
        uniform float tintStrength;
        uniform float brightness;
        uniform float contrast;
        
        // Background bleed
        uniform float backgroundBleed;
        
        // Bloom
        uniform float bloomIntensity;
        uniform float bloomThreshold;
        
        // Effects
        uniform float shimmerIntensity;
        uniform float shimmerSpeed;
        uniform float scanlineIntensity;
        uniform float scanlineCount;
        uniform float scanlineSpeed;
        uniform float noiseIntensity;
        uniform float vignetteStrength;
        
        // Glitch
        uniform float glitchAmount;
        uniform float glitchSeed;
        
        varying vec2 vUv;
        
        // Noise functions
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        // Glitch displacement
        vec2 glitchOffset(vec2 uv, float amount, float seed) {
            if (amount < 0.01) return uv;
            
            float lineNoise = hash(vec2(floor(uv.y * 50.0), seed));
            float shouldGlitch = step(0.95 - amount * 0.5, lineNoise);
            
            float offset = (hash(vec2(floor(uv.y * 30.0), seed + 1.0)) - 0.5) * amount * 0.2;
            return uv + vec2(offset * shouldGlitch, 0.0);
        }
        
        void main() {
            vec2 uv = vUv;
            
            // Apply glitch displacement
            uv = glitchOffset(uv, glitchAmount, glitchSeed);
            
            // Calculate cell coordinates with separate width/height
            vec2 cellSize = vec2(cellWidth, cellHeight);
            vec2 pixelCoord = uv * resolution;
            vec2 cellCoord = floor(pixelCoord / cellSize);
            vec2 cellUv = fract(pixelCoord / cellSize);
            
            // Apply gaps - if we're in the gap area, show black (or background)
            float inGapX = step(1.0 - gapX, cellUv.x);
            float inGapY = step(1.0 - gapY, cellUv.y);
            float inGap = max(inGapX, inGapY);
            
            // Adjust cellUv to account for gaps (stretch character to fill non-gap area)
            vec2 adjustedCellUv = cellUv / vec2(1.0 - gapX, 1.0 - gapY);
            adjustedCellUv = clamp(adjustedCellUv, 0.0, 1.0);
            
            // Sample the scene texture at cell center
            vec2 sampleUv = (cellCoord + 0.5) * cellSize / resolution;
            sampleUv = clamp(sampleUv, 0.0, 1.0);
            vec4 texColor = texture2D(sceneTexture, sampleUv);
            
            // Also sample at exact UV for background bleed
            vec4 exactTexColor = texture2D(sceneTexture, vUv);
            
            // Calculate luminance
            float luma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
            
            // Apply brightness and contrast to luminance
            luma = (luma - 0.5) * contrast + 0.5;
            luma = luma * brightness;
            luma = clamp(luma, 0.0, 1.0);
            
            // Shimmer: randomly offset character selection
            float shimmerNoise = hash(cellCoord + floor(time * shimmerSpeed));
            float shimmerOff = (shimmerNoise - 0.5) * shimmerIntensity;
            
            // Get character index - either from pre-computed map or luminance
            float charIndex;
            
            if (useShapeMatching > 0.5 && charMapSize.x > 0.0) {
                // Sample from pre-computed character index map
                vec2 mapUv = (cellCoord + 0.5) / charMapSize;
                mapUv = clamp(mapUv, 0.0, 1.0);
                vec4 mapSample = texture2D(charIndexMap, mapUv);
                charIndex = mapSample.r * 255.0;  // R channel contains character index
                
                // Apply shimmer as small offset to nearby characters
                charIndex = charIndex + shimmerOff * 3.0;
                charIndex = clamp(charIndex, 0.0, charCount - 1.0);
            } else {
                // Fallback: luminance-based selection
                // Assume CHAR_SET is ordered darkest (index 0) -> lightest (index charCount-1)
                // so darker pixels (low luma) should pick low indices, bright pixels high indices.
                charIndex = floor(luma * (charCount - 0.01) + shimmerOff * 2.0);
                charIndex = clamp(charIndex, 0.0, charCount - 1.0);
            }
            
            // Glitch: randomly corrupt some characters
            if (glitchAmount > 0.01) {
                float corruptChance = hash(cellCoord + glitchSeed * 100.0);
                if (corruptChance > 1.0 - glitchAmount * 0.3) {
                    charIndex = floor(hash(cellCoord + glitchSeed) * charCount);
                }
            }
            
            // Sample character from atlas
            float atlasX = (charIndex + adjustedCellUv.x) / charCount;
            float atlasY = adjustedCellUv.y;
            vec4 charSample = texture2D(charAtlas, vec2(atlasX, atlasY));
            
            // Get character brightness (white on black atlas)
            float charBrightness = charSample.r;
            
            // Zero out character in gap areas
            charBrightness *= (1.0 - inGap);
            
            // Apply color based on mode
            vec3 baseColor = texColor.rgb;
            baseColor = (baseColor - 0.5) * contrast + 0.5;
            baseColor = baseColor * brightness;
            baseColor = clamp(baseColor, vec3(0.0), vec3(1.0));
            
            vec3 tinted = tintColor * luma;
            vec3 cellColor = mix(baseColor, tinted, tintStrength);
            
            // ASCII color with character mask
            vec3 asciiColor = cellColor * charBrightness;
            
            // Background bleed - blend original image behind ASCII
            vec3 bgColor = exactTexColor.rgb;
            bgColor = (bgColor - 0.5) * contrast + 0.5;
            bgColor = bgColor * brightness * 0.3; // Dim the background
            bgColor = clamp(bgColor, vec3(0.0), vec3(1.0));
            
            // Mix ASCII with background based on bleed amount
            // Where there's no character (charBrightness = 0), show more background
            float bgMix = backgroundBleed * (1.0 - charBrightness * 0.5);
            vec3 color = mix(asciiColor, asciiColor + bgColor, bgMix);
            
            // Bloom effect - add glow from bright areas
            float bloomLuma = dot(exactTexColor.rgb, vec3(0.299, 0.587, 0.114));
            float bloomAmount = smoothstep(bloomThreshold, 1.0, bloomLuma) * bloomIntensity;
            vec3 bloomColor = mix(exactTexColor.rgb, tintColor, tintStrength) * bloomAmount;
            color += bloomColor;
            
            // Scanlines
            float scanline = sin(vUv.y * scanlineCount + time * scanlineSpeed) * 0.5 + 0.5;
            scanline = pow(scanline, 2.0) * scanlineIntensity;
            color -= scanline;
            
            // Noise
            float noise = hash(vUv * 500.0 + time * 10.0) * noiseIntensity;
            color += noise - noiseIntensity * 0.5;
            
            // Vignette
            vec2 vignetteUv = vUv * 2.0 - 1.0;
            float vignette = 1.0 - dot(vignetteUv, vignetteUv) * vignetteStrength;
            color *= vignette;
            
            // Glitch color aberration
            if (glitchAmount > 0.1) {
                float aberration = glitchAmount * 0.01;
                color.r = color.r + hash(cellCoord + glitchSeed * 2.0) * aberration;
                color.b = color.b - hash(cellCoord + glitchSeed * 3.0) * aberration;
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;
    
    // Create the character atlas texture
    function createCharAtlas() {
        const charWidth = 16;
        const charHeight = 24;
        const atlasWidth = charWidth * CHAR_SET.length;
        const atlasHeight = charHeight;
        
        const canvas = document.createElement('canvas');
        canvas.width = atlasWidth;
        canvas.height = atlasHeight;
        const ctx = canvas.getContext('2d');
        
        // Black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, atlasWidth, atlasHeight);
        
        // White characters
        ctx.fillStyle = '#ffffff';
        ctx.font = `${charHeight - 4}px "Courier New", monospace`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        
        for (let i = 0; i < CHAR_SET.length; i++) {
            const x = i * charWidth + charWidth / 2;
            ctx.fillText(CHAR_SET[i], x, 2);
        }
        
        // Store for signature computation
        charSignatureCanvas = canvas;
        
        // Create Three.js texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        
        console.log('[ASCII] Character atlas created with', CHAR_SET.length, 'characters');
        return texture;
    }
    
    /**
     * Compute shape signatures for all characters
     * Each signature contains: density, edge directions, quadrant densities
     */
    function computeCharSignatures() {
        if (charSignatures) return charSignatures;
        if (!charSignatureCanvas) {
            // Create atlas first if needed
            createCharAtlas();
        }
        
        const charWidth = 16;
        const charHeight = 24;
        const ctx = charSignatureCanvas.getContext('2d');
        
        charSignatures = [];
        
        for (let i = 0; i < CHAR_SET.length; i++) {
            const x = i * charWidth;
            const imageData = ctx.getImageData(x, 0, charWidth, charHeight);
            const pixels = imageData.data;
            
            // Compute signature features
            let totalBrightness = 0;
            const quadrants = [0, 0, 0, 0]; // TL, TR, BL, BR
            const rows = new Array(charHeight).fill(0);
            const cols = new Array(charWidth).fill(0);
            
            for (let py = 0; py < charHeight; py++) {
                for (let px = 0; px < charWidth; px++) {
                    const idx = (py * charWidth + px) * 4;
                    const brightness = pixels[idx] / 255;
                    
                    totalBrightness += brightness;
                    rows[py] += brightness;
                    cols[px] += brightness;
                    
                    // Quadrant assignment
                    const qx = px < charWidth / 2 ? 0 : 1;
                    const qy = py < charHeight / 2 ? 0 : 1;
                    quadrants[qy * 2 + qx] += brightness;
                }
            }
            
            const pixelCount = charWidth * charHeight;
            const density = totalBrightness / pixelCount;
            
            // Normalize quadrants
            const quadrantSize = (charWidth / 2) * (charHeight / 2);
            for (let q = 0; q < 4; q++) {
                quadrants[q] /= quadrantSize;
            }
            
            // Compute edge directions using gradient
            let horizontalEdge = 0;
            let verticalEdge = 0;
            let diag1Edge = 0; // top-left to bottom-right
            let diag2Edge = 0; // top-right to bottom-left
            
            // Horizontal edge strength (difference between top and bottom halves)
            const topHalf = quadrants[0] + quadrants[1];
            const bottomHalf = quadrants[2] + quadrants[3];
            horizontalEdge = Math.abs(topHalf - bottomHalf);
            
            // Vertical edge strength (difference between left and right halves)
            const leftHalf = quadrants[0] + quadrants[2];
            const rightHalf = quadrants[1] + quadrants[3];
            verticalEdge = Math.abs(leftHalf - rightHalf);
            
            // Diagonal edges
            diag1Edge = Math.abs(quadrants[0] + quadrants[3] - quadrants[1] - quadrants[2]);
            diag2Edge = Math.abs(quadrants[1] + quadrants[2] - quadrants[0] - quadrants[3]);
            
            // Compute center of mass
            let centerX = 0, centerY = 0;
            if (totalBrightness > 0) {
                for (let py = 0; py < charHeight; py++) {
                    for (let px = 0; px < charWidth; px++) {
                        const idx = (py * charWidth + px) * 4;
                        const brightness = pixels[idx] / 255;
                        centerX += px * brightness;
                        centerY += py * brightness;
                    }
                }
                centerX = (centerX / totalBrightness) / charWidth;
                centerY = (centerY / totalBrightness) / charHeight;
            } else {
                centerX = 0.5;
                centerY = 0.5;
            }
            
            charSignatures.push({
                char: CHAR_SET[i],
                index: i,
                density,
                quadrants,
                horizontalEdge,
                verticalEdge,
                diag1Edge,
                diag2Edge,
                centerX,
                centerY
            });
        }
        
        console.log('[ASCII] Computed signatures for', charSignatures.length, 'characters');
        return charSignatures;
    }
    
    /**
     * Analyze an image and create a character index map
     * Returns a texture where each pixel's R channel contains the best character index
     */
    function analyzeImageForShapeMatching(image, cellWidth, cellHeight) {
        const signatures = computeCharSignatures();
        
        // Create canvas to read image pixels
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        
        // Calculate grid dimensions
        const gridWidth = Math.ceil(image.width / cellWidth);
        const gridHeight = Math.ceil(image.height / cellHeight);
        
        // Create output canvas for character indices
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = gridWidth;
        outputCanvas.height = gridHeight;
        const outputCtx = outputCanvas.getContext('2d');
        const outputData = outputCtx.createImageData(gridWidth, gridHeight);
        
        console.log('[ASCII] Analyzing image:', image.width, 'x', image.height, 
                    '-> grid:', gridWidth, 'x', gridHeight);
        
        // Analyze each cell
        for (let gy = 0; gy < gridHeight; gy++) {
            for (let gx = 0; gx < gridWidth; gx++) {
                // Get cell bounds
                const x = gx * cellWidth;
                const y = gy * cellHeight;
                const w = Math.min(cellWidth, image.width - x);
                const h = Math.min(cellHeight, image.height - y);
                
                // Get cell pixels
                const cellData = ctx.getImageData(x, y, w, h);
                const pixels = cellData.data;
                
                // Compute cell signature
                let totalBrightness = 0;
                const quadrants = [0, 0, 0, 0];
                
                for (let py = 0; py < h; py++) {
                    for (let px = 0; px < w; px++) {
                        const idx = (py * w + px) * 4;
                        const brightness = (pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114) / 255;
                        
                        totalBrightness += brightness;
                        
                        const qx = px < w / 2 ? 0 : 1;
                        const qy = py < h / 2 ? 0 : 1;
                        quadrants[qy * 2 + qx] += brightness;
                    }
                }
                
                const pixelCount = w * h;
                const density = totalBrightness / pixelCount;
                
                // Normalize quadrants
                const quadrantSize = (w / 2) * (h / 2);
                for (let q = 0; q < 4; q++) {
                    quadrants[q] /= quadrantSize;
                }
                
                // Compute edge directions
                const topHalf = quadrants[0] + quadrants[1];
                const bottomHalf = quadrants[2] + quadrants[3];
                const horizontalEdge = Math.abs(topHalf - bottomHalf);
                
                const leftHalf = quadrants[0] + quadrants[2];
                const rightHalf = quadrants[1] + quadrants[3];
                const verticalEdge = Math.abs(leftHalf - rightHalf);
                
                const diag1Edge = Math.abs(quadrants[0] + quadrants[3] - quadrants[1] - quadrants[2]);
                const diag2Edge = Math.abs(quadrants[1] + quadrants[2] - quadrants[0] - quadrants[3]);
                
                // Find best matching character
                // Use two-pass: first find best score, then choose randomly among near-best candidates
                let bestScore = Infinity;
                const scores = new Array(signatures.length);
                
                for (let i = 0; i < signatures.length; i++) {
                    const sig = signatures[i];
                    
                    // Weighted distance calculation
                    // Reduce density weight so dense glyphs (like '@') don't dominate everything
                    const densityDiff = Math.abs(sig.density - density) * 1.0;
                    
                    // Quadrant pattern matching
                    let quadrantDiff = 0;
                    for (let q = 0; q < 4; q++) {
                        quadrantDiff += Math.abs(sig.quadrants[q] - quadrants[q]);
                    }
                    quadrantDiff *= 1.5;
                    
                    // Edge direction matching - emphasize to better match shapes
                    const hEdgeDiff = Math.abs(sig.horizontalEdge - horizontalEdge);
                    const vEdgeDiff = Math.abs(sig.verticalEdge - verticalEdge);
                    const d1EdgeDiff = Math.abs(sig.diag1Edge - diag1Edge);
                    const d2EdgeDiff = Math.abs(sig.diag2Edge - diag2Edge);
                    const edgeDiff = (hEdgeDiff + vEdgeDiff + d1EdgeDiff + d2EdgeDiff) * 4.0;
                    
                    const score = densityDiff + quadrantDiff + edgeDiff;
                    scores[i] = score;
                    if (score < bestScore) {
                        bestScore = score;
                    }
                }

                // Build a small pool of near-best candidates and pick one at random
                const epsilon = bestScore * 0.15 + 0.02; // tolerance for "equally good" matches
                const candidates = [];
                for (let i = 0; i < signatures.length; i++) {
                    if (scores[i] <= bestScore + epsilon) {
                        candidates.push(i);
                    }
                }
                const bestMatch = candidates.length > 0
                    ? candidates[Math.floor(Math.random() * candidates.length)]
                    : 0;

                // Store character index in output
                const outIdx = (gy * gridWidth + gx) * 4;
                outputData.data[outIdx] = bestMatch;     // R = character index
                outputData.data[outIdx + 1] = Math.floor(density * 255); // G = density (for fallback)
                outputData.data[outIdx + 2] = 0;
                outputData.data[outIdx + 3] = 255;
            }
        }
        
        outputCtx.putImageData(outputData, 0, 0);
        
        // Create Three.js texture
        const texture = new THREE.CanvasTexture(outputCanvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        
        console.log('[ASCII] Shape-matching analysis complete');
        return {
            texture,
            gridWidth,
            gridHeight
        };
    }
    
    // Create shader material
    function createMaterial(sceneTexture, resolution) {
        const charAtlas = createCharAtlas();
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                sceneTexture: { value: sceneTexture },
                charAtlas: { value: charAtlas },
                charIndexMap: { value: null },           // Pre-computed character indices
                charMapSize: { value: new THREE.Vector2(0, 0) },
                resolution: { value: resolution },
                time: { value: 0 },
                useShapeMatching: { value: config.useShapeMatching ? 1.0 : 0.0 },
                
                // Cell dimensions
                cellWidth: { value: config.cellWidth },
                cellHeight: { value: config.cellHeight },
                gapX: { value: config.gapX },
                gapY: { value: config.gapY },
                charCount: { value: config.charCount },
                
                // Color
                tintColor: { value: new THREE.Color(
                    config.tintColor.r / 255,
                    config.tintColor.g / 255,
                    config.tintColor.b / 255
                )},
                tintStrength: { value: config.tintStrength },
                brightness: { value: config.brightness },
                contrast: { value: config.contrast },
                
                // Background bleed
                backgroundBleed: { value: config.backgroundBleed },
                
                // Bloom
                bloomIntensity: { value: config.bloomIntensity },
                bloomThreshold: { value: config.bloomThreshold },
                
                // Effects
                shimmerIntensity: { value: config.shimmerIntensity },
                shimmerSpeed: { value: config.shimmerSpeed },
                scanlineIntensity: { value: config.scanlineIntensity },
                scanlineCount: { value: config.scanlineCount },
                scanlineSpeed: { value: config.scanlineSpeed },
                noiseIntensity: { value: config.noiseIntensity },
                vignetteStrength: { value: config.vignetteStrength },
                
                // Glitch
                glitchAmount: { value: config.glitchAmount },
                glitchSeed: { value: config.glitchSeed }
            },
            vertexShader,
            fragmentShader
        });
        
        return material;
    }
    
    /**
     * Apply shape-matching analysis to a material
     * Call this after loading an image to enable shape-matched ASCII
     */
    function applyShapeMatching(material, image) {
        if (!material || !material.uniforms) return;
        
        // Use larger cell size for analysis (matches visual cell size better)
        const analysisWidth = Math.round(config.cellWidth * 2);
        const analysisHeight = Math.round(config.cellHeight * 2);
        
        const result = analyzeImageForShapeMatching(image, analysisWidth, analysisHeight);
        
        material.uniforms.charIndexMap.value = result.texture;
        material.uniforms.charMapSize.value.set(result.gridWidth, result.gridHeight);
        material.uniforms.useShapeMatching.value = 1.0;
        
        console.log('[ASCII] Shape matching applied to material');
    }
    
    // Update uniforms from config
    function updateUniforms(material) {
        if (!material || !material.uniforms) return;
        
        const u = material.uniforms;
        
        // Cell dimensions
        u.cellWidth.value = config.cellWidth;
        u.cellHeight.value = config.cellHeight;
        u.gapX.value = config.gapX;
        u.gapY.value = config.gapY;
        
        // Shape matching toggle
        u.useShapeMatching.value = config.useShapeMatching ? 1.0 : 0.0;
        
        // Color
        u.tintColor.value.setRGB(
            config.tintColor.r / 255,
            config.tintColor.g / 255,
            config.tintColor.b / 255
        );
        u.tintStrength.value = config.tintStrength;
        u.brightness.value = config.brightness;
        u.contrast.value = config.contrast;
        
        // Background bleed
        u.backgroundBleed.value = config.backgroundBleed;
        
        // Bloom
        u.bloomIntensity.value = config.bloomIntensity;
        u.bloomThreshold.value = config.bloomThreshold;
        
        // Effects
        u.shimmerIntensity.value = config.shimmerIntensity;
        u.shimmerSpeed.value = config.shimmerSpeed;
        u.scanlineIntensity.value = config.scanlineIntensity;
        u.scanlineCount.value = config.scanlineCount;
        u.scanlineSpeed.value = config.scanlineSpeed;
        u.noiseIntensity.value = config.noiseIntensity;
        u.vignetteStrength.value = config.vignetteStrength;
        
        // Glitch
        u.glitchAmount.value = config.glitchAmount;
        u.glitchSeed.value = config.glitchSeed;
    }
    
    // Trigger a glitch effect
    function triggerGlitch(intensity = 0.5, duration = 300) {
        config.glitchAmount = intensity;
        config.glitchSeed = Math.random() * 100;
        
        setTimeout(() => {
            config.glitchAmount = 0;
        }, duration);
    }
    
    return {
        config,
        vertexShader,
        fragmentShader,
        createCharAtlas,
        createMaterial,
        updateUniforms,
        triggerGlitch,
        applyShapeMatching,
        analyzeImageForShapeMatching,
        computeCharSignatures,
        CHAR_SET
    };
})();
