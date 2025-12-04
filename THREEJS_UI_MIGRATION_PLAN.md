# Three.js Full UI Migration Plan

## Problem Statement

### Current Issues
1. **Star-shaped bloom artifacts** — The current `sampleBloomHDR` samples in 8 fixed directions (PI/4 increments), creating visible 8-pointed star patterns instead of smooth circular glow.
2. **Two competing bloom systems** — `bloomIntensity`/`bloomThreshold` (old) and `unrealBloom*` (new) both exist; we only want one.
3. **Bloom inside the shader** — Unreal Bloom is computed inside the same fragment shader as CRT effects, so it inherits barrel distortion, phosphor mask, scanlines, etc. True bloom should sit *outside* the CRT glass.
4. **Mixed rendering domains** — The chat log, dice panel, and other UI are pure HTML/CSS while the CRT viewport is Three.js. This creates visual inconsistency and limits what effects we can apply globally.

### Goal
Move the **entire interface** into Three.js so we have:
- A single unified rendering pipeline
- Effects that can be applied selectively (e.g., CRT curve only on the main display, but phosphor glow on all text)
- True multi-pass post-processing with proper Gaussian bloom *outside* the CRT texture
- Consistent visual style across scene mode and terminal mode

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     THREE.JS SCENE (fullscreen)                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              RENDER TARGET: CRT Content                  │   │
│  │  ┌─────────────────────────────────────────────────────┐│   │
│  │  │  Scene Image / Terminal Canvas                      ││   │
│  │  │  + ASCII shader (when enabled)                      ││   │
│  │  │  + Phosphor mask, scanlines, interlace, noise       ││   │
│  │  │  + Color correction                                 ││   │
│  │  └─────────────────────────────────────────────────────┘│   │
│  │                                                         │   │
│  │  Output: Flat texture (no barrel distortion yet)        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              CRT DISPLAY PLANE (with bezel)              │   │
│  │  - Barrel distortion applied here                        │   │
│  │  - Screen curvature / zoom correction                    │   │
│  │  - Edge darkening / corner rounding                      │   │
│  │  - Reflection / glare layer (optional)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              UI LAYER (Three.js planes)                  │   │
│  │  - Chat log (rendered to canvas texture)                 │   │
│  │  - Dice panel                                            │   │
│  │  - Status indicators                                     │   │
│  │  - All use same phosphor text style                      │   │
│  │  - NO barrel distortion (flat panels beside CRT)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              POST-PROCESSING (EffectComposer)            │   │
│  │  Pass 1: Render scene to buffer                          │   │
│  │  Pass 2: Threshold + Downsample (bright pixels only)     │   │
│  │  Pass 3: Gaussian Blur (horizontal)                      │   │
│  │  Pass 4: Gaussian Blur (vertical)                        │   │
│  │  Pass 5: Upsample + Composite (additive blend)           │   │
│  │  Pass 6: Film grain / vignette (global)                  │   │
│  │  Pass 7: Final output                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Multi-Pass Bloom (Fix Star Artifacts)
**Goal:** Replace in-shader bloom with proper separable Gaussian blur via render targets.

**Tasks:**
1. Add `THREE.EffectComposer` and required passes from three/examples/jsm/postprocessing
2. Create bloom pipeline:
   - `RenderPass` — render scene to buffer
   - `UnrealBloomPass` (or custom) — threshold → downsample → blur → upsample → composite
3. Remove `sampleBloomHDR` and old `bloomIntensity`/`bloomThreshold` from fragment shader
4. Keep CC, phosphor mask, scanlines, etc. in the main shader
5. Bloom now operates on the *final rendered frame*, outside all CRT effects

**Files affected:**
- `three-setup.js` — add EffectComposer, bloom pass
- `ascii-shader.js` — remove bloom functions and uniforms
- `debug-ui.js` — remove old Bloom folder, keep Unreal Bloom controls

**Estimated effort:** 2–3 hours

---

### Phase 2: Separate CRT Distortion from Content
**Goal:** Barrel distortion and zoom applied as a *display* effect, not baked into the content texture.

**Tasks:**
1. Render ASCII/terminal content to an offscreen `WebGLRenderTarget` (flat, no distortion)
2. Create a CRT display plane that samples this render target
3. Apply barrel distortion, edge darkening, screen curvature in the CRT plane's shader
4. This allows bloom to glow *outside* the curved CRT edges

**Files affected:**
- `three-setup.js` — add render target, CRT plane
- `ascii-shader.js` — split into "content shader" and "CRT glass shader"

**Estimated effort:** 3–4 hours

---

### Phase 3: Render UI to Three.js
**Goal:** Move chat log, dice panel, and other UI into Three.js as textured planes.

