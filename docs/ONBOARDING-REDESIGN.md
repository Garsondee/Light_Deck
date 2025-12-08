# Onboarding System Redesign

## Overview

The onboarding system is being redesigned from a purely terminal-command-driven flow to a **hybrid ASCII form-based system** that supports both mouse/click interaction AND terminal commands.

### Core Philosophy
- **Diegetic**: Everything still looks like a terminal/CRT interface
- **Dual Input**: Mouse clicks AND keyboard commands both work
- **Visual**: ASCII art forms, sliders, and previews instead of just text prompts
- **Accessible**: Tab navigation, clear visual focus states

---

## Screen Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. BOOT SEQUENCE                                               │
│     - Fade to black                                             │
│     - ASCII "Light Deck" logo animation                         │
│     - Loading bar / initialization text                         │
│     - "Press any key to continue" or auto-advance               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. AUDIO CALIBRATION                                           │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │  AUDIO CONFIGURATION                                    │ │
│     │                                                         │ │
│     │  Music Volume:  [-] ████████░░░░░░░░ [+]  50%          │ │
│     │  SFX Volume:    [-] ██████████████░░ [+]  70%          │ │
│     │                                                         │ │
│     │  [TEST SFX]                                             │ │
│     │                                                         │ │
│     │  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█  (audio visualizer)           │ │
│     │                                                         │ │
│     │  ─────────────────────────────────────────────────────  │ │
│     │  Terminal: music <0-100> | sfx <0-100> | test           │ │
│     │                                                         │ │
│     │                              [CONTINUE]                 │ │
│     └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. VISUAL CALIBRATION                                          │
│     - Brightness/contrast sliders                               │
│     - ASCII test pattern                                        │
│     - Same dual-input approach                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. IDENTITY FORM                                               │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │  ╔═══════════════════════════════════════════════════╗  │ │
│     │  ║  IDENTITY REGISTRATION                            ║  │ │
│     │  ╠═══════════════════════════════════════════════════╣  │ │
│     │  ║                                                   ║  │ │
│     │  ║  Legal Name:  [________________________]          ║  │ │
│     │  ║                                                   ║  │ │
│     │  ║  Street Handle: [________________________]        ║  │ │
│     │  ║                                                   ║  │ │
│     │  ║  Pronouns:    ( ) he/him  ( ) she/her             ║  │ │
│     │  ║               (•) they/them  ( ) custom           ║  │ │
│     │  ║                                                   ║  │ │
│     │  ╚═══════════════════════════════════════════════════╝  │ │
│     │                                                         │ │
│     │  Terminal: name <name> | handle <handle> | pronouns ... │ │
│     │                                                         │ │
│     │                              [CONTINUE]                 │ │
│     └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. PORTRAIT SELECTION                                          │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │  SELECT YOUR APPEARANCE                                 │ │
│     │                                                         │ │
│     │         ┌─────────────────────────┐                     │ │
│     │         │                         │                     │ │
│     │         │   (Portrait Preview)    │                     │ │
│     │         │   Rendered as ASCII     │                     │ │
│     │         │                         │                     │ │
│     │         │                         │                     │ │
│     │         └─────────────────────────┘                     │ │
│     │                                                         │ │
│     │    [<]      Portrait 3 of 12      [>]                   │ │
│     │            "Street Samurai"                             │ │
│     │                                                         │ │
│     │                   [ACCEPT]                              │ │
│     └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  6. BACKGROUND SELECTION                                        │
│     - List of backgrounds with ASCII icons                      │
│     - Click to select, shows details panel                      │
│     - Terminal: background <name>                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  7. DEBT PACKAGES                                               │
│     - Checkboxes for optional packages                          │
│     - Running total display                                     │
│     - Terminal: add <n> | remove <n>                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  8. DOCUMENT GENERATION                                         │
│     - Animated document creation                                │
│     - Final summary                                             │
│     - [ENTER THE SPRAWL] button                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### New Components

#### 1. `OnboardingScreenManager` (`public/js/managers/onboarding-screen-manager.js`)
- Manages the full-screen onboarding overlay
- Handles screen transitions (fade in/out)
- Coordinates between screens
- Renders to a dedicated Three.js plane (above scene, below chat)

#### 2. `ASCIIFormRenderer` (`public/js/rendering/ascii-form-renderer.js`)
- Renders ASCII-styled form elements to canvas
- Supports:
  - **Text inputs**: `[_______________]` with cursor
  - **Buttons**: `[CONTINUE]` with hover/active states
  - **Sliders**: `[-] ████░░░░ [+]` 
  - **Radio buttons**: `( ) Option  (•) Selected`
  - **Checkboxes**: `[ ] Unchecked  [X] Checked`
- Hit-testing for mouse clicks
- Tab order for keyboard navigation
- Focus states (highlighted border)

#### 3. `AudioVisualizerRenderer` (`public/js/rendering/audio-visualizer.js`)
- Real-time audio visualization using Web Audio API
- Renders as ASCII bar graph: `▁▂▃▄▅▆▇█▇▆▅▄▃▂▁`
- Responds to currently playing music

