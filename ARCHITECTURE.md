# The Optic — Architecture Document
## Diegetic VTT Interface for "A Change of Heart"

---

## 1. Project Overview

**Project Name:** Light Deck  
**Target Users:** 1 GM + 1 Player (Netrunner/Programmer character)  
**Platform:** Web / JavaScript + Three.js  
**Hosting:** Self-hosted Ubuntu VM (Node.js backend)  
**Core Concept:** A diegetic "Command Line" and "Augmented Reality" viewer. The player interacts with the game world exclusively through this screen, which simulates their cybernetic eyes and hacking deck. The GM controls scenes, content, and narrative flow from behind a password-protected interface.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        THE OPTIC                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────┐  ┌──────────────────────┐  │
│  │                                 │  │     CHAT LOG         │  │
│  │      MAIN VIEWING AREA          │  │  (Rolls & Results)   │  │
│  │      (ASCII Visual Feed)        │  │                      │  │
│  │                                 │  │                      │  │
│  │   - Scene Graphics              │  │  - Roll History      │  │
│  │   - Terminal Overlay (toggle)   │  │  - GM Messages       │  │
│  │   - Shimmer/Glitch Effects      │  │  - System Output     │  │
│  │                                 │  │                      │  │
│  │                                 │  ├──────────────────────┤  │
│  │                                 │  │   DICE BUTTONS       │  │
│  │                                 │  │  [d4][d6][d8][d10]   │  │
│  │                                 │  │  [d12][d20][d100]    │  │
│  │                                 │  │  [+mod][-mod][ROLL]  │  │
│  └─────────────────────────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  [GM ACCESS] ← Password Protected                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. User Roles & Access

### 3.1 Player Mode (Default)
- Views the main ASCII visual feed
- Interacts with the terminal overlay (when active)
- Rolls dice via the dice panel
- Reads chat log / roll history

### 3.2 GM Mode (Password Protected)
- **Access:** Button in corner → simple password prompt
- **Security Note:** Basic protection only; system will run behind professional auth layer
- **Capabilities:**
  - Create/edit scenes
  - Upload and configure scene images
  - Manage terminal file contents
  - Trigger visual effects (glitches, transitions)
  - Send messages to chat log
  - Control which files are "discoverable" or "decrypted"

---

## 4. Core Components

### 4.1 Main Viewing Area (The Visual Feed)

The dominant screen element. Displays the current scene as processed imagery.

#### Visual Philosophy
- **Source Material:** High-contrast images (Midjourney or similar) with "chiaroscuro" 3-shade palettes
- **The Filter:** ASCII shader — image rendered entirely using text characters
- **Color Palette:** Monochrome (Amber/Green on Black) or strict 3-bit color

#### The "Living" Text Effects
| Effect | Description | Trigger |
|--------|-------------|---------|
| **Shimmer** | Characters within same luminance range randomly swap every few frames | Constant (ambient) |
| **Glitch** | Horizontal displacement, character corruption, ripple distortion | GM trigger, damage, narrative beats |
| **Wipe/Recompile** | ASCII "rebuilds" when transitioning scenes | Scene change |

#### Technical Decision: Three.js Rendering

**Decision:** Use Three.js for the visual feed rendering.

| Approach | Pros | Cons |
|----------|------|------|
| ~~HTML5 Canvas~~ | Simple 2D API | Limited shader support, manual everything |
| ~~DOM Grid~~ | Easy styling | Poor performance at scale |
| **Three.js** | GPU shaders, WebGL power, familiar to dev | Heavier dependency, overkill for simple 2D |

**Rationale:** Three.js provides:
- Custom GLSL shaders for the ASCII effect (runs on GPU)
- Built-in animation loop and timing
- Easy texture loading for scene images
- Future-proofing for 3D effects if desired
- Developer familiarity

**Implementation:**
- Render scene image to a plane geometry
- Apply custom ASCII shader as material
- Shimmer/glitch effects as shader uniforms
- Terminal overlay remains DOM-based (HTML/CSS)

---

### 4.2 Chat Log Panel (Right Side)

