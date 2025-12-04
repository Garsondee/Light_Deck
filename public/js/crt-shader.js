/**
 * CRT Shader
 * Post-processing shader for authentic CRT display effects
 * Includes optional ASCII art mode for the Scene Viewer
 * Used by both Scene Viewer (with ASCII) and Terminal (without ASCII)
 */

const CRTShader = (function() {
    
    // Extended character set organized by visual properties:
    // - Density levels (dark to light)
    // - Edge directions (horizontal, vertical, diagonal)
    // - Shapes (curves, corners, fills)
    // NOTE: Restricted to symbol characters only (no letters/digits) for stronger ASCII "shape" appearance
    const CHAR_SET = '@%#&$[]{}()|/\\<>!?*+~^=;:-_,.\'` ';
    
    // Available character sets for different aesthetics
    const CHAR_SET_OPTIONS = {
        symbols: '@%#&$[]{}()|/\\<>!?*+~^=;:-_,.\'` ',
        classic: '@#$%&*+=-:. ',
        blocks: '█▓▒░ ',
        minimal: '#=-. ',
        extended: '@%#&$[]{}()|/\\<>!?*+~^=;:-_,.\'` 0123456789',
        alphanumeric: 'MWNBHKDOQXZUACVJLTY1234567890#@%&*+=-:. ',
        matrix: '日月火水木金土ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789'
    };
    
    // Current active character set
    let activeCharSet = CHAR_SET;
    
    // Character shape signatures (computed once)
    let charSignatures = null;
    let charSignatureCanvas = null;
    
    // Shader uniforms configuration (exposed for Tweakpane)
    const config = {
        // === FONT SETTINGS (for character atlas) ===
        fontFamily: 'IBM Plex Mono',
        fontWeight: 400,
        charSet: 'extended',     // Key into CHAR_SET_OPTIONS
        customCharSet: '',       // Custom character set (if charSet === 'custom')
        
        // === COLOR CORRECTION (top-level) ===
        // Lift/Gamma/Gain (shadows/mids/highlights)
        liftR: 0.0,              // Shadow color shift R (-1 to 1)
        liftG: 0.0,              // Shadow color shift G
        liftB: -0.01,            // Shadow color shift B
        gammaR: 1.11,            // Midtone color R (0.5 to 2)
        gammaG: 1.17,            // Midtone color G
        gammaB: 1.19,            // Midtone color B
        gainR: 2.0,              // Highlight color R (0 to 2)
        gainG: 1.8,              // Highlight color G
        gainB: 2.0,              // Highlight color B
        
        // Color temperature & tint
        colorTemperature: -0.20, // Warm (+) / Cool (-) shift (-1 to 1)
        colorTint: 0.20,         // Green (-) / Magenta (+) shift (-1 to 1)
        
        // Saturation & Vibrance
        saturation: 2.0,         // Overall saturation (0 to 2)
        vibrance: 0.73,          // Boost low-saturation colors (-1 to 1)
        
        // Exposure & Gamma
        exposure: -0.4,          // EV adjustment (-2 to 2)
        gamma: 1.13,             // Overall gamma (0.5 to 2)
        
        // === UNREAL BLOOM (Post-Processing via Three.js UnrealBloomPass) ===
        unrealBloomEnabled: true,
        unrealBloomStrength: 1.48,   // Overall bloom intensity
        unrealBloomRadius: 1.0,      // Bloom spread/softness (0-1)
        unrealBloomThreshold: 0.56,  // Luminance threshold for bloom
        
        // ASCII cell settings (Scene Viewer only)
        cellWidth: 24.0,         // Width of each ASCII cell in pixels
        cellHeight: 32.0,        // Height of each ASCII cell in pixels
        gapX: 0.0,               // Horizontal gap between cells (0-1, fraction of cell)
        gapY: 0.0,               // Vertical gap between cells (0-1, fraction of cell)
        charCount: 42,           // Number of characters in the set (extended set)
        useShapeMatching: false, // Start in luminance mode by default
        asciiMode: true,         // ASCII art mode (true for Scene Viewer, false for Terminal)
        asciiMinOpacity: 0.35,
        asciiMaxOpacity: 1.0,
        asciiContrastBoost: 4.0,
        asciiBackgroundStrength: 0.3,
        asciiCharBrightness: 1.0,
        
        // Color settings
        tintColor: { r: 0, g: 255, b: 32 },  // Vibrant green
        tintStrength: 0.0,       // 0 = original colors, 1 = full monochrome tint
        brightness: 1.11,
        contrast: 0.95,
        
        // Background bleed (original image showing through)
        backgroundBleed: 0.95,   // 0 = pure ASCII, 1 = full original image
        
        // Bloom
        bloomIntensity: 0.68,    // Glow intensity
        bloomThreshold: 0.23,    // Brightness threshold for bloom
        
        // Effects
        shimmerIntensity: 0.24,  // Character swap randomness
        shimmerSpeed: 0.5,       // How fast shimmer animates
        scanlineIntensity: 0.02,
        scanlineCount: 100.0,
        scanlineSpeed: 2.0,
        noiseIntensity: 0.0,
        vignetteStrength: 0.59,
        
        // Glitch (triggered)
        glitchAmount: 0.0,
        glitchSeed: 0.0,
        
        // === CRT Effects ===
        // Chromatic Aberration
        chromaticAberration: 0.002,  // RGB channel separation at edges
        chromaticCenter: true,       // Aberration increases toward edges
        
        // Barrel Distortion (CRT screen curvature)
        // Scene Viewer defaults tuned via DebugUI
        barrelDistortion: 0.22,      // Screen bulge amount
        barrelZoom: 0.97,            // Zoom compensation to match chosen curvature
        
        // Phosphor Dot Mask
        phosphorMaskType: 1,         // 0=off, 1=RGB triads, 2=aperture grille, 3=slot mask
        phosphorMaskIntensity: 0.41, // Strength of the mask pattern
        phosphorMaskScale: 4.0,      // Size of phosphor elements
        
        // Interlacing
        interlaceEnabled: true,      // Alternate scanline rendering
        interlaceIntensity: 0.25,    // Strength of interlace effect
        
        // H-Sync Wobble
        hSyncWobble: 0.05,           // Horizontal line jitter
        hSyncWobbleSpeed: 0.5,       // Speed of wobble animation
        
        // Electron Beam Simulation
        beamWidth: 0.5,              // Brighter center per character (0 = off)
        
        // Phosphor Persistence (afterimage/ghosting)
        persistenceEnabled: true,    // Enable phosphor decay trails
        persistenceIntensity: 0.86,  // Strength of persistence
        persistenceDecay: 0.85,      // How fast persistence fades
        
        // === Glow & Ambient ===
        glowIntensity: 1.0,          // Overall glow/bloom spread
        glowRadius: 9.5,             // Size of glow blur
        ambientLight: 0.015,         // Base ambient light level
        
        // === Film Grain ===
        filmGrainIntensity: 0.05,    // Strength of large grain noise
        filmGrainSize: 7.8,          // Size of grain particles
        filmGrainSpeed: 12.0         // Animation speed of grain
    };
    
    // Vertex shader - simple passthrough
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    // Fragment shader - ASCII conversion with CRT effects
    const fragmentShader = `
        uniform sampler2D sceneTexture;
        uniform sampler2D charAtlas;
        uniform sampler2D charIndexMap;    // Pre-computed character indices for shape matching
        uniform sampler2D persistenceBuffer; // Previous frame for phosphor persistence
        uniform vec2 resolution;
        uniform vec2 charMapSize;          // Size of the character index map
        uniform float time;
        uniform float useShapeMatching;    // 1.0 = use pre-computed map, 0.0 = luminance-based
        
        // ASCII settings (Scene Viewer only)
        uniform float cellWidth;
        uniform float cellHeight;
        uniform float gapX;
        uniform float gapY;
        uniform float charCount;
        uniform float asciiMode;
        uniform float asciiMinOpacity;
        uniform float asciiMaxOpacity;
        uniform float asciiContrastBoost;
        uniform float asciiBackgroundStrength;
        uniform float asciiCharBrightness;
        
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
        
        // CRT Effects
        // NOTE: Chromatic aberration uniforms removed - now handled in post-processing
        uniform float barrelDistortion;
        uniform float barrelZoom;
        uniform float phosphorMaskType;
        uniform float phosphorMaskIntensity;
        uniform float phosphorMaskScale;
        uniform float interlaceEnabled;
        uniform float interlaceIntensity;
        uniform float hSyncWobble;
        uniform float hSyncWobbleSpeed;
        uniform float beamWidth;
        uniform float persistenceEnabled;
        uniform float persistenceIntensity;
        uniform float persistenceDecay;
        
        // Glow & Ambient
        uniform float glowIntensity;
        uniform float glowRadius;
        uniform float ambientLight;
        
        // Film Grain
        uniform float filmGrainIntensity;
        uniform float filmGrainSize;
        uniform float filmGrainSpeed;
        
        // Color Correction
        uniform vec3 lift;           // Shadow color shift
        uniform vec3 gammaCC;        // Midtone color (named gammaCC to avoid GLSL conflict)
        uniform vec3 gain;           // Highlight color
        uniform float colorTemperature;
        uniform float colorTint;
        uniform float saturation;
        uniform float vibrance;
        uniform float exposureCC;    // Named exposureCC to avoid conflicts
        uniform float gammaVal;      // Overall gamma
        
        // NOTE: Unreal Bloom uniforms removed - bloom is now handled by Three.js UnrealBloomPass
        
        varying vec2 vUv;
        
        // Noise functions
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        // Color correction functions
        vec3 applyLiftGammaGain(vec3 color, vec3 liftVal, vec3 gammaVal, vec3 gainVal) {
            // Lift (shadows)
            color = color + liftVal * (1.0 - color);
            // Gamma (midtones)
            color = pow(max(color, vec3(0.0)), 1.0 / max(gammaVal, vec3(0.001)));
            // Gain (highlights)
            color = color * gainVal;
            return clamp(color, vec3(0.0), vec3(1.0));
        }
        
        vec3 applyTemperatureTint(vec3 color, float temp, float tint) {
            // Temperature: warm (positive) adds orange, cool (negative) adds blue
            color.r += temp * 0.1;
            color.b -= temp * 0.1;
            // Tint: positive adds magenta, negative adds green
            color.g -= tint * 0.1;
            color.r += tint * 0.05;
            color.b += tint * 0.05;
            return clamp(color, vec3(0.0), vec3(1.0));
        }
        
        vec3 applySaturationVibrance(vec3 color, float sat, float vib) {
            float luma = dot(color, vec3(0.299, 0.587, 0.114));
            vec3 grey = vec3(luma);
            
            // Saturation
            color = mix(grey, color, sat);
            
            // Vibrance - boost low saturation colors more
            float maxC = max(color.r, max(color.g, color.b));
            float minC = min(color.r, min(color.g, color.b));
            float colorSat = (maxC - minC) / (maxC + 0.001);
            float vibBoost = (1.0 - colorSat) * vib;
            color = mix(grey, color, 1.0 + vibBoost);
            
            return clamp(color, vec3(0.0), vec3(1.0));
        }
        
        vec3 applyExposureGamma(vec3 color, float exp, float gam) {
            // Exposure (EV stops)
            color = color * pow(2.0, exp);
            // Gamma
            color = pow(max(color, vec3(0.0)), vec3(1.0 / gam));
            return clamp(color, vec3(0.0), vec3(1.0));
        }
        
        // NOTE: Bloom is now handled by Three.js UnrealBloomPass (multi-pass Gaussian)
        // The old in-shader bloom functions have been removed.
        
        // Barrel distortion function
        vec2 barrelDistort(vec2 uv, float amount) {
            if (amount < 0.001) return uv;
            vec2 cc = uv - 0.5;
            float dist = dot(cc, cc);
            return uv + cc * dist * amount;
        }
        
        // Apply barrel distortion with zoom compensation
        vec2 applyBarrel(vec2 uv, float distort, float zoom) {
            vec2 centered = (uv - 0.5) * zoom;
            vec2 distorted = barrelDistort(centered + 0.5, distort);
            return distorted;
        }
        
        // NOTE: Chromatic aberration is now applied in post-processing (after bloom)
        // The chromaticSample function has been removed from the shader.
        
        // Phosphor mask patterns
        vec3 phosphorMask(vec2 fragCoord, float maskType, float intensity, float scale) {
            if (maskType < 0.5 || intensity < 0.001) return vec3(1.0);
            
            vec2 pos = fragCoord / scale;
            vec3 mask = vec3(1.0);
            
            if (maskType < 1.5) {
                // RGB Triads (shadow mask)
                int px = int(mod(pos.x, 3.0));
                if (px == 0) mask = vec3(1.0, 0.0, 0.0);
                else if (px == 1) mask = vec3(0.0, 1.0, 0.0);
                else mask = vec3(0.0, 0.0, 1.0);
                // Offset every other row
                if (mod(pos.y, 2.0) < 1.0) {
                    mask = mask.brg;
                }
            } else if (maskType < 2.5) {
                // Aperture grille (vertical stripes)
                int px = int(mod(pos.x, 3.0));
                if (px == 0) mask = vec3(1.0, 0.2, 0.2);
                else if (px == 1) mask = vec3(0.2, 1.0, 0.2);
                else mask = vec3(0.2, 0.2, 1.0);
            } else {
                // Slot mask
                vec2 slot = mod(pos, vec2(3.0, 2.0));
                if (slot.y < 1.0) {
                    if (slot.x < 1.0) mask = vec3(1.0, 0.0, 0.0);
                    else if (slot.x < 2.0) mask = vec3(0.0, 1.0, 0.0);
                    else mask = vec3(0.0, 0.0, 1.0);
                } else {
                    mask = vec3(0.2);
                }
            }
            
            return mix(vec3(1.0), mask, intensity);
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
            
            // Apply barrel distortion first (CRT screen curvature)
            uv = applyBarrel(uv, barrelDistortion, barrelZoom);
            
            // Check if we're outside the screen after distortion
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                return;
            }
            
            // Apply H-Sync wobble (horizontal line jitter)
            if (hSyncWobble > 0.001) {
                float wobble = sin(uv.y * 100.0 + time * hSyncWobbleSpeed) * hSyncWobble;
                wobble += sin(uv.y * 50.0 + time * hSyncWobbleSpeed * 0.7) * hSyncWobble * 0.5;
                uv.x += wobble * 0.01;
            }
            
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
            // NOTE: Chromatic aberration is now applied in post-processing (after bloom)
            vec2 sampleUv = (cellCoord + 0.5) * cellSize / resolution;
            sampleUv = clamp(sampleUv, 0.0, 1.0);
            vec4 texColor = texture2D(sceneTexture, sampleUv);
            
            // Also sample at exact UV for background bleed
            vec4 exactTexColor = texture2D(sceneTexture, uv);

            // Estimate local contrast around the cell center (for ASCII opacity modulation)
            vec2 texel = 1.0 / resolution;
            float lumaCenter = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
            float lumaL = dot(texture2D(sceneTexture, clamp(sampleUv + vec2(-texel.x, 0.0), 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
            float lumaR = dot(texture2D(sceneTexture, clamp(sampleUv + vec2(texel.x, 0.0), 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
            float lumaU = dot(texture2D(sceneTexture, clamp(sampleUv + vec2(0.0, texel.y), 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
            float lumaD = dot(texture2D(sceneTexture, clamp(sampleUv + vec2(0.0, -texel.y), 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
            float localContrast = (abs(lumaL - lumaCenter) + abs(lumaR - lumaCenter) + abs(lumaU - lumaCenter) + abs(lumaD - lumaCenter)) * 0.5;
            localContrast = clamp(localContrast * asciiContrastBoost, 0.0, 1.0);
            
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
            float charBrightness = charSample.r * asciiCharBrightness;
            
            // Electron beam simulation - brighter center per character
            if (beamWidth > 0.001) {
                vec2 beamCenter = adjustedCellUv - 0.5;
                float beamDist = length(beamCenter);
                float beamFalloff = 1.0 - smoothstep(0.0, 0.5 * beamWidth, beamDist);
                charBrightness *= mix(1.0, 1.0 + beamFalloff * 0.5, beamWidth);
            }
            
            // Zero out character in gap areas
            charBrightness *= (1.0 - inGap);
            
            // Apply color based on mode
            vec3 baseColor = texColor.rgb;
            baseColor = (baseColor - 0.5) * contrast + 0.5;
            baseColor = baseColor * brightness;
            baseColor = clamp(baseColor, vec3(0.0), vec3(1.0));
            
            vec3 tinted = tintColor * luma;
            vec3 cellColor = mix(baseColor, tinted, tintStrength);
            
            vec3 color;
            if (asciiMode > 0.5) {
                // ASCII art mode (Scene Viewer)
                // Use local contrast to modulate how strongly the character appears.
                // Low-contrast areas get softer, more transparent glyphs; high-contrast areas get stronger glyphs.
                float charOpacity = mix(asciiMinOpacity, asciiMaxOpacity, localContrast);
                vec3 asciiColor = cellColor * charBrightness * charOpacity;
                
                // Background bleed - blend original image behind ASCII
                vec3 bgColor = exactTexColor.rgb;
                bgColor = (bgColor - 0.5) * contrast + 0.5;
                bgColor = bgColor * brightness * asciiBackgroundStrength; // Dim the background
                bgColor = clamp(bgColor, vec3(0.0), vec3(1.0));
                
                // Mix ASCII with background based on bleed amount and local contrast
                float bgMix = backgroundBleed * (1.0 - charBrightness * 0.5);
                float asciiMix = charOpacity;
                color = mix(bgColor, asciiColor + bgColor * bgMix, asciiMix);
            } else {
                // Clean mode: no ASCII, just processed texture sampled per-pixel
                // NOTE: Chromatic aberration is now applied in post-processing
                vec3 cleanRGB = texture2D(sceneTexture, uv).rgb;
                color = (cleanRGB - 0.5) * contrast + 0.5;
                color = color * brightness;
                color = clamp(color, vec3(0.0), vec3(1.0));
            }
            
            // Bloom effect - add glow from bright areas (applies to both modes)
            float bloomLuma = dot(exactTexColor.rgb, vec3(0.299, 0.587, 0.114));
            float bloomAmount = smoothstep(bloomThreshold, 1.0, bloomLuma) * bloomIntensity;
            vec3 bloomColor = mix(exactTexColor.rgb, tintColor, tintStrength) * bloomAmount;
            color += bloomColor;
            
            // Apply phosphor mask
            vec3 mask = phosphorMask(gl_FragCoord.xy, phosphorMaskType, phosphorMaskIntensity, phosphorMaskScale);
            color *= mask;
            
            // Interlacing effect
            if (interlaceEnabled > 0.5) {
                float framePhase = mod(floor(time * 60.0), 2.0);
                float scanY = gl_FragCoord.y;
                float interlace = mod(scanY + framePhase, 2.0);
                color *= mix(1.0, 1.0 - interlaceIntensity, step(1.0, interlace));
            }
            
            // Scanlines
            float scanline = sin(uv.y * scanlineCount + time * scanlineSpeed) * 0.5 + 0.5;
            scanline = pow(scanline, 2.0) * scanlineIntensity;
            color -= scanline;
            
            // Noise
            float noise = hash(uv * 500.0 + time * 10.0) * noiseIntensity;
            color += noise - noiseIntensity * 0.5;
            
            // Vignette
            vec2 vignetteUv = vUv * 2.0 - 1.0;
            float vignette = 1.0 - dot(vignetteUv, vignetteUv) * vignetteStrength;
            color *= vignette;
            
            // Glitch color aberration (additional to chromatic)
            if (glitchAmount > 0.1) {
                float aberration = glitchAmount * 0.01;
                color.r = color.r + hash(cellCoord + glitchSeed * 2.0) * aberration;
                color.b = color.b - hash(cellCoord + glitchSeed * 3.0) * aberration;
            }
            
            // Film grain - large organic noise across entire display
            if (filmGrainIntensity > 0.001) {
                vec2 grainUv = gl_FragCoord.xy / filmGrainSize;
                float grainTime = floor(time * filmGrainSpeed);
                float grain = hash(grainUv + grainTime);
                // Make grain more organic with multiple octaves
                grain += hash(grainUv * 2.0 + grainTime * 1.3) * 0.5;
                grain += hash(grainUv * 4.0 + grainTime * 0.7) * 0.25;
                grain = grain / 1.75; // Normalize
                grain = (grain - 0.5) * filmGrainIntensity;
                color += grain;
            }
            
            // Ambient light - base illumination level
            color += ambientLight;
            
            // Additional glow pass - soft bloom spread
            if (glowIntensity > 0.001) {
                float glowLuma = dot(color, vec3(0.299, 0.587, 0.114));
                color += color * glowLuma * glowIntensity;
            }
            
            // === COLOR CORRECTION PASS ===
            // Apply lift/gamma/gain (shadows/mids/highlights)
            color = applyLiftGammaGain(color, lift, gammaCC, gain);
            
            // Apply temperature and tint
            color = applyTemperatureTint(color, colorTemperature, colorTint);
            
            // Apply saturation and vibrance
            color = applySaturationVibrance(color, saturation, vibrance);
            
            // Apply exposure and gamma
            color = applyExposureGamma(color, exposureCC, gammaVal);
            
            // NOTE: Bloom is now applied via Three.js UnrealBloomPass (post-processing)
            // This gives proper multi-pass Gaussian blur that extends outside the CRT
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;
    
    // Create the character atlas texture
    function createCharAtlas(forceRecreate = false) {
        // Determine which character set to use
        if (config.charSet === 'custom' && config.customCharSet) {
            activeCharSet = config.customCharSet;
        } else if (CHAR_SET_OPTIONS[config.charSet]) {
            activeCharSet = CHAR_SET_OPTIONS[config.charSet];
        } else {
            activeCharSet = CHAR_SET;
        }
        
        // Update charCount in config
        config.charCount = activeCharSet.length;
        
        const charWidth = 16;
        const charHeight = 24;
        const atlasWidth = charWidth * activeCharSet.length;
        const atlasHeight = charHeight;
        
        const canvas = document.createElement('canvas');
        canvas.width = atlasWidth;
        canvas.height = atlasHeight;
        const ctx = canvas.getContext('2d');
        
        // Black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, atlasWidth, atlasHeight);
        
        // White characters with configurable font
        ctx.fillStyle = '#ffffff';
        const fontWeight = config.fontWeight || 400;
        const fontFamily = config.fontFamily || 'Courier New';
        ctx.font = `${fontWeight} ${charHeight - 4}px "${fontFamily}", monospace`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        
        for (let i = 0; i < activeCharSet.length; i++) {
            const x = i * charWidth + charWidth / 2;
            ctx.fillText(activeCharSet[i], x, 2);
        }
        
        // Store for signature computation
        charSignatureCanvas = canvas;
        
        // Reset signatures when atlas changes
        if (forceRecreate) {
            charSignatures = null;
        }
        
        // Create Three.js texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        
        console.log('[CRT] Character atlas created with', activeCharSet.length, 'characters using font:', fontFamily);
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
        
        console.log('[CRT] Computed signatures for', charSignatures.length, 'characters');
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
        
        console.log('[CRT] Analyzing image for shape-matching:', image.width, 'x', image.height, 
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
        
        console.log('[CRT] Shape-matching analysis complete');
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
                
                // Cell dimensions / ASCII
                cellWidth: { value: config.cellWidth },
                cellHeight: { value: config.cellHeight },
                gapX: { value: config.gapX },
                gapY: { value: config.gapY },
                charCount: { value: config.charCount },
                asciiMode: { value: config.asciiMode ? 1.0 : 0.0 },
                asciiMinOpacity: { value: config.asciiMinOpacity },
                asciiMaxOpacity: { value: config.asciiMaxOpacity },
                asciiContrastBoost: { value: config.asciiContrastBoost },
                asciiBackgroundStrength: { value: config.asciiBackgroundStrength },
                asciiCharBrightness: { value: config.asciiCharBrightness },
                
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
                glitchSeed: { value: config.glitchSeed },
                
                // CRT Effects
                // NOTE: Chromatic aberration uniforms removed - now handled in post-processing
                barrelDistortion: { value: config.barrelDistortion },
                barrelZoom: { value: config.barrelZoom },
                phosphorMaskType: { value: config.phosphorMaskType },
                phosphorMaskIntensity: { value: config.phosphorMaskIntensity },
                phosphorMaskScale: { value: config.phosphorMaskScale },
                interlaceEnabled: { value: config.interlaceEnabled ? 1.0 : 0.0 },
                interlaceIntensity: { value: config.interlaceIntensity },
                hSyncWobble: { value: config.hSyncWobble },
                hSyncWobbleSpeed: { value: config.hSyncWobbleSpeed },
                beamWidth: { value: config.beamWidth },
                persistenceEnabled: { value: config.persistenceEnabled ? 1.0 : 0.0 },
                persistenceIntensity: { value: config.persistenceIntensity },
                persistenceDecay: { value: config.persistenceDecay },
                persistenceBuffer: { value: null },
                
                // Glow & Ambient
                glowIntensity: { value: config.glowIntensity },
                glowRadius: { value: config.glowRadius },
                ambientLight: { value: config.ambientLight },
                
                // Film Grain
                filmGrainIntensity: { value: config.filmGrainIntensity },
                filmGrainSize: { value: config.filmGrainSize },
                filmGrainSpeed: { value: config.filmGrainSpeed },
                
                // Color Correction
                lift: { value: new THREE.Vector3(config.liftR, config.liftG, config.liftB) },
                gammaCC: { value: new THREE.Vector3(config.gammaR, config.gammaG, config.gammaB) },
                gain: { value: new THREE.Vector3(config.gainR, config.gainG, config.gainB) },
                colorTemperature: { value: config.colorTemperature },
                colorTint: { value: config.colorTint },
                saturation: { value: config.saturation },
                vibrance: { value: config.vibrance },
                exposureCC: { value: config.exposure },
                gammaVal: { value: config.gamma }
                
                // NOTE: Unreal Bloom uniforms removed - bloom is now handled by Three.js UnrealBloomPass
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
        
        console.log('[CRT] Shape matching applied to material');
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
        
        // Shape matching / ASCII mode toggles
        u.useShapeMatching.value = config.useShapeMatching ? 1.0 : 0.0;
        u.asciiMode.value = config.asciiMode ? 1.0 : 0.0;
        u.asciiMinOpacity.value = config.asciiMinOpacity;
        u.asciiMaxOpacity.value = config.asciiMaxOpacity;
        u.asciiContrastBoost.value = config.asciiContrastBoost;
        u.asciiBackgroundStrength.value = config.asciiBackgroundStrength;
        u.asciiCharBrightness.value = config.asciiCharBrightness;
        
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
        
        // CRT Effects
        // NOTE: Chromatic aberration is now handled in post-processing
        u.barrelDistortion.value = config.barrelDistortion;
        u.barrelZoom.value = config.barrelZoom;
        u.phosphorMaskType.value = config.phosphorMaskType;
        u.phosphorMaskIntensity.value = config.phosphorMaskIntensity;
        u.phosphorMaskScale.value = config.phosphorMaskScale;
        u.interlaceEnabled.value = config.interlaceEnabled ? 1.0 : 0.0;
        u.interlaceIntensity.value = config.interlaceIntensity;
        u.hSyncWobble.value = config.hSyncWobble;
        u.hSyncWobbleSpeed.value = config.hSyncWobbleSpeed;
        u.beamWidth.value = config.beamWidth;
        u.persistenceEnabled.value = config.persistenceEnabled ? 1.0 : 0.0;
        u.persistenceIntensity.value = config.persistenceIntensity;
        u.persistenceDecay.value = config.persistenceDecay;
        
        // Glow & Ambient
        u.glowIntensity.value = config.glowIntensity;
        u.glowRadius.value = config.glowRadius;
        u.ambientLight.value = config.ambientLight;
        
        // Film Grain
        u.filmGrainIntensity.value = config.filmGrainIntensity;
        u.filmGrainSize.value = config.filmGrainSize;
        u.filmGrainSpeed.value = config.filmGrainSpeed;
        
        // Color Correction
        u.lift.value.set(config.liftR, config.liftG, config.liftB);
        u.gammaCC.value.set(config.gammaR, config.gammaG, config.gammaB);
        u.gain.value.set(config.gainR, config.gainG, config.gainB);
        u.colorTemperature.value = config.colorTemperature;
        u.colorTint.value = config.colorTint;
        u.saturation.value = config.saturation;
        u.vibrance.value = config.vibrance;
        u.exposureCC.value = config.exposure;
        u.gammaVal.value = config.gamma;
        
        // NOTE: Unreal Bloom uniforms removed - bloom is now handled by Three.js UnrealBloomPass
    }
    
    // Trigger a glitch effect
    function triggerGlitch(intensity = 0.5, duration = 300) {
        config.glitchAmount = intensity;
        config.glitchSeed = Math.random() * 100;
        
        setTimeout(() => {
            config.glitchAmount = 0;
        }, duration);
    }
    
    /**
     * Regenerate the character atlas with current font/charset settings
     * Call this after changing fontFamily, fontWeight, or charSet in config
     * @param {THREE.ShaderMaterial} material - The ASCII shader material to update
     */
    function regenerateAtlas(material) {
        // Reset cached data
        charSignatures = null;
        charSignatureCanvas = null;
        
        // Create new atlas with current settings
        const newAtlas = createCharAtlas(true);
        
        // Update material if provided
        if (material && material.uniforms) {
            material.uniforms.charAtlas.value = newAtlas;
            material.uniforms.charCount.value = config.charCount;
            console.log('[CRT] Character atlas regenerated and applied to material');
        }
        
        return newAtlas;
    }
    
    /**
     * Get available font options for UI
     */
    function getFontOptions() {
        return {
            'Courier New': 'Courier New',
            'Lucida Console': 'Lucida Console',
            'Monaco': 'Monaco',
            'Consolas': 'Consolas',
            'Source Code Pro': 'Source Code Pro',
            'IBM Plex Mono': 'IBM Plex Mono',
            'Fira Mono': 'Fira Mono',
            'JetBrains Mono': 'JetBrains Mono',
            'VT323 (Retro)': 'VT323',
            'Press Start 2P': 'Press Start 2P',
            'Share Tech Mono': 'Share Tech Mono',
            'Roboto Mono': 'Roboto Mono',
            'Ubuntu Mono': 'Ubuntu Mono',
            'Anonymous Pro': 'Anonymous Pro',
            'Inconsolata': 'Inconsolata',
            'Menlo': 'Menlo',
            'DejaVu Sans Mono': 'DejaVu Sans Mono'
        };
    }
    
    /**
     * Get available character set options for UI
     */
    function getCharSetOptions() {
        return {
            'Symbols': 'symbols',
            'Classic ASCII': 'classic',
            'Block Elements': 'blocks',
            'Minimal': 'minimal',
            'Extended': 'extended',
            'Alphanumeric': 'alphanumeric',
            'Matrix (Japanese)': 'matrix',
            'Custom': 'custom'
        };
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
        regenerateAtlas,
        getFontOptions,
        getCharSetOptions,
        CHAR_SET,
        CHAR_SET_OPTIONS
    };
})();
