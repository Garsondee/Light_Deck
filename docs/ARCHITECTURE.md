# The Optic — Architecture Document
## Diegetic VTT Interface for "A Change of Heart"

---

## 1. Project Overview

**Project Name:** Light Deck  
**Target Users:** 1 GM + X Players (Netrunner/Programmer character)  
**Platform:** Web / Node.js + Three.js + React (GM Overlay)  
**Hosting:** Node.js app on Linux (optionally behind a reverse proxy)  
**Core Concept:** A diegetic "Command Line" + CRT viewer. The player experiences the game world entirely through a simulated cyberdeck display (ASCII/CRT effects, terminal, chat, dice). The GM runs the adventure through a separate, non-diegetic GM Overlay.

High-level principles:

- **Single Visual Pipeline (Player View):** Everything the player sees is rendered through Three.js with post‑processing (CRT, bloom, phosphor glow). No DOM overlays for the player.
- **Asset‑Driven Adventure:** Scenes, terminals, adventure guide, and game content are JSON assets under `assets/`.
- **Real‑Time Sync:** A Socket.io based SyncManager keeps GM and player views synchronized (scenes, chat, dice, presence).
- **Non‑Diegetic GM Tools:** A React GM Overlay (`src/gm-overlay/`) provides structured access to scenes, NPCs, flags, and tools. Players never see this UI.

---

## 1.1 Progress & Roadmap

### ✅ Completed

| Area | Feature |
|------|---------|
| **Player Rendering** | Three.js-only CRT pipeline (no DOM UI for player) |
| **Player Rendering** | Canvas-based terminal (`TerminalManager` + `TextRenderer`) |
| **Player Rendering** | Canvas-based chat & dice (`ChatManager`) |
| **Player Rendering** | CRT shader with ASCII mode toggle, phosphor glow, scanlines |
| **Player Rendering** | Scene transitions (power-down/power-up CRT effect) |
| **Multiplayer** | SyncManager (Socket.io): presence, chat, dice, scene sync |
| **Multiplayer** | Self-test on connect, view-change broadcasts |
| **Server** | Express static serving + REST APIs (characters, scenes, portraits, guides) |
| **Server** | Socket.io message routing, sessions, GM auth |
| **Content** | Scene JSON schema (challenges, triggers, exits, flags) |
| **Content** | Adventure Guide JSON (state_tracking, items, clues) |
| **Content** | Terminal JSON schema (filesystem, documents, programs, events) |
| **GM Overlay v2** | React app with Zustand stores, Tailwind styling |
| **GM Overlay v2** | Scene browsing vs activation (Shift+Enter to push to players) |
| **GM Overlay v2** | Scene Jumper modal (Cmd+J) |
| **GM Overlay v2** | Header, Breadcrumbs, IndexBar, MainPanel/Sidebar layout |
| **GM Overlay v2** | Chat log panel with Socket.io integration |
| **GM Overlay v2** | Player Manager panel (character editing) |
| **GM Overlay v2** | NPC Detail View (loads from `/api/npcs/:id?role=gm`) |
| **GM Overlay v2** | Global Search (Cmd+K) — searches scenes, NPCs, items |
| **GM Overlay v2** | Ad-Hoc Skill Check modal — broadcasts roll to players |
| **Multiplayer** | Session persistence — token-based reconnection with state recovery |
| **Onboarding** | Visual ASCII-form onboarding screens (boot, audio, identity, portrait, background, debt, documents) |
| **Onboarding** | Character JSON export and persistence via Character API |
| **Testing** | Playwright tests for onboarding, terminal, chat, scenes |
| **Testing** | Simulation tests (player archetypes + GM validator) |

### 🚧 In Progress / Partial

| Area | Feature | Status |
|------|---------|--------|
| **Onboarding** | Visual calibration screen | Planned, not yet built |

### 📋 Discussed / Not Yet Implemented

| Area | Feature | Notes |
|------|---------|-------|
| **GM Overlay v2** | Conversation Guide View | Disposition-based dialogue hints (see `GM_OVERLAY_V2_PLAN.md`) |
| **GM Overlay v2** | Karaoke Mode | Teleprompter-style read-aloud scrolling |
| **GM Overlay v2** | Session Scratchpad | Editable notes persisted to localStorage |
| **GM Overlay v2** | Flags Panel | Toggle campaign flags from sidebar |
| **GM Overlay v2** | Undo/Confirmation system | 5-second undo toast for scene activation |
| **GM Overlay v2** | Dashboard / Hub view | Landing page with party status, campaign clock |
| **GM Overlay v2** | Pop-out panels | Multi-monitor support |
| **Player View** | In-world terminal apps | Load terminal JSON, run programs, filesystem navigation |
| **Player View** | Combat system | Initiative, HP, conditions, stress |
| **Player View** | Character sheet display | View/edit character in CRT UI |
| **Multiplayer** | Private messages | GM ↔ Player whispers |
| **Multiplayer** | Spectator mode | View-only access |
| **Audio** | Scene-linked music/ambience | Auto-play on scene change |

---

## 2. High-Level Architecture

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                               LIGHT DECK                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────────┐ │
│  │         PLAYER VIEW             │  │            GM VIEW               │ │
│  │   (Three.js CRT Display)       │  │      (React GM Overlay v2)       │ │
│  │                                 │  │                                  │ │
│  │  - Scene Viewer (ASCII/CRT)    │  │  - Scene index & navigation      │ │
│  │  - Terminal Mode               │  │  - NPC detail & flags            │ │
│  │  - Chat & Dice (canvas text)   │  │  - Session notes & quick tools   │ │
│  │                                 │  │  - Integration with SyncManager  │ │
│  └─────────────────────────────────┘  └──────────────────────────────────┘ │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│                             NODE.JS SERVER                                │
│                                                                            │
│  - Express static serving (`/`, `/assets`, `/music`, `/sounds`, `/public`) │
│  - REST endpoints: characters, scenes, portraits, adventure guides         │
│  - Socket.io server for SyncManager                                       │
│  - JSON assets on disk (scenes, guides, terminals, characters)           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

There are **two primary UIs** sharing the same backend:

- **Player CRT UI (public/index.html + Three.js):**
  - Single canvas with CRT/ASCII shader pipeline.
  - Text (terminal, chat, dice) rendered via `TextRenderer` → CanvasTexture → Three.js planes.
  - Terminal and scene viewer share the same CRT/post‑processing stack.

- **GM Overlay v2 (React, `src/gm-overlay/`):**
  - DOM‑based React app, visually modern and non‑diegetic.
  - Connects to the same Socket.io server as the player.
  - Reads JSON scene/adventure data via HTTP APIs.

---

## 3. User Roles & Access

### 3.1 Player

- Connects to the **Player View** (CRT canvas) in a browser.
- Sees:
  - ASCII/CRT scene viewer.
  - Canvas‑based terminal mode.
  - Canvas‑based chat and dice panel.
- Interacts via:
  - Keyboard (terminal commands, chat commands, dice rolls).
  - Mouse (onboarding UI, clickable elements in some flows).

### 3.2 Game Master (GM)

- Uses the **GM Overlay v2** to run the adventure.
- Sees:
  - Scene index and navigation.
  - NPC, item, and clue details.
  - Flags and state tracking from the Adventure Guide.
  - Integrated chat and presence information via SyncManager.
- Controls:
  - Which scene is active for players.
  - When to trigger checks, reveals, and transitions.
  - Player character records (via character APIs and tooling).

Authentication is currently lightweight (password in `.env` and command‑level gating); the system is designed to run behind a more robust upstream auth layer if needed.

---

## 4. Player Rendering Pipeline (Three.js + CRT)

### 4.1 Overview

The player UI is rendered through a unified Three.js pipeline:

- **RenderManager** orchestrates the main scene, camera, render targets, and post‑processing.
- **TextRenderer** draws text into HTML canvas elements (terminal, chat, dice, onboarding) and exposes them as `THREE.CanvasTexture` objects.
- **TerminalManager** and **ChatManager** manage their respective text buffers and call `TextRenderer`.
- A **CRT/ASCII shader** (multi‑pass) renders:
  - ASCII‑converted background images for the Scene Viewer.
  - Phosphor‑style text for terminal/chat/dice.

### 4.2 Scene Graph (Conceptual)

```text
Scene
├── Camera (orthographic)
├── ScenePlane        # main scene feed (ASCII/CRT)
├── TerminalPlane     # terminal surface (shown in Terminal Mode)
├── ChatPlane         # chat log + dice results
└── UI planes         # onboarding/overlays as needed
```

Render targets and post‑processing:

- `sceneTarget` — base render target (scene + UI planes).
- `CRTShader` — post‑processing pass for scanlines, curvature, glow.
- Bloom/blur passes — phosphor bloom and softening.

The CRT shader can switch between **ASCII mode** and **plain phosphor mode** depending on context (e.g., ASCII for scenes, clearer text for onboarding forms).

### 4.3 Text Rendering

`TextRenderer` abstracts canvas‑based text drawing:

- Draws monospaced text with phosphor glow and configurable colors.
- Supports:
  - Line wrapping and scrolling regions.
  - Cursor/caret drawing for terminal input.
  - Multiple independent canvases (terminal, chat, dice, onboarding).
- Each canvas is uploaded to a `CanvasTexture` and mapped onto a plane in the Three.js scene.

This design ensures **all visible text** passes through the same CRT/post‑processing pipeline as the background imagery.

---

## 5. Terminal System (Player View)

### 5.1 Overview

The terminal is a full‑screen (or dominant‑pane) **canvas‑based text UI** rendered via `TerminalManager` + `TextRenderer` onto `TerminalPlane`.

Key properties:

- Input handled through a single `InputManager` (keyboard), dispatching to `TerminalManager`.
- Text buffer stored in JS; rendering is stateless per frame (buffer → canvas → texture).
- Supports standard terminal behaviors:
  - Printable characters, backspace/delete, cursor movement.
  - Scrollback and paging (up/down, page up/down).
  - Clear screen, history recall.

### 5.2 Commands & Integration

The terminal command set includes (non‑exhaustive):

- **Core:** `help`, `clear`, basic navigation/use commands.
- **Chat:** slash commands like `/roll`, `/onboard` are actually processed by the chat/command layer, not by a shell.
- **Onboarding:** specialized commands during legacy terminal onboarding (now superseded by the visual onboarding system).

Tests interact with the terminal by calling `TerminalManager` methods directly via Playwright, rather than using DOM selectors.

---

## 6. Chat & Dice System (Player View)

### 6.1 Overview

Chat and dice are rendered as **canvas‑based panels** within the Three.js scene via `ChatManager` and `TextRenderer`.

Responsibilities:

- Maintain a scrollable message buffer of:
  - Player chat.
  - System messages.
  - Dice roll results.
  - SyncManager status (join/leave, view changes, self‑test results).
- Render to a dedicated `CanvasTexture` mapped onto `ChatPlane`.

### 6.2 Commands (Chat Input)

Examples (non‑exhaustive):

- `/roll XdY+Z` — roll dice, broadcast to all connected clients.
- `/onboard` / `/create` / `/newchar` — start the onboarding flow.
- `/who`, `/views`, `/gm <password>` — interact with SyncManager and GM role.

Dice expressions and outputs are formatted in a consistent, log‑friendly way for both player and GM.

---

## 7. Onboarding System

### 7.1 Overview

The onboarding system guides new players through:

1. Audio calibration.  
2. Visual calibration.  
3. Character creation (identity, background, attributes, skills).  
4. Debt & equipment.  
5. Document generation (Corporate ID, SIN, Debt Statement, Equipment Manifest).

The current design is **visual and CRT‑native**:

- Onboarding screens render to the **main CRT display** (left side) using ASCII‑style UI built with `TextRenderer` and helper modules such as an ASCII‑form renderer.
- Input can be keyboard‑driven, with mouse support for some elements.

### 7.2 Character Output

On completion, onboarding produces a `PlayerCharacter` JSON structure with:

- Identity (name, handle, pronouns).
- Background and associated skills/starting debt.
- Attributes & skills.
- Gear, debt breakdown, and creditor info.
- Generated documents metadata.

Characters are persisted via the **Character API** (see Server & APIs).

---

## 8. Content & Data Model

All adventure content is defined as JSON assets under `assets/`:

- `assets/scene_backgrounds/*.json` — visual scenes.
- `assets/adventures/*_Guide.json` — adventure guide metadata.
- `assets/terminals/*.json` — in‑world terminals.
- `assets/characters/players/*.json` — created player characters.

### 8.1 Scene JSON (Playable Schema)

Scenes encode both **visual state** and **playable structure**:

- Metadata: adventure, act, chapter, scene, type (`social`, `combat`, etc.).
- Visuals: image filename, ASCII/CRT notes.
- Narrative text (read‑aloud) and GM notes (private).
- NPC list (references to NPCs, scene‑local notes/state).
- **Challenges:** skill checks with DC, success/failure text, flag & clue interactions.
- **Triggers:** GM‑fired events (reveals, beats) that can also set flags.
- **Exits:** conditional links to other scenes, keyed by simple flag expressions.
- Optional music/ambience metadata.