Persistent sidebar displaying:
- **Roll Results:** Dice outcomes with timestamps
- **GM Messages:** Narrative text, prompts
- **System Output:** Terminal command results (mirrored)
- **Player Actions:** Log of significant interactions

#### Dice Roller (Bottom of Chat Panel)
- **Standard Dice:** d4, d6, d8, d10, d12, d20, d100
- **Modifier Input:** +/- numeric field
- **Multi-Dice:** Click multiple dice buttons to queue, then roll
- **Roll Button:** Executes queued dice + modifier, outputs to chat log

```
Example Output:
[14:32] ROLL: 2d6 + 3 → [4, 6] + 3 = 13
```

---

### 4.3 Terminal Overlay (The Cyberdeck)

A toggleable overlay window simulating a UNIX-like CLI.

#### Activation
- Player clicks terminal icon or GM enables it for a scene
- Overlays the visual feed (semi-transparent or windowed)

#### Command Set (Initial)
| Command | Function |
|---------|----------|
| `help` | Lists available commands |
| `ls` / `dir` | Lists files in current node |
| `cat [file]` / `open [file]` | Displays text content |
| `decrypt [file]` | Triggers mini-puzzle or progress bar |
| `clear` | Wipes terminal screen |
| `exit` | Closes terminal, returns to AR view |

#### Future Commands (Planned)
- `connect [node]` — Navigate network topology
- `scan` — Reveal hidden files or details in scene
- `inject [payload]` — Trigger scene changes
- `toggle_filter` — Hidden command to disable ASCII effect (narrative climax)

---

### 4.4 GM Control Panel

Accessed via password-protected button. Provides:

#### Scene Management
- **Scene List:** Create, edit, delete scenes
- **Image Upload:** Attach source image to scene
- **ASCII Settings:** Adjust character set, shimmer intensity, color palette per scene

#### Content Management
- **File Editor:** Create/edit terminal files (name, content, encrypted status)
- **File Visibility:** Toggle which files appear in `ls` output
- **Decrypt Triggers:** Set what happens on successful decrypt

#### Live Controls
- **Trigger Glitch:** Manual glitch effect button
- **Send Message:** Push text to chat log
- **Change Scene:** Instant or animated transition
- **Toggle Terminal:** Enable/disable terminal for player

---

## 5. Server Infrastructure

### 5.1 Deployment Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    UBUNTU VM SERVER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐     ┌─────────────────────────────────┐   │
│   │   NGINX     │────▶│      Node.js Application        │   │
│   │  (Reverse   │     │                                 │   │
│   │   Proxy)    │     │  - Express.js static server     │   │
│   │             │     │  - WebSocket server (Socket.io) │   │
│   │  Port 80/443│     │  - API endpoints                │   │
│   └─────────────┘     │  - Port 3000 (internal)         │   │
│                       └─────────────────────────────────┘   │
│                                    │                        │
│                                    ▼                        │
│                       ┌─────────────────────────────────┐   │
│                       │      File System Storage        │   │
│                       │  - Scene images                 │   │
│                       │  - MIDI files                   │   │
│                       │  - Game state JSON              │   │
│                       └─────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|--------|
| **Reverse Proxy** | Nginx | SSL termination, static caching, URL routing |
| **Backend** | Node.js + Express | Serve app, API, WebSocket |
| **Real-time Sync** | Socket.io | GM ↔ Player state synchronization |
| **Frontend** | Vanilla JS + Three.js | Rendering, UI, game logic |
| **Process Manager** | PM2 | Keep Node.js running, auto-restart |

### 5.3 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|--------|
| `/` | GET | Serve main application |
| `/api/auth/gm` | POST | Validate GM password |
| `/api/state` | GET | Fetch current game state |
| `/api/state` | POST | Save game state (GM only) |
| `/api/scenes` | GET/POST | Scene CRUD operations |
| `/api/assets/upload` | POST | Upload scene images (GM only) |
| `/ws` | WebSocket | Real-time sync channel |

### 5.4 WebSocket Events

