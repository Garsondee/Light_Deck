# Testing Procedure

This document defines manual and automated testing procedures for Light Deck VTT. Each section is structured to be convertible to Playwright test cases.

---

## Table of Contents

1. [Onboarding System](#1-onboarding-system)
2. [Terminal Mode](#2-terminal-mode)
3. [Chat System](#3-chat-system)
4. [Audio System](#4-audio-system)
5. [Scene Viewer](#5-scene-viewer)
6. [Multiplayer Sync](#6-multiplayer-sync)
7. [API Endpoints](#7-api-endpoints)
8. [GM Overlay](#8-gm-overlay)

---

## Test Environment Setup

```bash
# Start the server
npm run start

# Run all tests
npm run test

# Run specific test file
npx playwright test tests/smoke.spec.ts
```

**Base URL:** `http://localhost:3000`

---

## 1. Onboarding System

The onboarding system guides new players through character creation via the terminal interface.

### 1.1 Starting Onboarding

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `ONB-001` | Start onboarding from chat | Type `/onboard` in chat | Terminal mode activates, welcome sequence displays |
| `ONB-002` | Start with `/create` alias | Type `/create` in chat | Same as ONB-001 |
| `ONB-003` | Start with `/newchar` alias | Type `/newchar` in chat | Same as ONB-001 |
| `ONB-004` | Prevent double-start | Start onboarding, then type `/onboard` again | Error message: "Onboarding already in progress" |
| `ONB-005` | Start from terminal mode | Enter terminal mode, type `onboard` | Onboarding starts without mode switch |

#### Playwright Selectors
```typescript
// Chat input
const chatInput = page.locator('#chat-input');

// Terminal canvas (for visual verification)
const terminalCanvas = page.locator('#terminal-canvas');

// Check terminal visibility
await expect(terminalCanvas).toBeVisible();
```

---

### 1.2 Phase 1: Audio Calibration

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `ONB-010` | Audio phase displays | Complete welcome sequence | "PHASE 1: AUDIO CALIBRATION" header appears |
| `ONB-011` | Set music volume | Type `music 75` | "Music volume: 75%" confirmation |
| `ONB-012` | Set SFX volume | Type `sfx 50` | "SFX volume: 50%" confirmation |
| `ONB-013` | Test SFX playback | Type `test` | "Playing: [sfx_name]" and audio plays |
| `ONB-014` | Volume bounds (low) | Type `music 0` | Volume set to 0% |
| `ONB-015` | Volume bounds (high) | Type `music 100` | Volume set to 100% |
| `ONB-016` | Invalid volume | Type `music abc` | Falls back to default (50%) |
| `ONB-017` | Continue to next phase | Type `continue` | Advances to Visual Calibration |
| `ONB-018` | Test music plays | Enter audio phase | Background music starts playing |
| `ONB-019` | Test music stops | Leave audio phase | Background music stops |

#### Audio Commands (Only Valid in Audio Phase)
- `music <0-100>` - Set music volume
- `sfx <0-100>` - Set SFX volume  
- `test` - Play random test SFX
- `continue` - Proceed to next phase
- `cancel` - Exit onboarding

---

### 1.3 Phase 2: Visual Calibration

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `ONB-020` | Visual phase displays | Continue from audio phase | "PHASE 2: VISUAL CALIBRATION" header |
| `ONB-021` | Test pattern visible | Enter visual phase | ASCII gradient pattern displays |
| `ONB-022` | Set brightness | Type `brightness 120` | "Brightness: 120%" confirmation |
| `ONB-023` | Set contrast | Type `contrast 80` | "Contrast: 80%" confirmation |
| `ONB-024` | Brightness bounds (low) | Type `brightness 50` | Brightness set to 50% |
| `ONB-025` | Brightness bounds (high) | Type `brightness 150` | Brightness set to 150% |
| `ONB-026` | Continue to character | Type `continue` | Advances to Character Creation |

#### Visual Commands (Only Valid in Visual Phase)
- `brightness <50-150>` - Set display brightness
- `contrast <50-150>` - Set display contrast
- `continue` - Proceed to next phase

---

### 1.4 Phase 3: Character Creation - Identity

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `ONB-030` | Identity phase displays | Continue from visual phase | "IDENTITY FORGE" banner, "IDENTITY" section |
| `ONB-031` | Set character name | Type `name John Doe` | "Name set: John Doe" |
| `ONB-032` | Set handle | Type `handle Chrome` | "Handle set: Chrome" |
| `ONB-033` | Set pronouns | Type `pronouns he/him` | "Pronouns set: he/him" |
| `ONB-034` | Name with spaces | Type `name Jane Mary Doe` | Full name preserved |
| `ONB-035` | Continue to background | Type `continue` | Advances to Background selection |

#### Identity Commands
- `name <full name>` - Set legal name
- `handle <street name>` - Set street handle
- `pronouns <pronouns>` - Set pronouns
- `continue` - Proceed to next phase

---

### 1.5 Phase 3: Character Creation - Background

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `ONB-040` | Background list displays | Enter background phase | 6 backgrounds listed with skills/flavor |
| `ONB-041` | Select by number | Type `1` | Street Kid selected |
| `ONB-042` | Select by name | Type `background corporate` | Corporate selected |
| `ONB-043` | Invalid number | Type `7` | Error: "Invalid background" |
| `ONB-044` | Invalid name | Type `background hacker` | Error: "Invalid background" |
| `ONB-045` | Background applies skills | Select Street Kid | streetwise +1, melee +1 applied |
| `ONB-046` | Background sets debt | Select Corporate | Base debt: 15,000¢ |
| `ONB-047` | Background shows gear | Select any background | Starting gear listed |

#### Available Backgrounds
| # | Name | Skills | Debt | Creditor |
|---|------|--------|------|----------|
| 1 | Street Kid | streetwise +1, melee +1 | 8,000¢ | Viktor "Vic" Malone |
| 2 | Corporate | persuasion +1, investigation +1 | 15,000¢ | Meridian Systems Corp. |
| 3 | Techie | hardware +1, rigging +1 | 10,000¢ | Tanaka Tools Ltd. |
| 4 | Nomad | survival +1, firearms +1 | 6,000¢ | The Dustrunners |
| 5 | Medic | medicine +1, perception +1 | 12,000¢ | Nightcity Medical Academy |
| 6 | Enforcer | intimidation +1, melee +1 | 9,000¢ | Iron Mike |

---

### 1.6 Phase 4: Debt & Equipment

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `ONB-050` | Debt phase displays | Continue from character | "YOUR FINANCIAL SITUATION" header |
| `ONB-051` | Base debt shown | Enter debt phase | Background debt displayed |
| `ONB-052` | Package list shown | Enter debt phase | 8 debt packages listed |
| `ONB-053` | Add package | Type `add 1` | "Added: Survival Kit (+2000¢)" |
| `ONB-054` | Remove package | Type `remove 1` | "Removed: Survival Kit (-2000¢)" |
| `ONB-055` | Max 3 packages | Add 4 packages | Error: "Maximum 3 packages allowed" |
| `ONB-056` | No duplicate packages | Add same package twice | Error: "Package already selected" |
| `ONB-057` | Invalid package number | Type `add 99` | Error: "Invalid package number" |
| `ONB-058` | Total debt updates | Add packages | Running total displayed |

#### Debt Packages
| # | Name | Contents | Cost |
|---|------|----------|------|
| 1 | Survival Kit | Med kit, 3 stim packs, Trauma patch | 2,000¢ |
| 2 | Street Arsenal | Heavy pistol, 50 rounds, Combat knife | 3,000¢ |
| 3 | Tech Toolkit | Advanced toolkit, Diagnostic scanner, Spare parts | 2,500¢ |
| 4 | Chrome Upgrade | One cyberware piece (up to 3,000¢) | 4,000¢ |
| 5 | Fixer's Favor | Upgrade one contact: Neutral → Ally | 1,500¢ |
| 6 | Clean SIN | Legitimate identity, No criminal flags | 5,000¢ |
| 7 | Safe House | Secure location in the city | 3,500¢ |
| 8 | Wheels | Basic motorcycle or beat-up car | 4,500¢ |

---

### 1.7 Phase 5: Document Presentation

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `ONB-060` | Documents generate | Continue from debt | "GENERATING IDENTITY DOCUMENTS..." |
| `ONB-061` | Corporate ID displays | Wait for generation | ID card with name, handle, SIN, clearance |
| `ONB-062` | SIN card displays | Wait for generation | SIN number, verification status |
| `ONB-063` | Clean SIN effect | Have Clean SIN package | SIN shows "VERIFIED" status |
| `ONB-064` | Unverified SIN | No Clean SIN package | SIN shows "UNVERIFIED" + flag |
| `ONB-065` | Debt statement displays | Wait for generation | Account details, total debt, minimum payment |
| `ONB-066` | Equipment manifest | Wait for generation | All gear from background + packages |
| `ONB-067` | Final prompt | All docs shown | "Type 'continue' to enter the world" |

---

### 1.8 Onboarding Completion

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `ONB-070` | Complete onboarding | Type `continue` after documents | "Onboarding complete" message |
| `ONB-071` | Exit terminal mode | Complete onboarding | Terminal mode exits after 2s delay |
| `ONB-072` | Event emitted | Complete onboarding | `onboarding:complete` event fires |
| `ONB-073` | Character data saved | Complete onboarding | Full character object generated |

#### Character Data Structure
```typescript
{
  id: string,
  name: string,
  handle: string,
  pronouns: string,
  background: string,
  attributes: { reflex, body, tech, neural, edge, presence },
  skills: { [skill]: number },
  gear: string[],
  debt: {
    total: number,
    baseDebt: number,
    packageDebt: number,
    creditor: { name, type },
    packages: string[]
  },
  documents: {
    corporateId: object,
    sin: object,
    debtStatement: object,
    equipmentManifest: object
  },
  meta: {
    created: string,
    onboardingComplete: boolean
  }
}
```

---

### 1.9 Cancellation & Error Handling

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `ONB-080` | Cancel during audio | Type `cancel` in audio phase | "Onboarding cancelled", exits terminal |
| `ONB-081` | Cancel during visual | Type `cancel` in visual phase | Same as ONB-080 |
| `ONB-082` | Cancel during character | Type `cancel` in character phase | Same as ONB-080 |
| `ONB-083` | Cancel during debt | Type `cancel` in debt phase | Same as ONB-080 |
| `ONB-084` | Cancel during documents | Type `cancel` in documents phase | Same as ONB-080 |
| `ONB-085` | Music stops on cancel | Cancel during audio phase | Test music stops playing |
| `ONB-086` | Command outside phase | Type `music 50` in visual phase | Error: "Command only available during audio calibration" |
| `ONB-087` | Cancel alias `quit` | Type `quit` | Same as cancel |
| `ONB-088` | Cancel alias `exit` | Type `exit` | Same as cancel |

---

### 1.10 Onboarding State Persistence

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `ONB-090` | State resets on cancel | Cancel, then restart | Fresh state, no previous data |
| `ONB-091` | Phase tracking | Check `OnboardingManager.getPhase()` | Returns current phase |
| `ONB-092` | Active status | Check `OnboardingManager.isActive()` | Returns true during onboarding |
| `ONB-093` | Character phase tracking | Check `OnboardingManager.getCharacterPhase()` | Returns current character sub-phase |

---

## 2. Terminal Mode

The terminal is a canvas-based Three.js rendering system with phosphor text effects.

### 2.1 Terminal Visibility & Transitions

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `TRM-001` | Toggle terminal mode | Press `~` key | Terminal mode toggles with CRT transition |
| `TRM-002` | Terminal plane visible | Enter terminal mode | Terminal plane renders in Three.js scene |
| `TRM-003` | Scene plane hidden | Enter terminal mode | Scene viewer plane hidden |
| `TRM-004` | Exit terminal mode | Press `~` in terminal mode | Returns to scene viewer with transition |
| `TRM-005` | Transition animation | Toggle terminal | Power-down/up CRT effect plays |
| `TRM-006` | EventBus notification | Toggle terminal | `ui:terminal-toggle` event emits |

### 2.2 Terminal Input

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `TRM-010` | Type text | Type characters | Characters appear in input buffer |
| `TRM-011` | Backspace | Type then backspace | Character deleted from buffer |
| `TRM-012` | Delete key | Position caret, press Delete | Character after caret deleted |
| `TRM-013` | Enter submits | Type command, press Enter | Command executes |
| `TRM-014` | Command history up | Press Up arrow | Previous command appears |
| `TRM-015` | Command history down | Press Down arrow | Next command appears |
| `TRM-016` | Caret left | Press Left arrow | Caret moves left |
| `TRM-017` | Caret right | Press Right arrow | Caret moves right |
| `TRM-018` | Home key | Press Home | Caret moves to start |
| `TRM-019` | End key | Press End | Caret moves to end |
| `TRM-020` | Ctrl+C | Press Ctrl+C | Input cancelled, `^C` shown |
| `TRM-021` | Ctrl+L | Press Ctrl+L | Terminal clears |

### 2.3 Terminal Scrolling

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `TRM-030` | Page Up | Press PageUp | Scroll up by visible lines |
| `TRM-031` | Page Down | Press PageDown | Scroll down by visible lines |
| `TRM-032` | Ctrl+Home | Press Ctrl+Home | Scroll to top |
| `TRM-033` | Ctrl+End | Press Ctrl+End | Scroll to bottom |
| `TRM-034` | Scroll indicator | Scroll up | "[X lines above]" indicator shows |
| `TRM-035` | Max scrollback | Add 500+ lines | Old lines trimmed |

### 2.4 Terminal Commands

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `TRM-040` | Help command | Type `help` | Command list displays |
| `TRM-041` | Clear command | Type `clear` | Terminal clears |
| `TRM-042` | Unknown command | Type `asdfgh` | Error: "Unknown command" |
| `TRM-043` | Case insensitive | Type `HELP` | Same as `help` |
| `TRM-044` | Command with args | Type `music 50` | Args passed to handler |

### 2.5 Terminal Rendering

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `TRM-050` | Phosphor glow | View terminal text | Green phosphor glow effect |
| `TRM-051` | Caret blink | Wait in terminal | Caret blinks at regular interval |
| `TRM-052` | Error text color | Trigger error | Red text for errors |
| `TRM-053` | System text color | View system message | Green text for system |
| `TRM-054` | CRT barrel distortion | View terminal | Barrel distortion shader active |

### 2.6 Boot Sequence

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `TRM-060` | Boot sequence plays | First terminal open | Boot text typewriter effect |
| `TRM-061` | Boot complete flag | After boot | `state.bootComplete = true` |
| `TRM-062` | Input disabled during boot | Type during boot | Input ignored |
| `TRM-063` | Prompt appears after boot | Boot completes | `> ` prompt visible |

#### Playwright Selectors
```typescript
// Terminal state checks (canvas-based, use JS evaluation)
const isTerminalVisible = await page.evaluate(() => {
  return typeof TerminalManager !== 'undefined' && TerminalManager.isVisible();
});

const terminalPhase = await page.evaluate(() => {
  return TerminalManager.getState().bootComplete;
});

// Input simulation (terminal captures keyboard directly)
await page.keyboard.type('help');
await page.keyboard.press('Enter');
```

---

## 3. Chat System

### 3.1 Chat Input

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `CHT-001` | Send message | Type message, press Enter | Message appears in chat log |
| `CHT-002` | Command prefix | Type `/help` | Command executes, not sent as message |
| `CHT-003` | Dice roll | Type `/roll 2d6` | Dice roll result appears |
| `CHT-004` | Empty message | Press Enter with no text | Nothing happens |

### 3.2 Chat Commands

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `CHT-010` | `/help` | Type `/help` | Command list displays |
| `CHT-011` | `/clear` | Type `/clear` | Chat log clears |
| `CHT-012` | `/roll` | Type `/roll 1d20` | Roll result with breakdown |
| `CHT-013` | `/onboard` | Type `/onboard` | Starts onboarding |

---

## 4. Audio System

### 4.1 Music Playback

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `AUD-001` | Load track list | Call `Audio.loadTrackList()` | Tracks array populated |
| `AUD-002` | Play track | Call `Audio.play(trackId)` | Music plays |
| `AUD-003` | Stop playback | Call `Audio.stop()` | Music stops |
| `AUD-004` | Set volume | Call `Audio.setMusicVolume(0.5)` | Volume changes |

### 4.2 SFX Playback

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `AUD-010` | Play beep | Call `Audio.SFX.beep()` | Beep sound plays |
| `AUD-011` | Play keystroke | Call `Audio.SFX.keystroke()` | Keystroke sound plays |
| `AUD-012` | Play error | Call `Audio.SFX.errorBuzz()` | Error buzz plays |
| `AUD-013` | Play glitch | Call `Audio.SFX.glitchCrackle()` | Glitch sound plays |

---

## 5. Scene Viewer

The scene viewer displays background images with CRT/ASCII shader effects.

### 5.1 Scene Loading

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `SCN-001` | Load scene by index | Call `SceneManager.setCurrentIndex(0)` | Scene image displays |
| `SCN-002` | Scene list API | GET `/api/scenes` | Array of available scenes |
| `SCN-003` | Invalid scene index | Load index -1 or beyond length | Error handled, no crash |
| `SCN-004` | Scene caching | Load same scene twice | Second load uses cache |
| `SCN-005` | Scene image URL | Load scene | `imageUrl` property used for background |

### 5.2 Scene Navigation

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `SCN-010` | Next scene | Call `SceneManager.next()` | Advances to next scene |
| `SCN-011` | Previous scene | Call `SceneManager.prev()` | Goes to previous scene |
| `SCN-012` | First scene boundary | Call `prev()` at index 0 | Stays at index 0 |
| `SCN-013` | Last scene boundary | Call `next()` at last index | Stays at last index |
| `SCN-014` | Go to specific scene | Call `setCurrentIndex(3)` | Jumps to scene 3 |
| `SCN-015` | Scene change event | Change scene | `scene:changed` event emits |

### 5.3 Scene Transitions

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `SCN-020` | Power-down transition | Change scene with transition | CRT power-down effect |
| `SCN-021` | Power-up transition | After scene loads | CRT power-up effect |
| `SCN-022` | Midpoint callback | During transition | Image loads at black point |
| `SCN-023` | Skip transition | Initial load | No transition on first scene |
| `SCN-024` | Transition duration | Measure transition | ~3-4 seconds total |

### 5.4 CRT Shader Effects

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `SCN-030` | ASCII mode enabled | Scene viewer active | ASCII character conversion |
| `SCN-031` | Barrel distortion | View scene | CRT curvature effect |
| `SCN-032` | Scanlines | View scene | Horizontal scanline effect |
| `SCN-033` | Phosphor glow | View scene | Green phosphor bloom |
| `SCN-034` | Brightness control | Adjust brightness | Scene brightness changes |
| `SCN-035` | Contrast control | Adjust contrast | Scene contrast changes |

### 5.5 Scene State

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `SCN-040` | Current scene getter | Call `SceneManager.getCurrentScene()` | Returns current scene object |
| `SCN-041` | Current index getter | Call `SceneManager.getCurrentIndex()` | Returns current index |
| `SCN-042` | Scene count | Call `SceneManager.getScenes().length` | Returns total scenes |
| `SCN-043` | Loading state | During load | `state.loading = true` |

### 5.6 Multiplayer Scene Sync

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `SCN-050` | GM broadcasts scene | GM changes scene | `sync:scene_change` sent |
| `SCN-051` | Player receives scene | GM changes scene | Player scene updates |
| `SCN-052` | Non-GM no broadcast | Player changes scene | No broadcast sent |
| `SCN-053` | Remote scene change | Receive `sync:scene_change` | Scene updates locally |

#### Playwright Selectors
```typescript
// Scene state checks
const currentScene = await page.evaluate(() => {
  return SceneManager.getCurrentScene();
});

const sceneIndex = await page.evaluate(() => {
  return SceneManager.getCurrentIndex();
});

// Check scene image loaded
const sceneLoaded = await page.evaluate(() => {
  return SceneManager.getCurrentScene()?.imageUrl !== undefined;
});
```

---

## 6. Multiplayer Sync

### 6.1 Connection

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `SYN-001` | Connect to server | Load page | Socket.io connects |
| `SYN-002` | Self-test | On connect | Echo test passes |
| `SYN-003` | Presence update | Connect | User appears in presence list |

### 6.2 Message Sync

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `SYN-010` | Chat sync | Send chat message | Message broadcasts to others |
| `SYN-011` | Roll sync | Roll dice | Roll result broadcasts |
| `SYN-012` | View change sync | Toggle terminal mode | View change broadcasts |

---

## 7. API Endpoints

### 7.1 Health & Status

| Test ID | Description | Method | Endpoint | Expected |
|---------|-------------|--------|----------|----------|
| `API-001` | Health check | GET | `/api/health` | `{ status: 'ok' }` |

### 7.2 Content APIs

| Test ID | Description | Method | Endpoint | Expected |
|---------|-------------|--------|----------|----------|
| `API-010` | Music list | GET | `/api/music` | Array of tracks |
| `API-011` | Scene list | GET | `/api/scenes` | Array of scenes |
| `API-012` | Adventure list | GET | `/api/adventures` | Array of adventures |

---

## Playwright Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Onboarding System', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Wait for app initialization
    await page.waitForTimeout(1000);
  });

  test('ONB-001: Start onboarding from chat', async ({ page }) => {
    // Focus chat input
    const chatInput = page.locator('#chat-input');
    await chatInput.fill('/onboard');
    await chatInput.press('Enter');
    
    // Wait for terminal mode transition
    await page.waitForTimeout(4000);
    
    // Verify terminal is visible
    // Note: Terminal is canvas-based, verify via JS state
    const isTerminalVisible = await page.evaluate(() => {
      return typeof TerminalManager !== 'undefined' && TerminalManager.isVisible();
    });
    expect(isTerminalVisible).toBe(true);
  });

  test('ONB-010: Audio phase displays', async ({ page }) => {
    // Start onboarding
    await page.locator('#chat-input').fill('/onboard');
    await page.locator('#chat-input').press('Enter');
    await page.waitForTimeout(5000);
    
    // Check phase via JS
    const phase = await page.evaluate(() => {
      return OnboardingManager.getPhase();
    });
    expect(phase).toBe('audio');
  });

  test('ONB-070: Complete onboarding', async ({ page }) => {
    // This is a full flow test
    await page.locator('#chat-input').fill('/onboard');
    await page.locator('#chat-input').press('Enter');
    await page.waitForTimeout(5000);
    
    // Audio phase - continue
    await page.keyboard.type('continue');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Visual phase - continue
    await page.keyboard.type('continue');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    
    // Identity phase - set name and continue
    await page.keyboard.type('name Test Character');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await page.keyboard.type('handle TestHandle');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await page.keyboard.type('continue');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Background phase - select option 1
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await page.keyboard.type('continue');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Debt phase - continue without packages
    await page.keyboard.type('continue');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    
    // Documents phase - continue to complete
    await page.keyboard.type('continue');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    
    // Verify completion
    const isComplete = await page.evaluate(() => {
      return OnboardingManager.getPhase() === 'complete';
    });
    expect(isComplete).toBe(true);
  });

});
```

---

## Running Tests

```bash
# Run all tests
npx playwright test

# Run onboarding tests only
npx playwright test --grep "Onboarding"

# Run with UI (headed mode)
npx playwright test --headed

# Run specific test by ID
npx playwright test --grep "ONB-001"

# Generate HTML report
npx playwright show-report
```

---

## Test Coverage Checklist

### Onboarding System
- [ ] ONB-001 through ONB-093 (93 tests)

### Terminal Mode
- [ ] TRM-001 through TRM-063 (63 tests)
  - [ ] Visibility & Transitions (TRM-001 to TRM-006)
  - [ ] Input (TRM-010 to TRM-021)
  - [ ] Scrolling (TRM-030 to TRM-035)
  - [ ] Commands (TRM-040 to TRM-044)
  - [ ] Rendering (TRM-050 to TRM-054)
  - [ ] Boot Sequence (TRM-060 to TRM-063)

### Chat System
- [ ] CHT-001 through CHT-013 (13 tests)

### Audio System
- [ ] AUD-001 through AUD-013 (13 tests)

### Scene Viewer
- [ ] SCN-001 through SCN-053 (53 tests)
  - [ ] Loading (SCN-001 to SCN-005)
  - [ ] Navigation (SCN-010 to SCN-015)
  - [ ] Transitions (SCN-020 to SCN-024)
  - [ ] CRT Effects (SCN-030 to SCN-035)
  - [ ] State (SCN-040 to SCN-043)
  - [ ] Multiplayer Sync (SCN-050 to SCN-053)

### Multiplayer Sync
- [ ] SYN-001 through SYN-012 (12 tests)

### API Endpoints
- [ ] API-001 through API-012 (12 tests)

### GM Overlay
- [ ] GMO-001 through GMO-123 (123 tests)
  - [ ] Opening & Closing (GMO-001 to GMO-005)
  - [ ] Layout Components (GMO-010 to GMO-015)
  - [ ] Scene Navigation (GMO-020 to GMO-024)
  - [ ] Scene Activation (GMO-030 to GMO-034)
  - [ ] Views (GMO-040 to GMO-046)
  - [ ] Narrative Sections (GMO-050 to GMO-056)
  - [ ] NPC Detail View (GMO-060 to GMO-070)
  - [ ] Sidebar Components (GMO-080 to GMO-089)
  - [ ] Modals (GMO-090 to GMO-095)
  - [ ] Keyboard Shortcuts (GMO-100 to GMO-106)
  - [ ] API Integration (GMO-110 to GMO-113)
  - [ ] Sync Integration (GMO-120 to GMO-123)

**Total: ~382 test cases**

---

## 8. GM Overlay

The GM Overlay is a React-based control surface for game masters, running at `/gm-overlay/`.

### 8.1 Opening & Closing

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `GMO-001` | Open via keyboard | Press `G` key | GM Overlay opens |
| `GMO-002` | Close via X button | Click X in header | Overlay closes |
| `GMO-003` | Close via Escape | Press Escape | Overlay closes |
| `GMO-004` | Overlay visibility | Open overlay | Full-screen DOM overlay visible |
| `GMO-005` | Three.js canvas hidden | Open overlay | Main canvas obscured by overlay |

### 8.2 Layout Components

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `GMO-010` | Header displays | Open overlay | Scene title, position (X/Y), settings gear |
| `GMO-011` | Breadcrumbs visible | Open overlay | Navigation trail shows |
| `GMO-012` | IndexBar visible | Open overlay | Section anchors (Location, Narrative, NPCs, etc.) |
| `GMO-013` | MainPanel visible | Open overlay | Left 60% panel with content |
| `GMO-014` | Sidebar visible | Open overlay | Right 40% panel with tools |
| `GMO-015` | NavBar visible | Open overlay | Bottom navigation bar |

### 8.3 Scene Navigation

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `GMO-020` | Next scene | Click NEXT or press → | Advances to next scene |
| `GMO-021` | Previous scene | Click PREV or press ← | Goes to previous scene |
| `GMO-022` | Scene jumper modal | Press Cmd/Ctrl+J | Scene list modal opens |
| `GMO-023` | Jump to scene | Select scene in jumper | Navigates to selected scene |
| `GMO-024` | Scene position display | Navigate scenes | "X / Y" updates in header |

### 8.4 Scene Activation (View vs Activate)

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `GMO-030` | Browse without activate | Press ← or → | GM views scene, players unchanged |
| `GMO-031` | Activate scene | Press Shift+Enter or ACTIVATE button | Scene pushed to players |
| `GMO-032` | Active scene indicator | Activate a scene | Green header when viewing active |
| `GMO-033` | Viewing different scene | Browse away from active | Amber "VIEWING" + Green "ACTIVE" |
| `GMO-034` | Active scene in jumper | Open scene jumper | Green ring around active scene |

### 8.5 Views

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `GMO-040` | Narrative view | Default view | Scene narrative with sections |
| `GMO-041` | NPC detail view | Click NPC name | Full NPC statblock displays |
| `GMO-042` | Item detail view | Click item name | Item details display |
| `GMO-043` | Conversation guide | Click conversation link | Disposition-based hints |
| `GMO-044` | Dashboard view | No scene loaded | Landing/downtime state |
| `GMO-045` | Karaoke view | Click KARAOKE button | Teleprompter mode |
| `GMO-046` | Back navigation | Click back button | Returns to previous view |

### 8.6 Narrative View Sections

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `GMO-050` | Location section | View narrative | Location name, tone, lighting, audio |
| `GMO-051` | Narrative section | View narrative | Scene narrative text with NPC links |
| `GMO-052` | NPCs section | View narrative | List of NPCs in scene |
| `GMO-053` | Skill checks section | View narrative | Available skill checks with DCs |
| `GMO-054` | Triggers section | View narrative | Scene triggers with fire buttons |
| `GMO-055` | Dialogue section | View narrative | Conversation guide summary |
| `GMO-056` | NPC link click | Click [NPC Name] in text | Opens NPC detail view |

### 8.7 NPC Detail View

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `GMO-060` | NPC identity | View NPC | Name, pronouns, species, faction |
| `GMO-061` | NPC description | View NPC | Physical description |
| `GMO-062` | NPC stats | View NPC | Stats grid (wounds, armor, etc.) |
| `GMO-063` | NPC attributes | View NPC | Attribute bar |
| `GMO-064` | NPC skills | View NPC | Skills list |
| `GMO-065` | NPC abilities | View NPC | Abilities list |
| `GMO-066` | NPC secrets | View NPC | GM-only secrets section |
| `GMO-067` | Show image button | Click Show Image | NPC image pushed to players |
| `GMO-068` | Ping token button | Click Ping Token | Token highlighted on map |
| `GMO-069` | Hide NPC button | Click Hide | NPC hidden from players |
| `GMO-070` | Kill NPC button | Click Kill | NPC marked as defeated |

### 8.8 Sidebar Components

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `GMO-080` | Player view preview | View sidebar | Thumbnail of active scene |
| `GMO-081` | Live indicator | Viewing active scene | Green border + "LIVE" |
| `GMO-082` | Chat log panel | View sidebar | Real-time chat messages |
| `GMO-083` | Chat filters | Click filter tabs | Messages filtered by type |
| `GMO-084` | Send GM message | Type and send | Message appears in chat |
| `GMO-085` | Scene info | View sidebar | Static GM notes |
| `GMO-086` | Session log | View sidebar | Editable session notes |
| `GMO-087` | Quick actions | View sidebar | Ad-hoc check, triggers |
| `GMO-088` | Scene elements | View sidebar | NPCs, Items, Exits lists |
| `GMO-089` | Flags panel | View sidebar | Campaign flags toggles |

### 8.9 Modals

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `GMO-090` | Scene jumper | Press Cmd/Ctrl+J | Scene list with search |
| `GMO-091` | Global search | Press Cmd/Ctrl+K | Omnibar search modal |
| `GMO-092` | Ad-hoc check | Click ad-hoc check button | Skill + DC picker radial |
| `GMO-093` | Confirm trigger | Fire irreversible trigger | Confirmation modal |
| `GMO-094` | Settings modal | Click settings gear | Preferences panel |
| `GMO-095` | Export all modal | Click export | Export options |

### 8.10 Keyboard Shortcuts

| Test ID | Description | Shortcut | Expected Result |
|---------|-------------|----------|-----------------|
| `GMO-100` | Next scene | `→` or `]` | Browse to next scene |
| `GMO-101` | Previous scene | `←` or `[` | Browse to previous scene |
| `GMO-102` | Activate scene | `Shift+Enter` | Push scene to players |
| `GMO-103` | Scene jumper | `Cmd/Ctrl+J` | Open scene jumper |
| `GMO-104` | Global search | `Cmd/Ctrl+K` | Open omnibar |
| `GMO-105` | Close overlay | `Escape` | Close GM overlay |
| `GMO-106` | Back navigation | `Backspace` | Return to previous view |

### 8.11 API Integration

| Test ID | Description | Method | Endpoint | Expected |
|---------|-------------|--------|----------|----------|
| `GMO-110` | Adventure scenes | GET | `/api/adventures/:id/scenes` | Array of scenes |
| `GMO-111` | Adventure guide | GET | `/api/adventures/:id/guide` | Guide.json data |
| `GMO-112` | NPC data | GET | `/api/adventures/:id/npcs/:npcId` | NPC object |
| `GMO-113` | Scene data | GET | `/api/adventures/:id/scenes/:sceneId` | Scene object |

### 8.12 Sync Integration

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| `GMO-120` | Chat sync receive | Player sends message | Message appears in GM chat |
| `GMO-121` | Roll sync receive | Player rolls dice | Roll appears in GM chat |
| `GMO-122` | Scene sync send | Activate scene | Players receive scene change |
| `GMO-123` | View change receive | Player toggles terminal | Notification in GM chat |

#### Playwright Selectors
```typescript
// GM Overlay uses React, check for mounted container
const gmOverlay = page.locator('[class*="fixed inset-0"]');
await expect(gmOverlay).toBeVisible();

// Or check for iframe if loaded that way
const gmIframe = page.locator('iframe[src*="gm-overlay"]');

// Header elements
const header = page.locator('header').first();
const sceneTitle = header.locator('h1');

// Navigation
const nextButton = page.locator('button:has-text("NEXT")');
const prevButton = page.locator('button:has-text("PREV")');
const activateButton = page.locator('button:has-text("ACTIVATE")');

// Modals
const sceneJumper = page.locator('[role="dialog"]');
await page.keyboard.press('Control+j');
await expect(sceneJumper).toBeVisible();

// Sidebar components
const chatLog = page.locator('[class*="ChatLogPanel"]');
const sessionNotes = page.locator('[class*="SessionLog"]');
```

#### GM Overlay Test Template
```typescript
import { test, expect } from '@playwright/test';

test.describe('GM Overlay', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 10000 });
  });

  test('GMO-001: Open via keyboard', async ({ page }) => {
    await page.keyboard.press('g');
    
    // Wait for overlay to mount
    await page.waitForTimeout(500);
    
    // Check for overlay container
    const overlay = page.locator('[class*="fixed inset-0"]');
    await expect(overlay.first()).toBeVisible({ timeout: 5000 });
  });

  test('GMO-020: Next scene navigation', async ({ page }) => {
    // Open GM overlay
    await page.keyboard.press('g');
    await page.waitForTimeout(500);
    
    // Get initial scene position
    const initialPosition = await page.locator('header span').textContent();
    
    // Press next
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    
    // Verify position changed
    const newPosition = await page.locator('header span').textContent();
    expect(newPosition).not.toBe(initialPosition);
  });

  test('GMO-090: Scene jumper modal', async ({ page }) => {
    await page.keyboard.press('g');
    await page.waitForTimeout(500);
    
    // Open scene jumper
    await page.keyboard.press('Control+j');
    
    // Check modal is visible
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });
  });

});
```

---

## Notes for Test Implementation

1. **Canvas-based UI**: Terminal and scene viewer use Three.js canvas rendering. Visual verification requires screenshot comparison or JS state checks.

2. **Timing**: Onboarding uses typewriter effects with delays. Tests must account for animation timing.

3. **Audio**: Audio tests may require mocking or checking Audio API state rather than actual playback verification.

4. **Socket.io**: Multiplayer tests require either multiple browser contexts or mocked socket connections.

5. **State Reset**: Each test should start with a fresh page load to ensure clean state.

6. **GM Overlay**: The overlay is a React app that may load in an iframe or be directly mounted. Check both patterns.

7. **Keyboard Shortcuts**: Many features use keyboard shortcuts. Ensure focus is on the correct element before sending keys.