#### 4. `PortraitPreviewRenderer` (`public/js/rendering/portrait-preview.js`)
- Loads portrait image
- Converts to ASCII art for preview (using existing CRT shader concepts)
- Displays in a bordered frame

### Screen Classes

Each screen is a self-contained class:

```javascript
class AudioCalibrationScreen {
    constructor(formRenderer, audioVisualizer) { }
    
    // Lifecycle
    enter() { }      // Called when screen becomes active
    exit() { }       // Called when leaving screen
    update(dt) { }   // Called each frame
    render(ctx) { }  // Render to canvas
    
    // Input
    handleClick(x, y) { }
    handleKeyDown(event) { }
    handleCommand(cmd, args) { }  // Terminal command passthrough
    
    // State
    isComplete() { }  // Can we proceed?
    getData() { }     // Get form data
}
```

### Integration with Existing System

1. **OnboardingManager** becomes a coordinator:
   - Manages screen flow
   - Delegates rendering to OnboardingScreenManager
   - Still handles terminal commands (passes to active screen)
   - Maintains character state

2. **TerminalManager** integration:
   - Terminal commands still work during onboarding
   - Commands are routed to active screen's `handleCommand()`
   - Terminal output appears below the form (scrolling log area)

3. **Auto-start logic**:
   - On app load, check if user is GM (via SyncManager)
   - Check if active character exists (localStorage)
   - If not GM and no character → auto-start onboarding

---

## ASCII Art Assets

### Light Deck Logo (Boot Screen)
```
    ██╗     ██╗ ██████╗ ██╗  ██╗████████╗
    ██║     ██║██╔════╝ ██║  ██║╚══██╔══╝
    ██║     ██║██║  ███╗███████║   ██║   
    ██║     ██║██║   ██║██╔══██║   ██║   
    ███████╗██║╚██████╔╝██║  ██║   ██║   
    ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   
                                          
    ██████╗ ███████╗ ██████╗██╗  ██╗
    ██╔══██╗██╔════╝██╔════╝██║ ██╔╝
    ██║  ██║█████╗  ██║     █████╔╝ 
    ██║  ██║██╔══╝  ██║     ██╔═██╗ 
    ██████╔╝███████╗╚██████╗██║  ██╗
    ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝
```

### Form Element Characters
- Borders: `╔ ╗ ╚ ╝ ═ ║ ╠ ╣ ╬`
- Input box: `[ ]`
- Slider fill: `█`
- Slider empty: `░`
- Radio selected: `(•)`
- Radio empty: `( )`
- Checkbox checked: `[X]`
- Checkbox empty: `[ ]`
- Visualizer bars: `▁ ▂ ▃ ▄ ▅ ▆ ▇ █`

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Create `ASCIIFormRenderer` with basic elements
- [ ] Create `OnboardingScreenManager` 
- [ ] Create boot screen with logo

### Phase 2: Audio/Visual Screens
- [ ] Audio calibration screen with sliders
- [ ] Audio visualizer component
- [ ] Visual calibration screen

### Phase 3: Character Creation Screens
- [ ] Identity form screen
- [ ] Portrait picker with preview
- [ ] Background selection screen

### Phase 4: Completion
- [ ] Debt package selection
- [ ] Document generation screen
- [ ] Auto-start logic for new players

### Phase 5: Polish
- [ ] Animations and transitions
- [ ] Sound effects for UI interactions
- [ ] Accessibility improvements

---

## Terminal Command Compatibility

All existing terminal commands continue to work:

| Screen | Commands |
|--------|----------|
| Audio | `music <0-100>`, `sfx <0-100>`, `test` |
| Visual | `brightness <50-150>`, `contrast <50-150>` |
| Identity | `name <name>`, `handle <handle>`, `pronouns <pronouns>` |
| Portrait | `portrait <n>`, `<n>` (number only) |
| Background | `background <name>`, `<n>` |
| Debt | `add <n>`, `remove <n>` |
| All | `continue`, `cancel`, `back` |

---

## Mouse Interaction Model

1. **Click Detection**: 
   - OnboardingScreenManager captures mouse events on its canvas
   - Converts screen coords to canvas coords
   - Passes to active screen's `handleClick(x, y)`
   - Screen checks hit boxes for form elements

2. **Hover States**:
   - Buttons highlight on hover
   - Cursor changes to pointer over clickable elements

3. **Focus Management**:
   - Clicking an input focuses it
   - Tab cycles through focusable elements
   - Focused element has highlighted border

4. **Keyboard in Focused Input**:
   - Typing goes to focused text input
   - Enter submits/advances
   - Escape blurs input

---

## Notes

- The terminal log area at the bottom of each screen shows command hints and feedback
- All screens maintain the CRT aesthetic (scanlines, glow, slight curvature)
- Portrait preview uses the same ASCII conversion as the main scene viewer
- Audio visualizer updates at 30fps for smooth animation