| Event | Direction | Payload |
|-------|-----------|--------|
| `scene:change` | GM → Player | `{ sceneId, transition }` |
| `chat:message` | Both | `{ sender, text, timestamp }` |
| `roll:result` | Both | `{ dice, results, total }` |
| `effect:trigger` | GM → Player | `{ type: "glitch", intensity }` |
| `terminal:toggle` | GM → Player | `{ enabled: boolean }` |
| `file:unlock` | GM → Player | `{ fileId }` |
| `audio:play` | GM → Player | `{ trackId, type }` |
| `audio:stop` | GM → Player | `{ trackId }` |

### 5.5 Security Considerations

- **GM Password:** Stored as environment variable, checked server-side
- **Session:** Simple token stored in localStorage after GM auth
- **Upstream Auth:** System sits behind external auth layer (not our concern)
- **HTTPS:** Nginx handles SSL certificates (Let's Encrypt)

---

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

#### CharacterSheet
```javascript
{
    id: "pc_netrunner",
    name: "Player Character",
    type: "pc", // "pc" | "npc"
    
    // Core Stats
    stats: {
        body: 5,
        reflexes: 7,
        tech: 8,
        cool: 6,
        intelligence: 7,
        willpower: 5,
        luck: 4,
        move: 6,
        empathy: 5
    },
    
    // Derived Stats
    derived: {
        maxHp: 35,
        currentHp: 35,
        maxHumanity: 50,
        currentHumanity: 42,
        deathSave: 5,
        seriouslyWoundedThreshold: 18
    },
    
    // Resources
    resources: {
        luck: { current: 4, max: 4 },
        ammo: { pistol: 12, smg: 30 },
        eddies: 500
    },
    
    // Skills (partial list)
    skills: {
        interface: 6,
        electronics: 5,
        hacking: 7,
        handgun: 4,
        evasion: 5,
        perception: 4,
        stealth: 3
    },
    
    // Inventory
    inventory: [
        { id: "cyberdeck_basic", name: "Basic Cyberdeck", equipped: true },
        { id: "pistol_medium", name: "Medium Pistol", equipped: true, ammo: 12 }
    ],
    
    // Conditions/Status Effects
    conditions: [],
    
    // Cyberware
    cyberware: [
        { id: "neural_link", name: "Neural Link", humanity_cost: 2 },
        { id: "optic_basic", name: "Cybereye (Basic)", humanity_cost: 2 }
    ]
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
1. [ ] Create `TextRenderer` module
2. [ ] Create `RenderManager` module
3. [ ] Consolidate animation loop
4. [ ] Clean up InputManager (single handler)

### Phase B: Terminal Migration
5. [ ] Create `TerminalManager`
6. [ ] Canvas-based terminal rendering
7. [ ] Caret as drawn element
8. [ ] Terminal scrolling
9. [ ] Remove PhosphorText/DOM terminal

### Phase C: UI Migration
10. [ ] Create `ChatManager`
11. [ ] Migrate dice panel
12. [ ] Remove DOM sidebar
13. [ ] Raycasting for clicks

### Phase D: Post-Processing
14. [ ] Multi-pass bloom
15. [ ] CRT distortion separation
16. [ ] Unified phosphor glow
17. [ ] Performance optimization

### Phase E: Game Systems (After UI Migration)
18. [ ] Character system
19. [ ] Combat system
20. [ ] GM tools
21. [ ] WebSocket sync

---

## 18. Revision History

| Date | Version | Notes |
|------|---------|-------|
| 2024-12-03 | 0.1 | Initial architecture document |
| 2024-12-03 | 0.2 | Added server infrastructure, Three.js rendering, audio system |
| 2024-12-04 | 0.3 | Added Manager System Architecture, Character/Combat systems, GM tools planning, Animation system design |
| 2024-12-04 | 0.4 | Attempted Phase 7 implementation (EventBus, AnimationManager, DisplayManager) |
| 2024-12-04 | **1.0** | **CRITICAL DECISION: Full Three.js UI Migration.** Abandoned hybrid DOM/Three.js approach. All UI will render through Three.js with canvas-based text. Complete architectural overhaul documented in Section 16. |

---

*"The world is seen through a custom decryption filter used to scan ancient, rotting infrastructure."*