Scene assets drive both:

- The **Player View** (which scene image and metadata to show).
- The **GM Overlay**, which exposes and navigates scene content.

### 8.2 Adventure Guide JSON

Adventure guide files (e.g. `AChangeOfHeart_Guide.json`) provide:

- `state_tracking` — boolean/enum flags representing campaign state.
- `items` — keyed list of important items, with reveal conditions.
- `clues` — key revelations, how they’re unlocked.

These structures are used by:

- The GM Overlay to show canonical state.
- Simulation tooling (GM validator and archetype tests) to evaluate adventure coherence.

### 8.3 Terminals JSON

Terminal definitions describe in‑world computer systems:

- Identity and location (name, adventure, location text).
- Visual style (phosphor colors, scanlines, curvature, bloom).
- Boot sequence text and timing.
- Filesystem structure (directories and files).
- Linked documents and programs.
- Supported commands (`help`, `dir`, `cd`, `cat`, `run`, `exit`, etc.).
- Event hooks (e.g., `on_access` sets a flag).

These JSON files drive the **terminal apps** presented in Terminal Mode on the player view.

### 8.4 Player Characters JSON

Player characters created via onboarding are stored as JSON in `assets/characters/players/` and surfaced to the GM via the GM Overlay.

---

## 9. Multiplayer Sync (SyncManager)

### 9.1 Overview

Real‑time synchronization between GM and player is handled by **Socket.io**.

Core features:

- Presence tracking (who is connected, role, view).
- Chat and dice roll broadcasting.
- Scene activation broadcast (GM → players).
- Basic self‑test on connect to verify round‑trip connectivity.

### 9.2 Message Types (Representative)

Message names follow a `sync:*` convention and are mirrored between client and server:

- `sync:join` / `sync:leave` — users entering/exiting a session.
- `sync:presence` — authoritative presence list per session.
- `sync:view_change` — Scene vs Terminal vs GM overlay view changes.
- `sync:chat` — chat messages.
- `sync:roll` — dice rolls.
- `sync:scene_change` — GM‑pushed scene activation.
- `sync:echo_request` / `sync:echo_response` — connection self‑test.

The server tracks users and sessions in `server/index.js` using in‑memory maps. Each Socket.io room corresponds to a session.

### 9.3 GM Overlay Integration

The React GM Overlay uses a `useSyncManager` hook to bridge to Socket.io:

- Establishes a connection to the main server.
- Joins as `role: 'gm'` with a session ID (`default` by default).
- Listens for `sync:*` events and updates local stores (Zustand stores for chat, players, scenes).
- Emits chat/roll/scene commands initiated from the GM UI.

---

## 10. Server & APIs

### 10.1 Express Setup

`server/index.js` is the entry point:

- Loads environment configuration via `dotenv`.
- Serves static content from:
  - `/public` — player/GM static assets.
  - `/assets` — scenes, portraits, textures.
  - `/music` — music tracks.
  - `/sounds` — SFX.
- Mounts Socket.io on the same HTTP server.

### 10.2 Representative REST Endpoints

(See `server/index.js` for the full list; below is a summary of the main types.)

- **Health & Music**
  - `GET /api/health` — basic health check.
  - `GET /api/music` — enumerates music tracks with cleaned names and URLs.

- **Characters**
  - `GET /api/characters` — list saved player characters (summary info).
  - `GET /api/characters/:id` — load a specific character.
  - `POST /api/characters` — create or upsert a character.
  - `PUT /api/characters/:id` — update existing character.
  - `DELETE /api/characters/:id` — delete character.

- **Portraits**
  - `GET /api/portraits` — list available portrait images, mapped from the filesystem.

- **Scenes & Adventures**
  - `GET /api/scenes` — list scenes from `assets/scene_backgrounds`, with derived `imageUrl`.
  - `GET /api/adventures/:adventureId/guide` — load the Adventure Guide JSON.
  - `GET /api/adventures/:adventureId/scenes` — scenes filtered by adventure.

All game‑critical state (scenes, guides, terminals, characters) is **file‑backed JSON**, which keeps content authoring straightforward and version‑controllable.

---

## 11. GM Overlay v2 (React)

### 11.1 Purpose

The GM Overlay v2 is a **React 18+ app** that provides a structured, mouse‑driven interface for running "A Change of Heart". It focuses on information retrieval and improvisation support, not automation.

Key design goals:

- Predictable layout across scenes.
- Quick navigation (scene jumper, global search).
- Rich NPC and item detail views.
- Integration with SyncManager for real‑time feedback.

### 11.2 Technology Stack

- React 18+
- Tailwind CSS + local styles
- Zustand stores for overlay state (scenes, view stack, session notes, chat)
- Lucide icons and modern UI primitives
- Socket.io client (provided globally, used via `useSyncManager`)

### 11.3 File Structure (Simplified)

Located under `src/gm-overlay/`:

```text
src/gm-overlay/
├── index.tsx              # React entrypoint
├── App.tsx                # App shell
├── store/                 # Zustand stores (scene, view, session, players, chat)
├── hooks/                 # e.g. useSyncManager
├── components/            # Layout panels, views, sidebar, chat
└── ...                    # Styles and utilities
```

### 11.4 Integration with Adventure Data

The overlay consumes JSON data via the server APIs:

- Scene list and details from `/api/scenes` and `/api/adventures/:id/scenes`.
- Guide data from `/api/adventures/:id/guide`.
- Character data and portraits from `/api/characters` and `/api/portraits`.

It tracks **activation state** for scenes:

- Browsing scenes locally in the overlay (no change sent to player).
- Activating a scene, which both:
  - Updates overlay state.
  - Emits a SyncManager scene change to update the player’s CRT view.

---

## 12. Testing & Simulation (Summary)

Playwright tests cover:

- Onboarding phases and resulting character data.
- Terminal input behavior and rendering.
- Chat commands and dice rolls.
- Scene load and SyncManager integration.
- Adventure simulation tests (archetypes + GM validator) that:
  - Load the Adventure Guide and scenes.
  - Generate questions/criticisms from different player archetypes.
  - Classify them via GM validation into actionable vs intended mysteries.

This ensures that changes to content or architecture preserve the **playable adventure** semantics.

---

## 13. Revision History (Architecture Doc)

| Date       | Version | Notes |
|------------|---------|-------|
| 2024-12-03 | 0.1     | Initial architecture draft (DOM + Three.js hybrid, now superseded). |
| 2024-12-04 | 1.0     | Full Three.js UI migration: single animation loop, canvas‑based terminal & chat, unified CRT pipeline. |
| 2024-12-04 | 1.1     | SyncManager added for real‑time multiplayer (chat, dice, presence, scene sync). |
| 2024-12-05 | 2.0     | GM Overlay v2 (React) created under `src/gm-overlay/`, integrating with SyncManager and adventure assets. |
| 2024-12-06 | 2.1     | Onboarding system stabilized with character export and document generation. |
| 2025-12-08 | 3.0     | Architecture document rewritten to remove legacy DOM/hybrid details and reflect the current Three.js‑only player UI + React GM Overlay v2. |
|
This document describes the **current system**. Legacy implementation notes from earlier drafts have been intentionally removed to avoid confusion.


## 6. Three.js Rendering System

### 6.1 Scene Graph Structure

```javascript
// Three.js scene hierarchy
Scene
├── Camera (OrthographicCamera for 2D-style view)
├── AmbientLight
└── ScenePlane (PlaneGeometry)
    └── ASCIIMaterial (ShaderMaterial)
        ├── uniforms.sceneTexture    // The source image
        ├── uniforms.charAtlas       // ASCII character spritesheet
        ├── uniforms.time            // For shimmer animation
        ├── uniforms.shimmerIntensity
        ├── uniforms.glitchAmount
        └── uniforms.colorPalette    // vec3 for amber/green/white
```

### 6.2 ASCII Shader Approach

**Vertex Shader:** Pass-through (standard plane positioning)

**Fragment Shader:**
1. Sample source image at current UV
2. Calculate luminance from RGB
3. Map luminance to character index (0-9 for 10-char set)
4. Sample character from atlas texture
5. Apply color tint based on palette
6. Add shimmer: offset character index by noise function over time
7. Add glitch: horizontal UV displacement, character corruption

```glsl
// Pseudocode for ASCII fragment shader
uniform sampler2D sceneTexture;
uniform sampler2D charAtlas;
uniform float time;
uniform float shimmerIntensity;
uniform float glitchAmount;
uniform vec3 tintColor;

void main() {
    vec2 uv = applyGlitch(vUv, glitchAmount, time);
    vec4 pixel = texture2D(sceneTexture, uv);
    float luma = dot(pixel.rgb, vec3(0.299, 0.587, 0.114));
    
    int charIndex = int(luma * 9.0);
    charIndex += shimmerOffset(uv, time, shimmerIntensity);
    
    vec4 charSample = sampleCharAtlas(charAtlas, charIndex, uv);
    gl_FragColor = vec4(charSample.rgb * tintColor, 1.0);
}
```

### 6.3 Character Atlas

A texture containing all ASCII characters in a grid:
```
@ % # * + = - : . [space]
```
- **Resolution:** 10 characters × 1 row (or 16×16 grid for extended set)
- **Font:** Monospace, high contrast, clean edges
- **Format:** PNG with transparency or SDF (signed distance field) for crisp scaling

### 6.4 Effect Uniforms

| Uniform | Type | Range | Purpose |
|---------|------|-------|--------|
| `time` | float | 0→∞ | Animation driver |
| `shimmerIntensity` | float | 0.0–1.0 | Character swap frequency |
| `glitchAmount` | float | 0.0–1.0 | Distortion strength |
| `glitchSeed` | float | random | Variation per trigger |
| `scanlineAlpha` | float | 0.0–0.5 | CRT scanline overlay |
| `vignetteStrength` | float | 0.0–1.0 | Edge darkening |

---

## 7. Audio System

### 7.1 Overview

Retro-styled audio with two layers:
1. **MIDI Music:** Background tracks with authentic chiptune/synth feel
2. **Procedural SFX:** Digitally generated ambience and sound effects

### 7.2 MIDI Playback