**Tasks:**
1. Create `UIRenderer` module that:
   - Maintains offscreen canvases for each UI element
   - Renders text using the same phosphor font/glow style
   - Updates Three.js `CanvasTexture` when content changes
2. Position UI planes in 3D space (orthographic, beside/below CRT)
3. UI planes get phosphor glow, film grain, vignette — but NO barrel distortion
4. Remove HTML-based chat log and dice panel from DOM (or hide them)

**Files affected:**
- New: `public/js/ui-renderer.js`
- `three-setup.js` — add UI planes to scene
- `public/index.html` — remove or hide DOM UI elements
- `public/css/main.css` — minimal styles for canvas-only layout

**Estimated effort:** 6–8 hours

---

### Phase 4: Unified Phosphor Text System
**Goal:** Single text rendering system used by terminal, chat, and all UI.

**Tasks:**
1. Create `PhosphorTextRenderer` class:
   - Renders text to canvas with glow, burn-in, decay
   - Configurable color schemes (amber, green, white)
   - Typewriter animation support
   - Cursor/caret rendering
2. Use this for:
   - Terminal content (already similar in `phosphor-text.js`)
   - Chat log messages
   - Dice results
   - Status text
3. All text shares the same visual DNA

**Files affected:**
- Refactor `phosphor-text.js` into reusable class
- `ui-renderer.js` — use PhosphorTextRenderer

**Estimated effort:** 4–5 hours

---

### Phase 5: Polish & Optimization
**Goal:** Performance tuning, visual refinements, edge cases.

**Tasks:**
1. Optimize render target sizes (don't need full res for bloom blur)
2. Add optional CRT bezel/frame as 3D geometry or texture overlay
3. Implement screen reflections / ambient light on CRT glass
4. Add subtle CRT power-on/off animations
5. Ensure responsive layout works with Three.js-only rendering
6. Keyboard/mouse input handling for Three.js UI elements

**Estimated effort:** 4–6 hours

---

## File Structure After Migration

```
public/js/
├── three-setup.js          # Scene, camera, renderer, EffectComposer
├── render-pipeline.js      # NEW: Multi-pass rendering orchestration
├── shaders/
│   ├── content-shader.js   # ASCII + phosphor + CC (no distortion)
│   ├── crt-glass-shader.js # Barrel distortion, edge effects
│   └── bloom-shader.js     # Custom bloom if not using UnrealBloomPass
├── ui-renderer.js          # NEW: Canvas-based UI → Three.js textures
├── phosphor-text.js        # Refactored: Reusable text renderer class
├── debug-ui.js             # Tweakpane (can stay as HTML overlay)
├── audio.js                # Unchanged
└── app.js                  # Simplified init, delegates to Three.js
```

---

## Immediate Next Steps

1. **Quick fix for star bloom:** Before full migration, we can improve the current bloom by:
   - Increasing sample count
   - Using randomized/jittered sample positions
   - Or just disable it until Phase 1 is done

2. **Remove old bloom:** Delete `bloomIntensity`/`bloomThreshold` from config, shader, and UI now to reduce confusion.

3. **Start Phase 1:** Add EffectComposer with UnrealBloomPass — this alone will give smooth, proper bloom.

---

## Dependencies

- `three` (already included)
- `three/examples/jsm/postprocessing/EffectComposer`
- `three/examples/jsm/postprocessing/RenderPass`
- `three/examples/jsm/postprocessing/UnrealBloomPass`
- `three/examples/jsm/postprocessing/ShaderPass` (for custom passes)

These are part of the Three.js examples and can be imported or bundled.

---

## Questions to Resolve

1. **Tweakpane:** Keep as HTML overlay, or render into Three.js too?
   - Recommendation: Keep as HTML — it's a dev tool, not part of the game aesthetic.

2. **Input handling:** How to handle clicks/hovers on Three.js UI elements?
   - Options: Raycasting, or invisible HTML elements positioned over Three.js planes.

3. **Text input:** Chat input field — keep as HTML `<input>` or render custom?
   - Recommendation: Keep as HTML for accessibility/IME support, style to match.

4. **Performance target:** What's the minimum acceptable FPS?
   - Multi-pass bloom is heavier; may need to reduce blur iterations on low-end hardware.

---

## Summary

| Phase | Description | Effort | Priority |
|-------|-------------|--------|----------|
| 1 | Multi-pass bloom (fix star artifacts) | 2–3h | **HIGH** |
| 2 | Separate CRT distortion from content | 3–4h | HIGH |
| 3 | Render UI to Three.js | 6–8h | MEDIUM |
| 4 | Unified phosphor text system | 4–5h | MEDIUM |
| 5 | Polish & optimization | 4–6h | LOW |

**Total estimated effort:** 19–26 hours

This migration gives you complete visual control over every pixel, with effects that can extend beyond the CRT glass (like bloom halos), and a consistent phosphor aesthetic across all UI elements.
