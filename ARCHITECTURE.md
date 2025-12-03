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

### 9.2 Server State

```javascript
// Persisted to JSON file on server
const GameState = {
  scenes: [ /* Scene objects */ ],
  files: [ /* File objects */ ],
  currentScene: "safehouse_01",
  chatLog: [ /* Recent messages */ ],
  unlockedFiles: [],
  decryptedFiles: []
};
```

**Persistence:** Server saves to `data/game-state.json`. Clients sync via WebSocket.

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
1. [ ] Set up Node.js + Express server
2. [ ] Configure Nginx reverse proxy
3. [ ] Set up PM2 process manager
4. [ ] Basic WebSocket connection (Socket.io)
5. [ ] GM authentication endpoint

### Phase 1: Foundation
6. [ ] Project scaffolding (HTML/CSS/JS structure)
7. [ ] Three.js scene setup (camera, renderer, plane)
8. [ ] Main layout: viewing area + chat panel
9. [ ] Basic dice roller with output to chat log
10. [ ] GM access button with password prompt

### Phase 2: Visual Feed (Three.js)
11. [ ] ASCII character atlas texture
12. [ ] Basic ASCII shader (luminance → character)
13. [ ] Shimmer effect (time-based character swap)
14. [ ] Glitch effect (UV displacement, corruption)
15. [ ] Scene switching with transition animation
16. [ ] Color palette uniforms (amber/green/white)

### Phase 3: Terminal System
17. [ ] Terminal overlay UI (DOM-based)
18. [ ] Command parser (help, ls, cat, clear, exit)
19. [ ] File system simulation
20. [ ] Decrypt mechanic (progress bar or mini-puzzle)

### Phase 4: Audio System
21. [ ] Web Audio API setup
22. [ ] Procedural SFX functions (keystroke, beep, glitch)
23. [ ] MIDI player integration (Tone.js)
24. [ ] Scene ambience generators
25. [ ] Audio controls in UI

### Phase 5: GM Tools
26. [ ] GM control panel UI
27. [ ] Scene editor (create, image upload, settings)
28. [ ] File editor (create, edit content, encryption)
29. [ ] Live trigger controls (glitch, message, scene change)
30. [ ] Audio controls (play/stop tracks)

### Phase 6: Polish & Sync
31. [ ] WebSocket state synchronization
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
4. **Save States:** Allow multiple "save slots" for different sessions?
5. **Decrypt Mini-Game:** What form should this take? (Typing challenge, pattern match, simple timer?)
6. **MIDI Source:** Create original tracks or use royalty-free retro MIDI?
7. **Domain/SSL:** What domain will this be served from? (Needed for Nginx config)

---

## 15. Revision History

| Date | Version | Notes |
|------|---------|-------|
| 2024-12-03 | 0.1 | Initial architecture document |
| 2024-12-03 | 0.2 | Added server infrastructure, Three.js rendering, audio system |

---

*"The world is seen through a custom decryption filter used to scan ancient, rotting infrastructure."*