**Library:** [Tone.js](https://tonejs.github.io/) or [MIDI.js](https://galactic.ink/midi-js/)

**Approach:**
- Load `.mid` files for background music
- Use Web Audio API synthesizers for playback (no sample libraries needed)
- Retro synth patches: square waves, sawtooth, simple FM

```javascript
// MIDI playback structure
const MIDIPlayer = {
    currentTrack: null,
    synth: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "square" },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.5 }
    }),
    
    async loadTrack(midiUrl) { /* ... */ },
    play() { /* ... */ },
    stop() { /* ... */ },
    setVolume(level) { /* ... */ }
};
```

**Track List (Planned):**
| Track ID | Name | Mood | Scene Use |
|----------|------|------|----------|
| `ambient_safe` | Low Hum | Calm, stable | Safehouse |
| `tension_build` | Rising Pulse | Anxiety | The Gate |
| `digital_maze` | Arpeggio Loop | Technical | Admin Network |
| `heartbeat_slow` | Minimal Pulse | Somber | Cryo-Chamber |
| `flatline_drone` | Single Tone | Dread | Flatline |

### 7.3 Procedural Sound Effects (Web Audio API)

Generate retro digital sounds programmatically—no audio files needed.

**SFX Types:**

| Effect | Generation Method | Trigger |
|--------|-------------------|--------|
| **Keystroke** | Short noise burst + filter sweep | Terminal typing |
| **Beep** | Sine wave, quick envelope | Command accepted |
| **Error Buzz** | Square wave, low freq, harsh | Invalid command |
| **Decrypt Tick** | Rapid clicks, increasing tempo | Decrypt progress |
| **Glitch Crackle** | Noise + bitcrusher + random cuts | Glitch effect |
| **Scene Transition** | Filtered sweep + reverb tail | Scene change |
| **Roll Clatter** | Multiple short impacts | Dice roll |

**Implementation:**
```javascript
const SFX = {
    ctx: new AudioContext(),
    
    keystroke() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.type = 'square';
        osc.frequency.value = 800 + Math.random() * 400;
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
        
        osc.connect(filter).connect(gain).connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    },
    
    glitchCrackle(duration = 0.3) { /* noise + bitcrusher */ },
    beep(freq = 880) { /* simple sine */ },
    errorBuzz() { /* harsh square */ }
};
```

### 7.4 Scene Ambience

Each scene can have a looping ambient layer:

```javascript
// Scene audio config
{
    id: "admin_network",
    audio: {
        music: "digital_maze",       // MIDI track ID
        ambience: {
            type: "procedural",
            generator: "dataStream",  // Soft random beeps/clicks
            volume: 0.2
        }
    }
}
```

**Procedural Ambience Generators:**
- `dataStream` — Random soft clicks and hums (network activity)
- `machineRoom` — Low drone + occasional mechanical sounds
- `heartbeat` — Rhythmic pulse, adjustable BPM
- `static` — Filtered white noise, radio interference feel

### 7.5 Audio State

```javascript
const AudioState = {
    musicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.5,
    sfxVolume: 0.7,
    currentMusic: null,
    currentAmbience: null
};
```

---

## 8. Data Model

### 5.1 Scene Object
```javascript
{
  id: "safehouse_01",
  name: "The Safehouse",
  imageUrl: "/assets/scenes/safehouse.png",
  description: "A messy desk, a gun, a pile of hard drives.",
  vibe: "stable", // stable | tense | danger
  asciiConfig: {
    characterSet: ["@", "%", "#", "*", "+", "=", "-", ":", ".", " "],
    shimmerIntensity: 0.3,
    colorPalette: "amber" // amber | green | white
  },
  terminalEnabled: true,
  files: ["budget_allocation.csv", "readme.txt"]
}
```

### 5.2 File Object
```javascript
{
  id: "subject_manifest",
  filename: "subject_manifest.txt",
  encrypted: true,
  visible: true,
  content: "Subject 88: Terminated.\nSubject 89 [J.V.]: FAILED...",
  decryptDifficulty: "medium", // easy | medium | hard
  onDecrypt: null // optional callback or event trigger
}
```

### 5.3 Roll Object
```javascript
{
  timestamp: "2024-12-03T18:05:00Z",
  dice: [{ type: "d6", count: 2 }],
  modifier: 3,
  results: [4, 6],
  total: 13,
  roller: "player" // player | gm
}
```

---

## 9. State Management

The system should track **a single authoritative game state**. The server owns the truth; the client is primarily a "smart terminal" rendering whatever the GM and server decide.

- The **server** holds the canonical state for scenes, files, and any game-relevant flags.
- The **client** tracks only transient UI state (connection status, open panels, dice queue, etc.).
- Game-affecting changes (HP, conditions, discoveries) should flow **from GM → server → client**, not be patched locally.

### 9.1 Client State

```javascript
const AppState = {
  mode: "player", // player | gm
  connected: false,
  currentScene: "safehouse_01",
  terminalOpen: false,
  terminalHistory: [],
  chatLog: [],
  unlockedFiles: [],
  decryptedFiles: [],
  diceQueue: [],
  audio: {
    musicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.5,
    sfxVolume: 0.7
  }
};
```

### 9.2 Server State (Authoritative)

```javascript
// Single authoritative game state (server-owned)
const GameState = {
  scenes: [ /* Scene objects */ ],
  files: [ /* File objects */ ],
  currentScene: "safehouse_01",
  chatLog: [ /* Recent messages */ ],
  unlockedFiles: [],
  decryptedFiles: []
};
```

**Authoritative Model:**
- The server is the **only** source of truth for game data.
- The client **never** directly mutates game stats like HP or conditions.
- Instead, the client (or GM UI) sends an intent (e.g., `request_damage`, `request_unlock_file`), the server updates `GameState`, and then broadcasts the new state to all connected clients via WebSocket.

This avoids "split-brain" drift between `AppState` and `GameState` and keeps the player view as a faithful reflection of the GM-controlled state.

**Persistence (Lightweight):** A simple JSON snapshot or in-memory structure is sufficient; there is no complex multi-slot save/load system in scope right now.

### 9.3 Potential Pitfalls

**Split-Brain State Sync**
- **Risk:** Both client (`AppState`) and server (`GameState`) try to own game data.
- **Pitfall:** Player or GM UIs apply local changes (e.g., damage, healing) that the server never sees, causing state drift.
- **Fix:** Adopt the server-authoritative flow described above. The client is effectively a **dumb screen + input device** for game mechanics; only the server mutates the game state.

**Audio Policy Blocking**
- **Risk:** Browsers (especially Chrome) block new `AudioContext` instances and playback until the user interacts with the page.
- **Pitfall:** The GM triggers a dramatic "Wake Up" alarm, but the player hears nothing because they haven't clicked the window yet.
- **Fix:** Require an explicit **System Boot / Connect** interaction before entering the main interface:
  - Initial screen: logo + short boot text + a `CONNECT` button.
  - On click: initialize `AudioContext`, preload any necessary sounds, then transition into the main UI.
  - All subsequent audio-triggering actions assume this handshake has occurred.

---

## 10. Visual Scenes (Asset List)

| Scene ID | Name | Description | Vibe |
|----------|------|-------------|------|
| `safehouse` | The Safehouse | Messy desk, gun, hard drives | Stable, dim |
| `the_gate` | The Gate | Hazers in trench coats, backlit by fire | Scary, tense |
| `admin_network` | The Admin Network | Abstract network topology map | Technical, cold |
| `cryo_chamber` | The Cryo-Chamber | Elena in suspension, wires attached | Clean, pure |
| `cryo_flatline` | The Flatline | Same as above, flatlined vitals | Dread, finality |

---

## 11. Terminal Content (Narrative Files)

### File: `budget_allocation.csv`
- **Clue:** Massive spending on "Organic Disposal" dated 15 years ago
- **Deduction:** Dates match the "Gas Leak" cover story

### File: `subject_manifest.txt` (Encrypted)
- **Content:** Subject list including J.V. marked "RELEASED TO POPULATION"
- **Deduction:** Jaxson V. was released, not escaped

### File: `sys_admin_chat_logs.log`
- **Content:** Admins discussing vent codes traded by "some local kid"
- **Deduction:** Smoking gun for Jax's unwitting betrayal

### File: `project_heirloom_memo.txt`
- **Content:** Medical data on "Cardiac Hypertrophy" and "30-Year Expiration Cycle"

---

## 12. Technical Implementation Plan

### Phase 0: Infrastructure
1. [x] Set up Node.js + Express server
2. [ ] Configure Nginx reverse proxy
3. [ ] Set up PM2 process manager
4. [x] Basic WebSocket connection (Socket.io)
5. [ ] GM authentication endpoint

### Phase 1: Foundation
6. [x] Project scaffolding (HTML/CSS/JS structure)
7. [x] Three.js scene setup (camera, renderer, plane)
8. [x] Main layout: viewing area + chat panel
9. [x] Basic dice roller with output to chat log
10. [ ] GM access button with password prompt

### Phase 2: Visual Feed (Three.js)
11. [ ] ASCII character atlas texture
12. [x] Basic ASCII shader (luminance → character)
13. [x] Shimmer effect (time-based character swap)
14. [x] Glitch effect (UV displacement, corruption)
15. [ ] Scene switching with transition animation
16. [x] Color palette uniforms (amber/green/white)

### Phase 3: Terminal System
17. [x] Terminal overlay UI (DOM-based)
18. [x] Command parser (help, ls, cat, clear, exit)
19. [x] File system simulation
20. [ ] Decrypt mechanic (progress bar or mini-puzzle)

### Phase 4: Audio System
21. [x] Web Audio API setup
22. [x] Procedural SFX functions (keystroke, beep, glitch)
23. [ ] MIDI player integration (Tone.js)
24. [ ] Scene ambience generators
25. [ ] Audio controls in UI

### Phase 5: GM Tools
26. [ ] GM control panel UI
27. [ ] Scene editor (create, image upload, settings)
28. [ ] File editor (create, edit content, encryption)
29. [x] Live trigger controls (glitch, message, scene change)
30. [x] Audio controls in UI
(play/stop tracks)

### Phase 6: Polish & Sync
31. [x] WebSocket state synchronization
32. [ ] `toggle_filter` reveal command
33. [ ] Export/import game state
34. [ ] Playtesting and iteration

---

## 13. File Structure (Proposed)

```
Light_Deck/
├── server/
│   ├── index.js              # Express + Socket.io entry
│   ├── routes/
│   │   ├── api.js            # REST API routes
│   │   └── auth.js           # GM authentication
│   └── socket-handlers.js    # WebSocket event handlers
├── public/
│   ├── index.html
│   ├── css/
│   │   ├── main.css
│   │   ├── terminal.css
│   │   └── gm-panel.css
│   ├── js/
│   │   ├── app.js            # Main entry, state management
│   │   ├── three-setup.js    # Three.js scene, camera, renderer
│   │   ├── ascii-shader.js   # GLSL shader code + material
│   │   ├── effects.js        # Shimmer, glitch controls
│   │   ├── terminal.js       # CLI logic, command parser
│   │   ├── dice.js           # Dice roller logic
│   │   ├── chat.js           # Chat log management
│   │   ├── audio.js          # MIDI player + procedural SFX
│   │   ├── gm-controls.js    # GM panel logic
│   │   ├── socket-client.js  # WebSocket client
│   │   └── scenes.js         # Scene data and transitions
│   └── assets/
│       ├── scenes/           # Source images for ASCII conversion
│       ├── fonts/            # Monospace font files
│       ├── midi/             # MIDI music files
│       └── textures/
│           └── char-atlas.png # ASCII character spritesheet
├── data/
│   ├── game-state.json       # Persisted game state
│   └── default-content.json  # Default scenes and files
├── package.json
├── .env                      # GM_PASSWORD, PORT, etc.
├── ARCHITECTURE.md           # This document
└── README.md
```

---

## 14. Open Questions

1. ~~**Sync:** Should GM and Player views sync in real-time (WebSocket) or is manual refresh acceptable?~~ → **Resolved: WebSocket sync**
2. **Mobile:** Any mobile/tablet support needed?
3. ~~**Audio:** Include ambient sound / SFX?~~ → **Resolved: Yes, MIDI + procedural SFX**
4. **Save States (Low Priority):** Multiple "save slots" are **not** a core requirement; a single, simple game state for a given session is sufficient for now.
5. **Decrypt Mini-Game:** What form should this take? (Typing challenge, pattern match, simple timer?)
6. **MIDI Source:** Create original tracks or use royalty-free retro MIDI?
7. **Domain/SSL:** What domain will this be served from? (Needed for Nginx config)

---

## 15. Manager System Architecture

The application will **eventually** benefit from a robust system of managers to coordinate between different subsystems. This section describes a *long-term* architecture for when character sheets, combat, and richer GM tools come online.

For the current scope, the priority is:
- A **single, simple authoritative game state** on the server.
- A **GM-centric control surface** that makes it fast to trigger rolls, apply damage, and reveal content.
- Minimal glue between modules (direct calls are acceptable) as long as responsibilities are clear.

### 15.1 Core Manager Philosophy

**Principles:**
- **Single Responsibility:** Each manager owns one domain
- **Event-Driven Communication:** Managers communicate via events, not direct calls
- **State Ownership:** Each manager owns and exposes its state
- **Initialization Order:** Managers initialize in dependency order
- **Hot-Swappable:** Managers can be disabled/enabled without breaking others

### 15.2 Manager Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION CORE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │   AppManager    │  ← Master orchestrator, lifecycle management          │
│   └────────┬────────┘                                                       │
│            │                                                                │
│   ┌────────┴────────────────────────────────────────────────────────┐       │
│   │                                                                 │       │
│   ▼                                                                 ▼       │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │  DisplayManager │  │  InputManager   │  │      StateManager           │   │
│ │                 │  │                 │  │  (Central State Store)      │   │
│ └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘   │
│          │                    │                          │                  │
│   ┌──────┴──────┐      ┌──────┴──────┐           ┌───────┴───────┐          │
│   ▼             ▼      ▼             ▼           ▼               ▼          │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐ │
│ │ Scene   │ │Terminal │ │ Chat    │ │Terminal │ │Character│ │  Session    │ │
│ │ Viewer  │ │ Display │ │ Input   │ │ Input   │ │  State  │ │   State     │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────────┘ │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           DOMAIN MANAGERS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│ │ CharacterManager│  │  CombatManager  │  │  SceneManager   │               │
│ │                 │  │                 │  │                 │               │
│ │ - PC stats      │  │ - Initiative    │  │ - Scene data    │               │
│ │ - NPC stats     │  │ - Attack rolls  │  │ - Transitions   │               │
│ │ - Inventory     │  │ - Damage calc   │  │ - File system   │               │
│ │ - Resources     │  │ - Status effects│  │ - Discoveries   │               │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘               │
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│ │   DiceManager   │  │  AudioManager   │  │ AnimationManager│               │
│ │                 │  │                 │  │                 │               │
│ │ - Roll parsing  │  │ - Music tracks  │  │ - Caret blink   │               │
│ │ - Modifiers     │  │ - SFX triggers  │  │ - Text typing   │               │
│ │ - History       │  │ - Ambience      │  │ - Glitch FX     │               │
│ │ - Skill checks  │  │ - Volume ctrl   │  │ - Transitions   │               │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           GM-SPECIFIC MANAGERS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│ │   GMManager     │  │ KaraokeManager  │  │ EncounterManager│               │
│ │                 │  │                 │  │                 │               │
│ │ - Auth state    │  │ - Script queue  │  │ - Skill checks  │               │
│ │ - Control panel │  │ - Pacing ctrl   │  │ - Attack buttons│               │
│ │ - Player view   │  │ - Read-aloud    │  │ - Reveal triggers│              │
│ │ - Reveal ctrl   │  │ - Timing marks  │  │ - Outcome logic │               │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 15.3 Manager Definitions

#### AppManager (Orchestrator)
```javascript
// Responsibilities:
// - Initialize all managers in correct order
// - Provide global event bus
// - Handle application lifecycle (init, pause, resume, destroy)
// - Error boundary for manager failures

const AppManager = {
    managers: Map<string, Manager>,
    eventBus: EventEmitter,
    
    init(),
    getManager(name),
    broadcast(event, data),
    shutdown()
};
```

#### DisplayManager
```javascript
// Responsibilities:
// - Coordinate between Scene Viewer and Terminal Display
// - Handle mode switching (Scene Viewer ↔ Terminal)
// - Manage CRT shader state
// - Route render updates to correct display

const DisplayManager = {
    Mode: { SCENE_VIEWER, TERMINAL },
    currentMode: Mode,
    
    // Sub-managers
    sceneViewer: SceneViewerManager,
    terminalDisplay: TerminalDisplayManager,
    
    setMode(mode),
    getActiveDisplay(),
    triggerEffect(type, params)
};
```

#### AnimationManager
```javascript
// Responsibilities:
// - Central animation loop (single requestAnimationFrame)
// - Register/unregister animation callbacks
// - Handle caret blinking, text typing, glitch effects
// - Coordinate timing across all animated elements

const AnimationManager = {
    animations: Map<id, AnimationCallback>,
    running: boolean,
    lastTime: number,
    
    start(),
    stop(),
    register(id, callback, options),
    unregister(id),
    
    // Built-in animations
    caretBlink: { phase, rate, element },
    typewriter: { queue, speed, variance }
};
```

#### InputManager (Existing - Enhanced)
```javascript
// Responsibilities:
// - Route keyboard input based on current mode
// - Manage focus between chat input and terminal input
// - Handle global hotkeys
// - Prevent input conflicts

const InputManager = {
    Mode: { SCENE_VIEWER, TERMINAL },
    currentMode: Mode,
    
    setMode(mode),
    focusCurrentInput(),
    onModeChange(callback)
};
```

#### CharacterManager
```javascript
// Responsibilities:
// - Store PC and NPC stat blocks
// - Track HP, resources, conditions
// - Manage inventory
// - Calculate derived stats
// - Emit events on stat changes

const CharacterManager = {
    pc: CharacterSheet,
    npcs: Map<id, CharacterSheet>,
    
    getPC(),
    getNPC(id),
    modifyStat(target, stat, delta),
    addCondition(target, condition),
    removeCondition(target, condition),
    
    // Events emitted:
    // 'hp:changed', 'resource:changed', 'condition:added', 'condition:removed'
};
```

#### CombatManager
```javascript
// Responsibilities:
// - Track initiative order
// - Process attacks (roll + modifiers vs defense)
// - Calculate damage
// - Manage combat state (in combat, round number, current turn)
//
// Note: This is a **long-term** design for when/if we want deeper rules integration.
// For the MVP build, combat math happens in the GM's head; the UI only displays
// the result via a simple GenericPayloadSystem (see below).

const CombatManager = {
    inCombat: boolean,
    initiative: Array<{id, roll, modifier}>,
    currentTurn: number,
    round: number,
    
    startCombat(),
    endCombat(),
    rollInitiative(combatants),
    nextTurn(),
    
    attack(attacker, target, options),
    applyDamage(target, amount, type),
    
    // Events emitted:
    // 'combat:start', 'combat:end', 'turn:change', 'attack:result', 'damage:applied'
};
```

#### GMManager
```javascript
// Responsibilities:
// - GM authentication state
// - Control panel visibility
// - Player view monitoring
// - Reveal/hide information
// - Trigger scene actions

const GMManager = {
    authenticated: boolean,
    controlPanelVisible: boolean,
    
    authenticate(password),
    logout(),
    
    // Reveal controls
    revealFile(fileId),
    hideFile(fileId),
    revealSceneElement(elementId),
    
    // Action triggers
    triggerSkillCheck(skill, dc, description),
    triggerAttack(attacker, target),
    sendNarration(text, options),
    
    // Events emitted:
    // 'gm:authenticated', 'reveal:file', 'skillcheck:triggered', 'attack:triggered'
};
```

#### KaraokeManager
```javascript
// Responsibilities:
// - Queue narrative text for GM read-aloud
// - Display text with pacing markers
// - Track reading progress
// - Sync with player display (reveal as GM reads)

const KaraokeManager = {
    script: Array<ScriptLine>,
    currentLine: number,
    autoAdvance: boolean,
    
    loadScript(lines),
    nextLine(),
    previousLine(),
    jumpToLine(index),
    
    // Display modes
    setDisplayMode(mode), // 'gm_only', 'sync_reveal', 'full_reveal'
    
    // Events emitted:
    // 'line:changed', 'script:complete', 'reveal:sync'
};
```

#### EncounterManager
```javascript
// Responsibilities:
// - Define encounter actions (skill checks, attacks, reveals)
// - Provide GM with context-sensitive action buttons
// - Process action outcomes
// - Track encounter state

const EncounterManager = {
    currentEncounter: Encounter,
    availableActions: Array<Action>,
    
    loadEncounter(encounterData),
    getAvailableActions(),
    executeAction(actionId),
    
    // Action types
    // - skill_check: { skill, dc, success_outcome, fail_outcome }
    // - attack: { attacker, damage_formula }
    // - reveal: { element_id, description }
    // - narration: { text, timing }
    
    // Events emitted:
    // 'action:available', 'action:executed', 'outcome:success', 'outcome:failure'
};
```

### 15.4 Event Bus Architecture

In the long term, managers can communicate through a central event bus to maintain loose coupling. For the initial implementation, it is acceptable to wire modules together with direct calls and simple callbacks; the event bus is an **evolutionary refactor**, not a blocker for shipping the first version.

```javascript
// Event naming convention: 'domain:action'
// Examples:
//   'display:mode_changed'
//   'character:hp_changed'
//   'combat:turn_changed'
//   'gm:skill_check_triggered'
//   'animation:caret_tick'

const EventBus = {
    listeners: Map<event, Set<callback>>,
    
    on(event, callback),
    off(event, callback),
    emit(event, data),
    once(event, callback)
};

// Usage example:
EventBus.on('combat:attack_result', (data) => {
    if (data.hit) {
        AnimationManager.trigger('damage_flash', data.target);
        AudioManager.play('hit_impact');
    } else {
        AudioManager.play('miss_whoosh');
    }
});
```

### 15.5 Data Models (Extended)

#### CharacterSheet (Neon Protocol v0.3)
```javascript
{
    id: "pc_netrunner",
    name: "Player Character",
    handle: "Voltage",
    background: "techie",
    
    // Core Attributes (range: -1 to +3)
    attributes: {
        reflex: 1,
        body: 0,
        tech: 3,
        neural: 2,
        edge: 1,
        presence: 1
    },
    
    // Derived Stats (Stress/Wounds system)
    derived: {
        stress: 0,
        stressMax: 5,
        wounds: [
            { slot: 1, name: null, penalty: -1 },
            { slot: 2, name: null, penalty: -2 },
            { slot: 3, name: null, penalty: "out" }
        ],
        armor: 1
    },
    
    // Skills (range: 0-5)
    skills: {
        netrunning: 3,
        hardware: 3,
        firearms: 1,
        evasion: 2,
        perception: 2,
        stealth: 1
        // ... etc
    },
    
    // Gear
    gear: [
        { id: "cyberdeck_nomad", name: "Nomad Cyberdeck", quantity: 1 },
        { id: "pistol_light", name: "Kang Tao Type-7", equipped: true }
    ],
    
    // Cyberware with Glitches (narrative complications)
    cyberware: [
        { id: "neural_link", name: "Neural Link Mk.II", slot: "head", 
          glitch: "Sometimes I hear the Net whisper", active: true },
        { id: "optic_hud", name: "Optic HUD", slot: "eyes",
          glitch: "Ads flicker in my peripheral vision", active: true }
    ],
    
    credits: 3200
}
```

#### SkillCheck
```javascript
{
    id: "hack_security_door",
    skill: "hacking",
    stat: "intelligence",
    dc: 15,
    description: "Bypass the security lock",
    
    // Outcomes
    success: {
        narration: "The lock clicks open. You're in.",
        effects: [
            { type: "reveal", target: "file_security_codes" },
            { type: "scene_change", target: "server_room" }
        ]
    },
    failure: {
        narration: "The system rejects your intrusion. Alarms blare.",
        effects: [
            { type: "trigger_combat", encounter: "security_response" },
            { type: "condition", target: "pc", condition: "detected" }
        ]
    },
    
    // Optional: Critical success/failure
    criticalSuccess: { /* ... */ },
    criticalFailure: { /* ... */ }
}
```

#### Encounter
```javascript
{
    id: "server_room_infiltration",
    name: "Server Room Infiltration",
    scene: "admin_network",
    
    // Context-sensitive actions available to GM
    actions: [
        {
            id: "skill_hack_mainframe",
            type: "skill_check",
            label: "Hack Mainframe",
            icon: "terminal",
            data: { /* SkillCheck object */ }
        },
        {
            id: "attack_ice",
            type: "attack",
            label: "ICE Attacks",
            icon: "zap",
            data: {
                attacker: "npc_black_ice",
                damage: "3d6",
                damageType: "neural"
            }
        },
        {
            id: "reveal_manifest",
            type: "reveal",
            label: "Reveal Subject Manifest",
            icon: "file",
            data: {
                fileId: "subject_manifest",
                narration: "Hidden among the data, you find it..."
            }
        }
    ],
    
    // State tracking
    state: {
        mainframeHacked: false,
        iceDefeated: false,
        manifestFound: false
    }
}
```

### 15.6 GM Mode Features

#### Karaoke Mode (Read-Aloud System)
```
┌─────────────────────────────────────────────────────────────────┐
│  GM KARAOKE VIEW                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  "The server room hums with the sound of cooling fans. │    │
│  │   Rows of black monoliths stretch into the darkness,   │    │
│  │   their status lights blinking like stars in a         │    │
│  │   digital void."                                       │    │
│  │                                                         │    │
│  │  [PAUSE - Let player respond]                          │    │
│  │                                                         │    │
│  │  "A single terminal glows amber at the far end.        │    │
│  │   The access point you've been searching for."         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Line 3 of 12                    [◀ PREV] [NEXT ▶] [REVEAL]     │
│                                                                 │
│  ☐ Auto-reveal to player    ☐ Show timing marks                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### GM Action Panel (Context-Sensitive)
```
┌─────────────────────────────────────────────────────────────────┐
│  ENCOUNTER: Server Room Infiltration                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AVAILABLE ACTIONS:                                             │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  🖥️ HACK        │  │  ⚡ ICE ATTACK  │  │  📄 REVEAL      │  │
│  │  MAINFRAME      │  │                 │  │  MANIFEST       │  │
│  │                 │  │  3d6 Neural     │  │                 │  │
│  │  DC 15 INT+Hack │  │  vs Netrunner   │  │  Hidden file    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│  QUICK ACTIONS:                                                 │
│  [Trigger Glitch] [Send Message] [Play SFX] [Change Scene]      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  PLAYER STATUS:                                                 │
│  HP: ████████░░ 28/35    Humanity: ████████░░ 42/50             │
│  Conditions: None                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 15.7 Animation System (Caret Fix)

The current caret animation issue stems from the caret being rendered in `app.js` via `renderInputLine()` but the animation loop being in `PhosphorText`. The fix requires a unified animation system.

#### Problem Analysis
1. `PhosphorText.animate()` runs its own `requestAnimationFrame` loop
2. It animates carets in `.phosphor-caret-layer` via opacity changes
3. `renderInputLine()` creates a `.phosphor-hot-caret` in `.phosphor-text-layer`
4. The hot caret uses CSS animation (`@keyframes hot-caret-blink`)
5. **Conflict:** Two different animation systems, two different DOM locations

#### Solution: AnimationManager
```javascript
const AnimationManager = {
    running: false,
    lastTime: 0,
    callbacks: new Map(),
    
    // Caret-specific state
    caretState: {
        phase: 0,
        blinkRate: 530, // ms
        elements: new Set() // All caret elements to animate
    },
    
    init() {
        this.running = true;
        this.lastTime = performance.now();
        this.tick();
    },
    
    tick() {
        if (!this.running) return;
        
        const now = performance.now();
        const delta = now - this.lastTime;
        this.lastTime = now;
        
        // Update caret blink phase
        this.caretState.phase += delta;
        this.updateCarets();
        
        // Run registered callbacks
        this.callbacks.forEach(cb => cb(delta, now));
        
        requestAnimationFrame(() => this.tick());
    },
    
    updateCarets() {
        const { phase, blinkRate, elements } = this.caretState;
        const cycle = phase % (blinkRate * 2);
        const intensity = cycle < blinkRate 
            ? 1.0 - (cycle / blinkRate) * 0.85
            : 0.15 + ((cycle - blinkRate) / blinkRate) * 0.85;
        
        elements.forEach(el => {
            el.style.opacity = intensity;
        });
    },
    
    registerCaret(element) {
        this.caretState.elements.add(element);
    },
    
    unregisterCaret(element) {
        this.caretState.elements.delete(element);
    },
    
    register(id, callback) {
        this.callbacks.set(id, callback);
    },
    
    unregister(id) {
        this.callbacks.delete(id);
    }
};
```

#### Implementation Steps for Caret Fix
1. Create `AnimationManager` as a new module
2. Remove CSS `@keyframes hot-caret-blink` animation
3. In `renderInputLine()`, register the caret element with `AnimationManager`
4. `AnimationManager` handles opacity changes via JavaScript
5. On input line removal, unregister the caret
6. Optionally: Migrate `PhosphorText.animate()` to use `AnimationManager`

---

## 16. CRITICAL ARCHITECTURE DECISION: Full Three.js UI Migration

> **Date:** 2024-12-04  
> **Status:** APPROVED - Full commitment  
> **Rationale:** The hybrid DOM/Three.js approach has proven unworkable. CSS animations, DOM event handling, and scattered state management create intractable bugs. We need complete control.

### 16.1 The Problem

The current architecture mixes:
- **DOM-based UI** (chat log, dice panel, terminal text via `PhosphorText`)
- **Three.js rendering** (CRT shader, scene backgrounds)
- **CSS animations** (caret blink, scanlines)
- **Multiple animation loops** (PhosphorText.animate, AnimationManager, Three.js render loop)
- **Scattered event handlers** (multiple keydown listeners across files)

This creates:
- Animation conflicts (caret doesn't blink because multiple systems fight over opacity)
- Input routing bugs (PageUp/PageDown don't work because handlers are scattered)
- Visual inconsistency (DOM elements can't have CRT effects applied)
- Debugging nightmares (state spread across DOM, CSS, and JS)

### 16.2 The Solution: Pure Three.js/WebGL

**Everything** renders through Three.js. No DOM-based UI except:
- Tweakpane (dev tools only, not part of game aesthetic)
- Hidden `<input>` elements for text capture (accessibility/IME support)

### 16.3 New Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LIGHT DECK - THREE.JS ONLY                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        RENDER PIPELINE                              │ │
│  │                                                                     │ │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐   │ │
│  │   │ Scene Layer │    │ UI Layer    │    │ Post-Processing     │   │ │
│  │   │             │    │             │    │                     │   │ │
│  │   │ - Background│    │ - Terminal  │    │ - Bloom (Gaussian)  │   │ │
│  │   │ - ASCII     │    │ - Chat Log  │    │ - CRT Distortion    │   │ │
│  │   │   Shader    │    │ - Dice Panel│    │ - Film Grain        │   │ │
│  │   │             │    │ - Status    │    │ - Vignette          │   │ │
│  │   └─────────────┘    └─────────────┘    └─────────────────────┘   │ │
│  │         │                  │                      │                │ │
│  │         └──────────────────┴──────────────────────┘                │ │
│  │                            │                                        │ │
│  │                    EffectComposer                                   │ │
│  │                            │                                        │ │
│  │                      Final Output                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        MANAGER LAYER                                │ │
│  │                                                                     │ │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │ │
│  │   │ InputMgr    │  │ RenderMgr   │  │ AnimationMgr│               │ │
│  │   │             │  │             │  │             │               │ │
│  │   │ - Keyboard  │  │ - Scene     │  │ - Single    │               │ │
│  │   │ - Mouse     │  │ - UI Panels │  │   rAF loop  │               │ │
│  │   │ - Routing   │  │ - Textures  │  │ - Carets    │               │ │
│  │   └─────────────┘  └─────────────┘  └─────────────┘               │ │
│  │                                                                     │ │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │ │
│  │   │ TerminalMgr │  │ ChatMgr     │  │ GameStateMgr│               │ │
│  │   │             │  │             │  │             │               │ │
│  │   │ - Text      │  │ - Messages  │  │ - Characters│               │ │
│  │   │ - Commands  │  │ - History   │  │ - Combat    │               │ │
│  │   │ - Caret     │  │ - Scrolling │  │ - Sync      │               │ │
│  │   └─────────────┘  └─────────────┘  └─────────────┘               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        DATA LAYER                                   │ │
│  │                                                                     │ │
│  │   EventBus ←→ WebSocket ←→ Server ←→ Persistent Storage            │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 16.4 Core Principles

1. **Single Animation Loop**
   - ONE `requestAnimationFrame` callback
   - All animations (caret, typewriter, effects) driven from this loop
   - No CSS animations, no setTimeout-based animations

2. **Single Input Handler**
   - ONE `document.addEventListener('keydown', ...)` 
   - `InputManager` routes ALL keys to appropriate handlers
   - Other managers expose methods, not event listeners

3. **Canvas-Based Text Rendering**
   - Terminal text rendered to `CanvasTexture`
   - Chat log rendered to `CanvasTexture`
   - All text uses same phosphor glow system
   - Caret is a drawn rectangle, not a DOM element

4. **Unified Visual Pipeline**
   - All UI elements are Three.js planes with textures
   - Post-processing applies to everything (bloom, grain, vignette)
   - CRT distortion only on main viewport, not UI panels

5. **State Ownership**
   - Each manager owns its state completely
   - No DOM state (classList, style, innerHTML)
   - State changes trigger texture re-renders

### 16.5 Key Components

#### TextRenderer (New)
```javascript
// Renders text to a canvas with phosphor effects
const TextRenderer = {
    // Create a text canvas with given dimensions
    createCanvas(width, height, options) { ... },
    
    // Render text with phosphor glow, returns ImageData
    renderText(canvas, text, options) {
        // options: font, color, glow, lineHeight, etc.
    },
    
    // Render a blinking caret at position
    renderCaret(canvas, x, y, intensity, options) { ... },
    
    // Apply burn-in effect
    applyBurnIn(canvas, burnInMap) { ... }
};
```

#### TerminalManager (Replaces PhosphorText + DOM terminal)
```javascript
const TerminalManager = {
    canvas: null,           // OffscreenCanvas for terminal
    texture: null,          // THREE.CanvasTexture
    plane: null,            // THREE.Mesh
    
    lines: [],              // Array of text lines
    inputBuffer: '',        // Current input
    caretPosition: 0,       // Cursor position
    scrollOffset: 0,        // For scrolling
    
    init(scene) { ... },
    
    // Called by AnimationManager each frame
    update(delta) {
        this.updateCaretBlink(delta);
        if (this.dirty) {
            this.renderToTexture();
            this.dirty = false;
        }
    },
    
    // Render all terminal content to canvas
    renderToTexture() {
        TextRenderer.clear(this.canvas);
        // Render each line
        this.lines.forEach((line, i) => {
            TextRenderer.renderText(this.canvas, line, { y: i * lineHeight });
        });
        // Render input line with caret
        TextRenderer.renderText(this.canvas, '> ' + this.inputBuffer, { ... });
        TextRenderer.renderCaret(this.canvas, caretX, caretY, this.caretIntensity);
        
        this.texture.needsUpdate = true;
    },
    
    // Input handling (called by InputManager)
    handleKey(key) { ... },
    handleChar(char) { ... },
    
    // Scrolling (called by InputManager)
    scrollUp(amount) { ... },
    scrollDown(amount) { ... }
};
```

#### ChatManager (Replaces DOM chat log)
```javascript
const ChatManager = {
    canvas: null,
    texture: null,
    plane: null,
    
    messages: [],
    scrollOffset: 0,
    
    init(scene) { ... },
    
    addMessage(type, text) {
        this.messages.push({ type, text, timestamp: Date.now() });
        this.dirty = true;
    },
    
    update(delta) {
        if (this.dirty) {
            this.renderToTexture();
            this.dirty = false;
        }
    },
    
    renderToTexture() { ... },
    
    scrollUp(amount) { ... },
    scrollDown(amount) { ... }
};
```

#### RenderManager (Orchestrates all rendering)
```javascript
const RenderManager = {
    scene: null,
    camera: null,
    renderer: null,
    composer: null,         // EffectComposer for post-processing
    
    // Render targets
    sceneTarget: null,      // Main scene (background + ASCII)
    uiTarget: null,         // UI elements
    
    // Planes
    scenePlane: null,       // Main viewport
    terminalPlane: null,    // Terminal overlay
    chatPlane: null,        // Chat log panel
    dicePlane: null,        // Dice panel
    
    init() { ... },
    
    // Called by AnimationManager
    render() {
        // 1. Render scene content to sceneTarget
        // 2. Render UI panels (terminal, chat, dice)
        // 3. Compose with post-processing
        // 4. Output to screen
    }
};
```

### 16.6 Migration Phases

#### Phase A: Foundation (IMMEDIATE - 4-6 hours)
1. [ ] Create `TextRenderer` module for canvas-based text
2. [ ] Create `RenderManager` to orchestrate Three.js rendering
3. [ ] Consolidate to single animation loop in `AnimationManager`
4. [ ] Remove all DOM-based UI event listeners except InputManager

#### Phase B: Terminal Migration (6-8 hours)
5. [ ] Create `TerminalManager` with canvas-based rendering
6. [ ] Implement terminal text rendering with phosphor glow
7. [ ] Implement caret as drawn element (not DOM)
8. [ ] Implement scrolling via texture offset
9. [ ] Wire keyboard input through InputManager → TerminalManager
10. [ ] Remove `PhosphorText` module and DOM terminal

#### Phase C: Chat & UI Migration (4-6 hours)
11. [ ] Create `ChatManager` with canvas-based rendering
12. [ ] Migrate dice panel to Three.js (clickable planes with raycasting)
13. [ ] Remove DOM sidebar elements
14. [ ] Implement mouse interaction via raycasting

#### Phase D: Post-Processing & Polish (4-6 hours)
15. [ ] Implement proper multi-pass bloom (fix star artifacts)
16. [ ] Separate CRT distortion from content
17. [ ] Apply phosphor glow to all text uniformly
18. [ ] Add CRT bezel/frame as 3D geometry
19. [ ] Performance optimization

### 16.7 File Structure After Migration

```
public/js/
├── core/
│   ├── render-manager.js      # Three.js scene, camera, composer
│   ├── animation-manager.js   # Single rAF loop, timing
│   ├── input-manager.js       # Keyboard/mouse routing
│   └── event-bus.js           # Inter-manager communication
│
├── rendering/
│   ├── text-renderer.js       # Canvas-based text with glow
│   ├── shaders/
│   │   ├── crt-content.glsl   # ASCII + phosphor effects
│   │   ├── crt-display.glsl   # Barrel distortion, curvature
│   │   └── bloom.glsl         # Gaussian bloom passes
│   └── post-processing.js     # EffectComposer setup
│
├── managers/
│   ├── terminal-manager.js    # Terminal state & rendering
│   ├── chat-manager.js        # Chat log state & rendering
│   ├── dice-manager.js        # Dice UI state & rendering
│   ├── scene-manager.js       # Background images, ASCII mode
│   └── game-state-manager.js  # Characters, combat, sync
│
├── ui/
│   ├── panel.js               # Base class for UI panels
│   ├── button.js              # Clickable button (raycasting)
│   └── scrollable.js          # Scrollable text area
│
└── app.js                     # Bootstrap, init sequence
```

### 16.8 Benefits

1. **Complete Control** - Every pixel rendered by our code
2. **Unified Effects** - Bloom, glow, grain apply to everything
3. **Single Animation Loop** - No timing conflicts
4. **Predictable State** - No DOM state to track
5. **Debuggable** - All state in JS objects, not scattered across DOM/CSS
6. **Consistent Aesthetic** - All text has same phosphor treatment
7. **Future-Proof** - Easy to add 3D effects, transitions, etc.

### 16.9 Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Text input accessibility | Keep hidden `<input>` for IME/screen readers |
| Performance on low-end | Reduce texture resolution, skip effects |
| Development time | Phased approach, keep old code until new works |
| Text rendering quality | Use high-DPI canvas, proper font rendering |

---

## 17. Implementation Phases (Revised)

> **Priority:** Phase A (Three.js Foundation) is now the IMMEDIATE priority.
> All other phases are blocked until the rendering architecture is solid.

### Phase A: Three.js Foundation (IMMEDIATE)
1. [x] Create `TextRenderer` module
2. [x] Create `RenderManager` module
3. [x] Consolidate animation loop
4. [x] Clean up InputManager (single handler)

### Phase B: Terminal Migration
5. [x] Create `TerminalManager`
6. [x] Canvas-based terminal rendering
7. [x] Caret as drawn element
8. [x] Terminal scrolling
9. [x] Remove PhosphorText/DOM terminal

### Phase C: UI Migration
10. [x] Create `ChatManager`
11. [x] Migrate dice panel
12. [x] Remove DOM sidebar
13. [x] Raycasting for clicks

### Phase D: Post-Processing
14. [x] Multi-pass bloom
15. [x] CRT distortion separation
16. [x] Unified phosphor glow
17. [x] Performance optimization

### Phase E: Game Systems (After UI Migration)
18. [ ] Character system
19. [ ] Combat system
20. [ ] GM tools
21. [x] WebSocket sync (SyncManager)

---

## 18. SyncManager - Multiplayer Synchronization

> **Status:** IMPLEMENTED (2024-12-04)

### 18.1 Overview

SyncManager provides real-time multiplayer synchronization via Socket.io. It enables:
- **Presence tracking** - Who's connected, their role (GM/Player), current view
- **Chat synchronization** - Messages broadcast to all session members
- **Dice roll sharing** - Rolls visible to everyone with attribution
- **Scene control** - GM can push scene changes to all players
- **View state awareness** - GM sees when players switch between Scene/Terminal

### 18.2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
├─────────────────────────────────────────────────────────────────┤
│  SyncManager                                                     │
│  ├── Socket.io connection                                        │
│  ├── Local state (id, name, role, view)                         │
│  ├── Peer tracking (Map of connected users)                     │
│  ├── Message handlers (chat, roll, scene, presence)             │
│  └── Self-test system (validates round-trip on connect)         │
│                                                                  │
│  EventBus Integration                                            │
│  ├── Emits sync:* events for UI updates                         │
│  └── Listens for terminal:opened/closed for view changes        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Socket.io
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER                                   │
├─────────────────────────────────────────────────────────────────┤
│  server/index.js                                                 │
│  ├── users Map (socketId → user state)                          │
│  ├── sessions Map (sessionId → { gm, players, scene, state })   │
│  ├── Message routing (broadcast to session rooms)               │
│  ├── GM authentication (password-based)                         │
│  └── Echo endpoint for self-test                                │
└─────────────────────────────────────────────────────────────────┘
```

### 18.3 Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `sync:join` | Client→Server→Clients | User joined session |
| `sync:leave` | Server→Clients | User left session |
| `sync:presence` | Server→Client | Full list of connected users |
| `sync:view_change` | Client→Server→Clients | User switched Scene/Terminal |
| `sync:chat` | Client→Server→Clients | Chat message broadcast |
| `sync:roll` | Client→Server→Clients | Dice roll broadcast |
| `sync:scene_change` | GM→Server→Clients | GM pushed scene change |
| `sync:echo_request/response` | Client↔Server | Self-test round-trip |

### 18.4 Self-Test System

On connection, SyncManager automatically runs a self-test:
1. Sends `sync:echo_request` with random token
2. Server immediately echoes back `sync:echo_response`
3. Client validates token match and measures latency
4. Result shown in chat log: "Self-test passed (Xms round-trip)"

This ensures communication works before the user tries to interact.

### 18.5 Roles

- **Player** (default) - Can chat, roll dice, view scenes
- **GM** - All player abilities plus:
  - Push scene changes to all players
  - See when players switch views (Scene/Terminal)
  - Future: Control combat, manage characters

GM authentication via `/gm <password>` command (password in `.env`).

### 18.6 View State Tracking

When a player toggles Terminal mode:
1. `App.toggleTerminalMode()` calls `SyncManager.broadcastViewChange()`
2. Server broadcasts to session
3. GM receives `onPeerViewChange` callback
4. GM's chat shows: "PlayerName switched to TERMINAL"

This lets the GM know if a player is "away" in the terminal.

### 18.7 Files

| File | Purpose |
|------|---------|
| `public/js/core/sync-manager.js` | Client-side sync logic |
| `server/index.js` | Server-side Socket.io handlers |
| `public/js/core/event-bus.js` | Sync events defined |
| `public/js/app.js` | SyncManager initialization |

### 18.8 Chat Commands

| Command | Description |
|---------|-------------|
| `/roll XdY+Z` | Roll dice, broadcast to all players |
| `/who` | List connected players |
| `/name <name>` | Change your display name |
| `/ping` | Test connection status |
| `/gm <password>` | Authenticate as GM |
| `/scenes` | (GM only) List available scenes |
| `/scene <num>` | (GM only) Change scene (e.g., `/scene 1.1.2`) |
| `/views` | (GM only) See what each player is viewing |
| `/logout` | Logout from GM role |
| `/clear` | Clear chat log |
| `/help` | Show command help |

### 18.9 Session Persistence

> **Status:** IMPLEMENTED (2024-12-08)

Session persistence allows users to reconnect after disconnection and restore their state.

#### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION PERSISTENCE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLIENT                                                          │
│  ├── Token stored in localStorage                               │
│  ├── Token sent with JOIN message on connect                    │
│  └── STATE_SYNC received on reconnect → restore scene/flags    │
│                                                                  │
│  SERVER (SessionManager.js)                                      │
│  ├── Sessions stored as JSON in server/sessions/                │
│  ├── Token → User mapping for reconnection                      │
│  ├── State: scene, NPC states, flags, chat history              │
│  └── Auto-save with debounce, 24-hour expiry                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Session State Schema

```javascript
{
  id: string,              // Session ID (e.g., 'default')
  adventureId: string,     // Current adventure
  currentScene: string,    // Active scene ID
  users: {                 // Token → UserState
    [token]: {
      token: string,
      name: string,
      role: 'player' | 'gm',
      view: string,
      characterId: string | null,
      lastSeen: number,
      connected: boolean
    }
  },
  npcStates: {             // NPC ID → NPCState
    [npcId]: {
      id: string,
      status: 'alive' | 'dead' | 'hidden' | 'fled',
      currentStress: number,
      wounds: number,
      conditions: string[],
      customData: object
    }
  },
  flags: Record<string, boolean | string>,
  campaignClock: { day: number, time: string },
  chatHistory: Message[],  // Last 100 messages
  createdAt: number,
  updatedAt: number
}
```

#### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `sync:token` | Server→Client | Session token for localStorage |
| `sync:state` | Server→Client | Full state sync on reconnect |
| `sync:state_request` | Client→Server | Request current state |
| `sync:npc_state` | GM→Server→Clients | NPC state update |
| `sync:flag_update` | GM→Server→Clients | Campaign flag update |

#### Reconnection Flow

1. Client connects to server
2. Client sends `sync:join` with stored token (if any)
3. Server validates token:
   - **Valid:** Mark user as reconnected, send `sync:state` with current state
   - **Invalid/Missing:** Create new user, send new `sync:token`
4. Client stores token in localStorage
5. On state sync, client restores scene, flags, etc.

#### Files

| File | Purpose |
|------|---------|
| `server/SessionManager.js` | Server-side session persistence |
| `server/sessions/*.json` | Persisted session files |
| `public/js/core/sync-manager.js` | Client token handling |
| `src/gm-overlay/hooks/useSyncManager.ts` | GM Overlay session sync |

#### Testing

Session persistence tests are in `tests/session-persistence.spec.ts`:
- Token generation and storage
- Reconnection with same identity
- Scene state persistence
- Multi-user scenarios
- Error handling (invalid tokens)

---

## 19. Scene Management System

> **Status:** IMPLEMENTED (2024-12-04)

### 19.1 Overview

Scenes are stored as JSON files alongside their image assets. The GM can browse and push scene changes to all connected players.

### 19.2 File Structure

```
assets/scene_backgrounds/
├── AChangeOfHeart_Act_01_Chapter_01_Scene_01.json
├── AChangeOfHeart_Act_01_Chapter_01_Scene_01.png
├── AChangeOfHeart_Act_01_Chapter_01_Scene_02.json
├── AChangeOfHeart_Act_01_Chapter_01_Scene_02.png
└── ...
```

### 19.3 Scene JSON Schema (Playable)

> **Updated:** 2024-12-05 - Added `challenges`, `exits`, and `type` fields for programmatic gameplay.

```json
{
    "id": "AChangeOfHeart_Act_01_Chapter_01_Scene_01",
    "adventure": "A Change of Heart",
    "act": 1,
    "chapter": 1,
    "scene": 1,
    "type": "social",
    "title": "The Briefing",
    "location": "Street Noodle Stand",
    "image": "AChangeOfHeart_Act_01_Chapter_01_Scene_01.png",
    "visuals": "ASCII_Overlay: Static rain interference...",
    
    "narrative": "Read-aloud text for players...",
    "gmNotes": "Private notes for GM only",
    
    "npcs": [
        {
            "id": "jax",
            "name": "Jaxson 'Jax' V.",
            "role": "The Companion",
            "statblock": null,
            "state": "active",
            "notes": "Scene-specific notes"
        }
    ],
    
    "challenges": [
        {
            "id": "assess_jax",
            "skill": "Empathy",
            "difficulty": 12,
            "description": "Read Jax's body language and detect his deception.",
            "requires_item": null,
            "requires_flag": null,
            "success_effect": {
                "text": "You notice he isn't checking his agent...",
                "sets_flag": "suspects_jax_lying",
                "unlocks_clue": "jax_deception",
                "grants_item": null
            },
            "failure_effect": {
                "text": "He seems jittery. Probably just nerves.",
                "stress_damage": 0,
                "sets_flag": null
            }
        }
    ],
    
    "triggers": [
        {
            "id": "clue_sludge",
            "label": "The Cough",
            "action": "passive",
            "condition": null,
            "text": "Jax coughs into a napkin...",
            "sets_flag": "witnessed_jax_cough"
        }
    ],
    
    "exits": [
        {
            "target_scene_id": "AChangeOfHeart_Act_01_Chapter_01_Scene_02",
            "condition": "default",
            "label": "Accept the job and head to Oakhaven"
        },
        {
            "target_scene_id": "AChangeOfHeart_Act_02_Chapter_01_Scene_04",
            "condition": "alarm_triggered",
            "label": "Ambushed in the Courtyard"
        }
    ],
    
    "music": null,
    "ambience": null
}
```

#### Scene Types

| Type | Description |
|------|-------------|
| `social` | Dialogue and roleplay focused |
| `infiltration` | Stealth and bypassing obstacles |
| `exploration` | Investigation and discovery |
| `combat` | Fighting encounters |
| `puzzle` | Problem-solving challenges |
| `choice` | Moral decisions with consequences |
| `ending` | Conclusion scenes |

#### Challenge Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `skill` | string | Skill to roll (e.g., "Netrunning", "Empathy") |
| `difficulty` | number | Target number to beat |
| `description` | string | What the player is attempting |
| `requires_item` | string? | Item ID required to attempt |
| `requires_flag` | string? | Flag that must be set to attempt |
| `success_effect.text` | string | Narrative result on success |
| `success_effect.sets_flag` | string? | Flag to set on success |
| `success_effect.unlocks_clue` | string? | Clue ID to unlock |
| `success_effect.grants_item` | string? | Item ID to grant |
| `failure_effect.text` | string | Narrative result on failure |
| `failure_effect.stress_damage` | number | Stress to apply on failure |
| `failure_effect.sets_flag` | string? | Flag to set on failure |

#### Exit Schema

| Field | Type | Description |
|-------|------|-------------|
| `target_scene_id` | string | Scene ID to navigate to |
| `condition` | string | `"default"` or a flag expression (e.g., `"alarm_triggered"`) |
| `label` | string | Display text for the exit option |

### 19.4 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scenes` | GET | List all scenes (sorted by adventure/act/chapter/scene) |
| `/api/scenes/:id` | GET | Get specific scene by ID |

### 19.5 GM Workflow

1. Authenticate: `/gm SwanSong`
2. List scenes: `/scenes`
3. Change scene: `/scene 1.1.2`
4. All players automatically see the new scene

### 19.6 Future Enhancements

- [ ] Scene transitions (fade, dissolve effects)
- [ ] Auto-play music/ambience on scene change
- [ ] Scene selector modal
- [ ] Scene history (back/forward navigation)

---

## 20. GM Overlay System

> **Status:** IMPLEMENTED (2024-12-04)

### 20.1 Overview

When authenticated as GM, an overlay appears over the Scene Viewer showing:
- Scene title and position
- Narrative text (read-aloud to players)
- GM-only notes
- Clickable skill check buttons
- Trigger buttons for story events
- Navigation (Prev / Select / Next)

Players never see this overlay - they only see the scene image.

### 20.2 Extended Scene JSON Schema

```json
{
    "id": "AChangeOfHeart_Act_01_Chapter_01_Scene_01",
    "adventure": "A Change of Heart",
    "act": 1, "chapter": 1, "scene": 1,
    "title": "The Beginning",
    "image": "AChangeOfHeart_Act_01_Chapter_01_Scene_01.png",
    
    "narrative": "Read aloud to players:\n\nThe story begins...",
    "gmNotes": "Private notes for GM only",
    
    "skillChecks": [
        { "name": "Perception", "dc": 15, "success": "You notice...", "fail": "Nothing seems amiss" }
    ],
    
    "triggers": [
        { "id": "reveal_secret", "label": "Reveal Secret", "action": "chat", "text": "A door opens!" }
    ],
    
    "music": null,
    "ambience": null
}
```

### 20.3 GM Commands

| Command | Description |
|---------|-------------|
| `/overlay` | Toggle GM overlay visibility |
| `/next` | Go to next scene |
| `/prev` | Go to previous scene |
| `/scene 1.1.2` | Jump to specific scene |
| `/scenes` | List all available scenes |

### 20.4 Skill Checks

When GM clicks a skill check button:
1. Rolls d20 automatically
2. Compares to DC
3. Broadcasts result + success/fail text to all players via chat

### 20.5 Triggers

Trigger buttons execute predefined actions:
- `chat` - Broadcast text to all players
- `sound` - Play a sound effect (future)

### 20.6 Files

| File | Purpose |
|------|---------|
| `public/js/managers/scene-manager.js` | Scene state, navigation, caching |
| `public/js/managers/gm-overlay-manager.js` | GM overlay rendering and interaction |

### 20.7 Future Enhancements

- [ ] Scene selector modal (for /select button)
- [ ] Collapsible GM notes section
- [ ] Custom dice expressions for skill checks
- [ ] Trigger actions: sound, music, scene jump

---

## 21. Future Enhancements (Global)

- [ ] Character state sync (share character sheets)
- [ ] Combat state sync (initiative, HP, conditions)
- [ ] Session persistence (reconnect to same state)
- [ ] Multiple sessions (different "tables")
- [ ] Spectator mode (view-only)
- [ ] Private messages (GM ↔ Player)

---

## 21. Revision History

| Date | Version | Notes |
|------|---------|-------|
| 2024-12-03 | 0.1 | Initial architecture document |
| 2024-12-03 | 0.2 | Added server infrastructure, Three.js rendering, audio system |
| 2024-12-04 | 0.3 | Added Manager System Architecture, Character/Combat systems, GM tools planning, Animation system design |
| 2024-12-04 | 0.4 | Attempted Phase 7 implementation (EventBus, AnimationManager, DisplayManager) |
| 2024-12-04 | **1.0** | **CRITICAL DECISION: Full Three.js UI Migration.** Abandoned hybrid DOM/Three.js approach. All UI will render through Three.js with canvas-based text. Complete architectural overhaul documented in Section 16. |
| 2024-12-04 | 1.1 | Added SyncManager for multiplayer synchronization. Self-test on connect, presence tracking, chat/dice/scene sync, GM view awareness. |
| 2024-12-04 | 1.2 | Wired ChatManager through SyncManager. Chat messages and dice rolls now broadcast to all players. Added commands: /who, /views, /gm, /name, /logout. |
| 2024-12-04 | 1.3 | Scene Management System. JSON scene files, /scenes and /scene commands, GM can push scene changes to all players. |
| 2024-12-04 | 1.4 | GM Overlay System. SceneManager + GMOverlayManager. Extended scene JSON with narrative, gmNotes, skillChecks, triggers. Clickable skill checks roll d20 and broadcast results. Navigation buttons (Prev/Select/Next). |
| 2024-12-04 | 1.5 | CRT Transition System. TransitionManager for unified power-down/power-up effects. Scene changes, terminal toggle, and boot sequence all use consistent CRT fade. |
| 2024-12-04 | 1.6 | Game System Foundation. Created GAME-SYSTEM.md with "Neon Protocol" rules. Player character and NPC JSON schemas. Example characters created in assets/characters/. |
| 2024-12-04 | 1.7 | Adventure Guide System. Created AChangeOfHeart_Guide.json with indexed sections. Added NPCs to scene JSONs. API endpoints for guides and NPCs. GM Overlay now shows NPCs with state indicators and GUIDE button. |
| 2024-12-05 | 1.8 | Playable Schema Update. Added `challenges` and `exits` to scenes for programmatic gameplay. Added `state_tracking`, `items`, and `clues` sections to adventure guide. All scene JSONs updated with skill checks, flag tracking, and navigation. |
| 2024-12-05 | 1.9 | Terminal/Document/Program System. Three new JSON asset types: Terminals (in-game computers with unique styles), Documents (readable content), Programs (terminal apps/minigames). Scenes can now include `terminal_access_points`. API endpoints and export updated. |
| 2024-12-05 | **2.0** | **GM Overlay v2 (React).** Complete React-based GM interface in `src/gm-overlay/`. Scene Activation System distinguishes browsing vs. pushing scenes to players. Player View Preview shows active scene thumbnail. Chat Log Panel with real-time Socket.io sync. Zustand stores for scene, view, session, chat state. Keyboard shortcuts (Shift+Enter to activate, Cmd+J for scene jumper). |
| 2024-12-05 | 2.1 | **NPC Detail View with Public/Private Data.** NPC JSON schema updated with `public` and `private` sections. Server API filters data by role (`?role=gm` for full access). GM Overlay shows full statblock. Players use `/look <name>` command to see public info only. |
| 2024-12-06 | 2.2 | **Onboarding System.** New player onboarding flow with audio calibration, visual calibration, character creation, debt & equipment selection, and document generation. OnboardingManager state machine. Debt system with background-based starting debt and optional debt packages for extra gear. Generated identity documents (Corporate ID, SIN, Debt Statement). Commands: `/onboard`, `/create`, `/newchar`. |

---

## 22. Adventure Guide Schema (Playable)

> **Status:** IMPLEMENTED (2024-12-05)

### 22.1 Overview

The adventure guide now includes sections for programmatic gameplay tracking:
- **state_tracking** - Boolean and enum flags for player choices
- **items** - Database of key items, loot, and clutter
- **clues** - Information discoveries that advance the mystery

### 22.2 State Tracking Schema

```json
{
    "state_tracking": {
        "title": "Campaign Flags",
        "description": "Boolean and enum flags that track player choices.",
        "flags": [
            {
                "id": "knows_jax_betrayal",
                "type": "boolean",
                "default": false,
                "description": "True if player reads the logs in Scene 5."
            },
            {
                "id": "hazers_status",
                "type": "enum",
                "options": ["neutral", "negotiated", "spared", "killed"],
                "default": "neutral",
                "description": "How the player resolved the Hazer encounter."
            },
            {
                "id": "jax_fate",
                "type": "enum",
                "options": ["alive", "dead"],
                "default": "alive",
                "description": "Whether Jax survives the adventure."
            }
        ]
    }
}
```

#### Flag Types

| Type | Description |
|------|-------------|
| `boolean` | True/false state |
| `enum` | One of several predefined options |

### 22.3 Items Schema

```json
{
    "items": {
        "title": "Item Database",
        "description": "Key items, clutter, and loot.",
        "content": [
            {
                "id": "item_chip_89",
                "name": "Rusted Maintenance Chip",
                "type": "key_item",
                "description": "Jax's 'lucky charm'. A corroded access chip.",
                "data_content": "Log #4092: User 89 authorized ventilation reversal.",
                "reveal_flag": "knows_jax_betrayal",
                "location": "Jax carries this."
            }
        ]
    }
}
```

#### Item Types

| Type | Description |
|------|-------------|
| `key_item` | Required for progression or reveals |
| `clue` | Provides information about the mystery |
| `consumable` | Single-use items (healing, buffs) |
| `loot` | Sellable or tradeable items |
| `clutter` | Flavor items with no mechanical use |
| `gift` | Given by NPCs as rewards |

### 22.4 Clues Schema

```json
{
    "clues": {
        "title": "Clue Database",
        "description": "Information discoveries.",
        "content": [
            {
                "id": "log_evidence",
                "name": "The Terminal Logs",
                "description": "Jax traded the ventilation codes to Bio-Dyne.",
                "unlocked_by": ["hack_terminal"]
            }
        ]
    }
}
```

### 22.5 Flag Expressions

Conditions in scenes use simple flag expressions:

| Expression | Meaning |
|------------|---------|
| `"default"` | Always available |
| `"flag_name"` | True if flag is set |
| `"!flag_name"` | True if flag is NOT set |
| `"flag1 AND flag2"` | Both flags must be set |
| `"flag1 AND !flag2"` | flag1 set, flag2 not set |

### 22.6 Integration Points

- **Challenges** set flags via `success_effect.sets_flag` and `failure_effect.sets_flag`
- **Triggers** set flags via `sets_flag`
- **Exits** check flags via `condition`
- **Challenges** can require items via `requires_item`
- **Challenges** can require flags via `requires_flag`
- **Challenges** can grant items via `success_effect.grants_item`

---

## 23. Terminal System

> **Status:** IMPLEMENTED (2024-12-05)

### 23.1 Overview

Terminals are in-game computer interfaces that players can access. Each terminal has its own visual style, filesystem, documents, and programs. Scenes can contain `terminal_access_points` that link to terminal JSON files.

### 23.2 File Structure

```
assets/terminals/
├── oakhaven_admin_terminal.json
├── oakhaven_lobby_kiosk.json
└── ...
```

### 23.3 Terminal JSON Schema

```json
{
    "id": "oakhaven_admin_terminal",
    "name": "Oakhaven Admin Terminal",
    "type": "workstation",
    "location": "Admin Wing Server Room",
    "adventure": "A Change of Heart",
    
    "description": "A dusty Bio-Dyne workstation...",
    
    "style": {
        "theme": "biodyne_corporate",
        "phosphor": "p1",
        "primaryColor": "#33ff66",
        "secondaryColor": "#228844",
        "accentColor": "#ffaa00",
        "backgroundColor": "#0a0a0a",
        "fontFamily": "IBM Plex Mono",
        "fontSize": 14,
        "scanlines": true,
        "scanlineIntensity": 0.15,
        "flicker": true,
        "flickerIntensity": 0.03,
        "noise": true,
        "noiseIntensity": 0.02,
        "crtCurvature": 0.09,
        "bloom": true,
        "bloomIntensity": 0.4
    },
    
    "boot_sequence": {
        "enabled": true,
        "lines": [
            { "text": "SYSTEM BOOT...", "speed": 80, "type": "system" }
        ]
    },
    
    "access_level": "guest",
    "requires_hack": false,
    "hack_difficulty": null,
    
    "filesystem": {
        "root": "/biodyne/oakhaven",
        "directories": [
            {
                "path": "/",
                "name": "root",
                "files": ["readme.txt"],
                "subdirs": ["admin", "subjects"]
            }
        ]
    },
    
    "documents": ["doc_readme", "doc_subject_89"],
    "programs": ["prog_file_browser", "prog_ice_breaker"],
    
    "commands": {
        "available": ["help", "dir", "cd", "cat", "run", "exit"],
        "custom": []
    },
    
    "events": {
        "on_access": { "sets_flag": "accessed_terminal" },
        "on_read_subject_89": { "sets_flag": "knows_jax_betrayal" }
    },
    
    "gmNotes": "Private notes for GM"
}
```

### 23.4 Terminal Types

| Type | Description |
|------|-------------|
| `workstation` | Full computer with filesystem access |
| `kiosk` | Public information terminal with menu |
| `security` | Security system terminal |
| `medical` | Medical records terminal |
| `industrial` | Factory/facility control terminal |

### 23.5 Scene Integration

Scenes can include `terminal_access_points`:

```json
{
    "terminal_access_points": [
        {
            "id": "admin_terminal",
            "terminal_id": "oakhaven_admin_terminal",
            "name": "Admin Workstation",
            "description": "A dusty workstation...",
            "position": "center",
            "requires_hack": false,
            "on_access": { "sets_flag": "accessed_terminal" }
        }
    ]
}
```

---

## 24. Document System

> **Status:** IMPLEMENTED (2024-12-05)

### 24.1 Overview

Documents are in-game readable content. They can be found in terminals, given as physical items, or discovered in scenes. Each document has its own styling and content structure.

### 24.2 File Structure

```
assets/documents/
├── doc_subject_89_jaxson.json
├── doc_liquidation_order.json
├── doc_message_board_archive.json
└── ...
```

### 24.3 Document JSON Schema

```json
{
    "id": "doc_subject_89_jaxson",
    "name": "Subject 89 - Jaxson V.",
    "type": "log_file",
    "format": "terminal",
    "adventure": "A Change of Heart",
    
    "metadata": {
        "filename": "subject_89_jaxson.log",
        "created": "2127-03-15",
        "modified": "2142-08-22",
        "author": "Bio-Dyne Medical Division",
        "classification": "CONFIDENTIAL",
        "size": "4.2 KB"
    },
    
    "style": {
        "monospace": true,
        "color": "#33ff66",
        "headerColor": "#ffaa00"
    },
    
    "content": {
        "header": "═══ HEADER TEXT ═══",
        "sections": [
            {
                "title": "SECTION TITLE",
                "text": "Section content..."
            }
        ],
        "footer": "═══ END OF FILE ═══"
    },
    
    "requires_access": null,
    "requires_hack": false,
    "hack_difficulty": null,
    
    "reveal_flags": ["knows_jax_betrayal"],
    "unlocks_clues": ["log_evidence"],
    
    "found_in": {
        "terminals": ["oakhaven_admin_terminal"],
        "items": ["item_chip_89"],
        "scenes": []
    },
    
    "gmNotes": "Private notes for GM"
}
```

### 24.4 Document Types

| Type | Description |
|------|-------------|
| `log_file` | System or access logs |
| `memo` | Corporate memos and orders |
| `message_log` | Chat/message archives |
| `report` | Technical or medical reports |
| `letter` | Personal correspondence |
| `manual` | Technical manuals |
| `note` | Handwritten notes |

### 24.5 Document Formats

| Format | Description |
|--------|-------------|
| `terminal` | Displayed in terminal style |
| `document` | Displayed as formatted document |
| `chat` | Displayed as message thread |
| `handwritten` | Displayed with handwriting font |

---

## 25. Program System

> **Status:** IMPLEMENTED (2024-12-05)

### 25.1 Overview

Programs are terminal applications that provide functionality or minigames. They can be file browsers, hacking tools, communication apps, or custom challenges.

### 25.2 File Structure

```
assets/programs/
├── prog_file_browser.json
├── prog_ice_breaker.json
├── prog_message_board.json
└── ...
```

### 25.3 Program JSON Schema

```json
{
    "id": "prog_ice_breaker",
    "name": "ICE Breaker v2.1",
    "type": "hacking_tool",
    "category": "security",
    "adventure": "A Change of Heart",
    
    "description": "A black-market decryption utility...",
    
    "style": {
        "theme": "hacker",
        "primaryColor": "#ff0066",
        "animatedBackground": true,
        "matrixRain": true
    },
    
    "interface": {
        "type": "minigame",
        "display": "fullscreen",
        "header": "╔══ ICE BREAKER ══╗"
    },
    
    "mechanics": {
        "type": "skill_challenge",
        "skill": "Netrunning",
        "base_difficulty": 12,
        "attempts": 3,
        
        "phases": [
            {
                "name": "Pattern Analysis",
                "difficulty_modifier": 0,
                "success_text": "Pattern identified.",
                "failure_text": "Pattern unclear."
            }
        ],
        
        "success_effect": {
            "text": "ACCESS GRANTED",
            "unlocks_access": true,
            "sets_flag": "ice_breaker_success"
        },
        
        "failure_effect": {
            "text": "LOCKOUT",
            "stress_damage": 1,
            "triggers_alarm": true
        }
    },
    
    "visual_sequence": {
        "enabled": true,
        "frames": [
            { "text": "Initializing...", "delay": 500 }
        ]
    },
    
    "found_in": {
        "terminals": ["oakhaven_admin_terminal"],
        "items": []
    },
    
    "gmNotes": "Private notes for GM"
}
```

### 25.4 Program Types

| Type | Description |
|------|-------------|
| `utility` | System utilities (file browser, etc.) |
| `hacking_tool` | Security bypass tools |
| `application` | General applications |
| `game` | In-universe games |
| `diagnostic` | System diagnostic tools |

### 25.5 Program Categories

| Category | Description |
|----------|-------------|
| `system` | Core system utilities |
| `security` | Hacking and security tools |
| `communication` | Messaging and chat apps |
| `entertainment` | Games and media |
| `medical` | Medical system access |
| `industrial` | Factory/facility control |

### 25.6 Mechanics Types

| Type | Description |
|------|-------------|
| `skill_challenge` | Multi-phase skill check |
| `document_browser` | View documents |
| `navigation` | Filesystem navigation |
| `puzzle` | Logic puzzle |
| `minigame` | Interactive game |

---

## 26. API Endpoints

### 26.1 Terminal Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/terminals` | GET | List all terminals |
| `/api/terminals/:id` | GET | Get specific terminal |

### 26.2 Document Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents` | GET | List all documents |
| `/api/documents/:id` | GET | Get specific document |

### 26.3 Program Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/programs` | GET | List all programs |
| `/api/programs/:id` | GET | Get specific program |

### 26.4 Export Endpoint

The `/api/export/:adventureId` endpoint now includes:
- `terminals` - All terminal definitions
- `documents` - All in-game documents
- `programs` - All terminal programs

---

## 27. Onboarding System

> **Status:** PLANNED (2024-12-06)

### 27.1 Overview

The onboarding system guides new players through initial setup before entering the game world. It handles audio calibration, visual calibration, and character creation in a cohesive, immersive flow.

**Entry Points:**
- **Future:** Automatic after Light Deck startup screen (first-time users)
- **Current:** Manual via `/onboard` command in chat

### 27.2 Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONBOARDING SEQUENCE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 1: AUDIO CALIBRATION                                      │
│  ├── Play test music track (looping)                            │
│  ├── Music volume slider (0-100%)                               │
│  ├── SFX volume slider (0-100%)                                 │
│  ├── [Test SFX] button → plays random sound effect              │
│  └── [Continue] when satisfied                                   │
│                                                                  │
│  Phase 2: VISUAL CALIBRATION                                     │
│  ├── Load test image with gradient/detail zones                 │
│  ├── Brightness slider                                          │
│  ├── Contrast slider                                            │
│  ├── Instructions: "Adjust until you can see all 10 bars"       │
│  └── [Continue] when satisfied                                   │
│                                                                  │
│  Phase 3: CHARACTER CREATION                                     │
│  ├── Identity (name, handle, pronouns)                          │
│  ├── Background selection                                       │
│  ├── Attributes (8 points)                                      │
│  ├── Skills (20 points)                                         │
│  ├── Stunts (2 picks)                                           │
│  ├── Flaws (optional, +1 stunt each)                            │
│  ├── Cyberware (5,000¢ budget)                                  │
│  ├── Contacts (3 NPCs)                                          │
│  └── Final details                                               │
│                                                                  │
│  Phase 4: DEBT & EQUIPMENT SELECTION                             │
│  ├── Display starting debt (based on background)                │
│  ├── Show base equipment loadout                                │
│  ├── Offer optional "debt packages" for extra gear              │
│  │   └── Each package increases starting debt                   │
│  ├── Generate identity documents                                │
│  └── [Confirm] to finalize character                            │
│                                                                  │
│  Phase 5: DOCUMENT PRESENTATION                                  │
│  ├── Display generated ID documents one by one                  │
│  ├── Corporate ID card                                          │
│  ├── SIN (System Identification Number)                         │
│  ├── Debt statement from creditor                               │
│  ├── Equipment manifest                                         │
│  └── [Enter the Sprawl] → transition to first scene             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 27.3 Audio Calibration Phase

**Test Music:**
- Plays a track from `/music/` folder (e.g., "02. New game # Load game.mp3")
- Loops until phase complete

**Test SFX Pool:**
- `Audio.SFX.beep()` - Standard beep
- `Audio.SFX.keystroke()` - Keyboard click
- `Audio.SFX.errorBuzz()` - Error sound
- `Audio.SFX.glitchCrackle()` - Glitch effect
- `Terminal_Startup.mp3` - Boot sound

**UI Elements:**
```
╔══════════════════════════════════════════════════════════════╗
║  AUDIO CALIBRATION                                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  MUSIC VOLUME                                                 ║
║  [████████████░░░░░░░░] 60%                                  ║
║                                                               ║
║  SFX VOLUME                                                   ║
║  [██████████████░░░░░░] 70%                                  ║
║                                                               ║
║  [TEST SFX]                                                   ║
║                                                               ║
║  Adjust volumes until comfortable, then continue.             ║
║                                                               ║
║  [CONTINUE]                                                   ║
╚══════════════════════════════════════════════════════════════╝
```

### 27.4 Visual Calibration Phase

**Test Image Requirements:**
- Gradient bar from pure black to pure white (10 steps)
- Fine detail zone (thin lines, small text)
- High contrast zone (sharp edges)
- Low contrast zone (subtle gradients)

**Calibration Instructions:**
1. "Adjust BRIGHTNESS until you can barely see the darkest bar"
2. "Adjust CONTRAST until you can distinguish all 10 bars"
3. "You should be able to read the small text below"

**UI Elements:**
```
╔══════════════════════════════════════════════════════════════╗
║  VISUAL CALIBRATION                                           ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │  [TEST IMAGE WITH GRADIENT BARS]                      │    ║
║  │  ░░▒▒▓▓██████████████████████████████████████████    │    ║
║  │  1  2  3  4  5  6  7  8  9  10                        │    ║
║  │                                                       │    ║
║  │  Fine detail text: "The quick brown fox..."           │    ║
║  └──────────────────────────────────────────────────────┘    ║
║                                                               ║
║  BRIGHTNESS                                                   ║
║  [████████████░░░░░░░░] 60%                                  ║
║                                                               ║
║  CONTRAST                                                     ║
║  [██████████████░░░░░░] 70%                                  ║
║                                                               ║
║  [CONTINUE]                                                   ║
╚══════════════════════════════════════════════════════════════╝
```

### 27.5 Debt & Equipment System

**Starting Debt by Background:**

| Background | Base Debt | Reason |
|------------|-----------|--------|
| Street Kid | 8,000¢ | Loan shark, protection money |
| Corporate | 15,000¢ | Golden parachute clawback |
| Techie | 10,000¢ | Workshop equipment loan |
| Nomad | 6,000¢ | Vehicle repairs, fuel debt |
| Medic | 12,000¢ | Medical school loans |
| Enforcer | 9,000¢ | Weapons, armor financing |

**Debt Packages (Optional):**

| Package | Extra Gear | Added Debt |
|---------|------------|------------|
| **Survival Kit** | Med kit, 3 stim packs, trauma patch | +2,000¢ |
| **Street Arsenal** | Heavy pistol, 50 rounds, knife | +3,000¢ |
| **Tech Toolkit** | Advanced toolkit, diagnostic scanner | +2,500¢ |
| **Chrome Upgrade** | One additional cyberware piece (up to 3,000¢ value) | +4,000¢ |
| **Fixer's Favor** | One free contact upgrade (Neutral → Ally) | +1,500¢ |
| **Clean SIN** | Legitimate identity, no criminal flags | +5,000¢ |

**Debt Consequences:**
- Creditors may appear as NPCs during adventures
- High debt = more desperate jobs, worse pay
- Debt can be paid down with credits earned
- Defaulting triggers "collection" encounters

### 27.6 Generated Documents

After character creation, the system generates immersive identity documents:

**Corporate ID Card:**
```
╔══════════════════════════════════════════════════════════════╗
║  MERIDIAN SYSTEMS CORP.                                       ║
║  EMPLOYEE IDENTIFICATION                                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  NAME: [Character Name]                                       ║
║  HANDLE: [Street Name]                                        ║
║  SIN: [Generated Number]                                      ║
║  CLEARANCE: LEVEL 1 (CONTRACTOR)                             ║
║                                                               ║
║  ISSUED: [Date]                                               ║
║  EXPIRES: [Date + 1 year]                                     ║
║                                                               ║
║  [BARCODE/QR PLACEHOLDER]                                     ║
╚══════════════════════════════════════════════════════════════╝
```

**Debt Statement:**
```
╔══════════════════════════════════════════════════════════════╗
║  NIGHTCITY CREDIT UNION                                       ║
║  ACCOUNT STATEMENT                                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ACCOUNT HOLDER: [Character Name]                             ║
║  ACCOUNT #: [Generated]                                       ║
║                                                               ║
║  OUTSTANDING BALANCE: [Total Debt]¢                          ║
║                                                               ║
║  BREAKDOWN:                                                   ║
║  - Base obligation: [Base Debt]¢                             ║
║  - Equipment financing: [Package Debt]¢                      ║
║  - Interest (12% APR): [Interest]¢                           ║
║                                                               ║
║  MINIMUM PAYMENT DUE: [10% of total]¢                        ║
║  DUE DATE: [30 days from now]                                ║
║                                                               ║
║  ⚠ FAILURE TO PAY MAY RESULT IN ASSET SEIZURE               ║
╚══════════════════════════════════════════════════════════════╝
```

### 27.7 State Management

**OnboardingManager State:**
```javascript
{
    phase: 'audio' | 'visual' | 'character' | 'debt' | 'documents' | 'complete',
    
    audio: {
        musicVolume: 0.5,
        sfxVolume: 0.7,
        testTrackPlaying: false
    },
    
    visual: {
        brightness: 1.0,
        contrast: 1.0
    },
    
    character: {
        // Full character creation state
        // See CHARACTER-CREATION-PLAN.md
    },
    
    debt: {
        baseDebt: 0,
        packages: [],
        totalDebt: 0
    },
    
    documents: {
        generated: false,
        viewed: []
    }
}
```

### 27.8 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/onboarding/start` | POST | Initialize onboarding session |
| `/api/onboarding/audio` | POST | Save audio preferences |
| `/api/onboarding/visual` | POST | Save visual preferences |
| `/api/onboarding/character` | POST | Save character data |
| `/api/onboarding/debt` | POST | Save debt selections |
| `/api/onboarding/complete` | POST | Finalize and create character |

### 27.9 Files

| File | Purpose |
|------|---------|
| `public/js/managers/onboarding-manager.js` | Onboarding flow state machine |
| `public/assets/onboarding/test-image.png` | Visual calibration test image |
| `assets/templates/documents/` | Document templates for generation |

### 27.10 Future Enhancements

- [ ] Skip onboarding for returning players (detect saved character)
- [ ] Import character from JSON file
- [ ] Randomize character option ("Roll the dice")
- [ ] Pre-generated character templates
- [ ] Tutorial mode after onboarding

---

*"The world is seen through a custom decryption filter used to scan ancient, rotting infrastructure."*
