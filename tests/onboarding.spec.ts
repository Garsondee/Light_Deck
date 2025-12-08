import { test, expect, Page } from '@playwright/test';

// Ambient declarations for browser globals used inside page.evaluate.
// These exist at runtime on window; we declare them here to silence TS errors
// in this test file without affecting the app code.
declare const TerminalManager: any;
declare const ChatManager: any;
declare const OnboardingManager: any;
declare const App: any;

/**
 * Onboarding System Tests
 * 
 * These tests verify the player onboarding flow which runs in terminal mode.
 * The terminal is canvas-based (Three.js), so we verify state via JS evaluation
 * and use keyboard input for interaction.
 */

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Wait for the app to fully initialize
 */
async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#scene-canvas', { timeout: 15000 });
  // Wait for managers to initialize
  await page.waitForTimeout(2000);
}

/**
 * Check if terminal mode is visible
 */
async function isTerminalVisible(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof TerminalManager !== 'undefined' && TerminalManager.isVisible();
  });
}

/**
 * Get the current onboarding phase
 */
async function getOnboardingPhase(page: Page): Promise<string> {
  return await page.evaluate(() => {
    if (typeof OnboardingManager === 'undefined') return 'undefined';
    return OnboardingManager.getPhase();
  });
}

/**
 * Check if onboarding is active
 */
async function isOnboardingActive(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof OnboardingManager !== 'undefined' && OnboardingManager.isActive();
  });
}

/**
 * Get the current character sub-phase
 */
async function getCharacterPhase(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    if (typeof OnboardingManager === 'undefined') return null;
    return OnboardingManager.getCharacterPhase();
  });
}

/**
 * Get onboarding state
 */
async function getOnboardingState(page: Page): Promise<any> {
  return await page.evaluate(() => {
    if (typeof OnboardingManager === 'undefined') return null;
    return OnboardingManager.getState();
  });
}

/**
 * Type a command in terminal mode (keyboard input)
 */
async function terminalType(page: Page, text: string) {
  await page.keyboard.type(text, { delay: 30 });
}

/**
 * Submit a command in terminal mode
 * Uses executeCommand directly for reliability (keyboard input is flaky in canvas-based terminal)
 */
async function terminalSubmit(page: Page, command: string) {
  await page.evaluate((cmd) => {
    if (typeof TerminalManager !== 'undefined') {
      TerminalManager.executeCommand(cmd);
    }
  }, command);
  await page.waitForTimeout(300); // Allow command to process
}

/**
 * Type a command in the canvas-based chat input
 * The chat is now rendered via Three.js, not DOM elements
 */
async function chatCommand(page: Page, command: string) {
  // Activate chat input
  await page.evaluate(() => {
    if (typeof ChatManager !== 'undefined') {
      ChatManager.setInputActive(true);
    }
  });
  await page.waitForTimeout(100);
  
  // Type the command via keyboard
  await page.keyboard.type(command, { delay: 20 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
}

/**
 * Start onboarding from chat
 */
async function startOnboardingFromChat(page: Page) {
  await chatCommand(page, '/onboard');
  
  // Wait for onboarding to become active
  await page.waitForFunction(() => {
    return typeof OnboardingManager !== 'undefined' && OnboardingManager.isActive();
  }, { timeout: 10000 });
}

/**
 * Wait for a specific onboarding phase
 */
async function waitForPhase(page: Page, phase: string, timeout = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const currentPhase = await getOnboardingPhase(page);
    if (currentPhase === phase) return true;
    await page.waitForTimeout(200);
  }
  throw new Error(`Timeout waiting for phase: ${phase}`);
}

// ============================================================================
// SECTION 1: STARTING ONBOARDING
// ============================================================================

test.describe('1.1 Starting Onboarding', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
  });

  test('ONB-001: Start onboarding from chat', async ({ page }) => {
    // Type /onboard in chat (canvas-based input)
    await chatCommand(page, '/onboard');
    
    // Wait for onboarding to become active (testMode shortens animations)
    await page.waitForFunction(() => {
      return typeof OnboardingManager !== 'undefined' && OnboardingManager.isActive();
    }, { timeout: 10000 });
    
    // Verify terminal is visible
    const terminalVisible = await isTerminalVisible(page);
    expect(terminalVisible).toBe(true);
    
    // Verify onboarding is active
    const active = await isOnboardingActive(page);
    expect(active).toBe(true);
  });

  test('ONB-002: Start with /create alias', async ({ page }) => {
    await chatCommand(page, '/create');
    
    await page.waitForFunction(() => {
      return typeof OnboardingManager !== 'undefined' && OnboardingManager.isActive();
    }, { timeout: 10000 });
    
    const active = await isOnboardingActive(page);
    expect(active).toBe(true);
  });

  test('ONB-003: Start with /newchar alias', async ({ page }) => {
    await chatCommand(page, '/newchar');
    
    await page.waitForFunction(() => {
      return typeof OnboardingManager !== 'undefined' && OnboardingManager.isActive();
    }, { timeout: 10000 });
    
    const active = await isOnboardingActive(page);
    expect(active).toBe(true);
  });

  test('ONB-004: Prevent double-start', async ({ page }) => {
    // Start onboarding
    await startOnboardingFromChat(page);
    
    // Try to start again via terminal command
    await terminalSubmit(page, 'onboard');
    await page.waitForTimeout(500);
    
    // Should still be in first onboarding session (audio phase)
    const phase = await getOnboardingPhase(page);
    expect(phase).toBe('audio');
  });

  test('ONB-005: Start from terminal mode', async ({ page }) => {
    // Enter terminal mode via App.toggleTerminalMode
    await page.evaluate(() => {
      if (typeof App !== 'undefined' && typeof App.toggleTerminalMode === 'function') {
        App.toggleTerminalMode();
      }
    });
    
    // Wait for terminal to become visible
    await page.waitForFunction(() => {
      return typeof TerminalManager !== 'undefined' && TerminalManager.isVisible();
    }, { timeout: 10000 });
    
    // In test mode, force boot complete if not already
    await page.evaluate(() => {
      if (typeof TerminalManager !== 'undefined' && !TerminalManager.isBootComplete()) {
        // Force boot complete for testing
        const state = TerminalManager.getState();
        if (state) {
          // The state is a copy, so we need to use internal methods
          // Just run the boot sequence which will skip in test mode
          TerminalManager.runBootSequence();
        }
      }
    });
    
    // Wait for boot to complete
    await page.waitForFunction(() => {
      return typeof TerminalManager !== 'undefined' && TerminalManager.isBootComplete();
    }, { timeout: 5000 });
    
    // Verify terminal is visible
    const terminalVisible = await isTerminalVisible(page);
    expect(terminalVisible).toBe(true);
    
    // Execute onboard command directly (keyboard input may not work reliably)
    await page.evaluate(() => {
      if (typeof TerminalManager !== 'undefined') {
        TerminalManager.executeCommand('onboard');
      }
    });
    
    // Wait for onboarding to become active
    await page.waitForFunction(() => {
      return typeof OnboardingManager !== 'undefined' && OnboardingManager.isActive();
    }, { timeout: 10000 });
    
    // Verify onboarding started
    const active = await isOnboardingActive(page);
    expect(active).toBe(true);
  });

});

// ============================================================================
// SECTION 2: AUDIO CALIBRATION PHASE
// ============================================================================

test.describe('1.2 Phase 1: Audio Calibration', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await startOnboardingFromChat(page);
    // Should now be in audio phase
  });

  test('ONB-010: Audio phase displays', async ({ page }) => {
    const phase = await getOnboardingPhase(page);
    expect(phase).toBe('audio');
  });

  test('ONB-011: Set music volume', async ({ page }) => {
    await terminalSubmit(page, 'music 75');
    
    const state = await getOnboardingState(page);
    expect(state.audio.musicVolume).toBeCloseTo(0.75, 1);
  });

  test('ONB-012: Set SFX volume', async ({ page }) => {
    await terminalSubmit(page, 'sfx 50');
    
    const state = await getOnboardingState(page);
    expect(state.audio.sfxVolume).toBeCloseTo(0.5, 1);
  });

  test('ONB-014: Volume bounds (low)', async ({ page }) => {
    await terminalSubmit(page, 'music 0');
    
    const state = await getOnboardingState(page);
    expect(state.audio.musicVolume).toBe(0);
  });

  test('ONB-015: Volume bounds (high)', async ({ page }) => {
    await terminalSubmit(page, 'music 100');
    
    const state = await getOnboardingState(page);
    expect(state.audio.musicVolume).toBe(1);
  });

  test('ONB-017: Continue to next phase', async ({ page }) => {
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(1000);
    
    const phase = await getOnboardingPhase(page);
    expect(phase).toBe('visual');
  });

});

// ============================================================================
// SECTION 3: VISUAL CALIBRATION PHASE
// ============================================================================

test.describe('1.3 Phase 2: Visual Calibration', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await startOnboardingFromChat(page);
    
    // Advance to visual phase
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(300);
  });

  test('ONB-020: Visual phase displays', async ({ page }) => {
    const phase = await getOnboardingPhase(page);
    expect(phase).toBe('visual');
  });

  test('ONB-022: Set brightness', async ({ page }) => {
    await terminalSubmit(page, 'brightness 120');
    
    const state = await getOnboardingState(page);
    expect(state.visual.brightness).toBeCloseTo(1.2, 1);
  });

  test('ONB-023: Set contrast', async ({ page }) => {
    await terminalSubmit(page, 'contrast 80');
    
    const state = await getOnboardingState(page);
    expect(state.visual.contrast).toBeCloseTo(0.8, 1);
  });

  test('ONB-026: Continue to character', async ({ page }) => {
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(2000); // Character phase has more intro text
    
    const phase = await getOnboardingPhase(page);
    expect(phase).toBe('character');
  });

});

// ============================================================================
// SECTION 4: CHARACTER CREATION - IDENTITY
// ============================================================================

test.describe('1.4 Phase 3: Character Creation - Identity', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await startOnboardingFromChat(page);
    
    // Advance to character phase
    await terminalSubmit(page, 'continue'); // Skip audio
    await page.waitForTimeout(300);
    await terminalSubmit(page, 'continue'); // Skip visual
    await page.waitForTimeout(300);
  });

  test('ONB-030: Identity phase displays', async ({ page }) => {
    const phase = await getOnboardingPhase(page);
    expect(phase).toBe('character');
    
    const charPhase = await getCharacterPhase(page);
    expect(charPhase).toBe('identity');
  });

  test('ONB-031: Set character name', async ({ page }) => {
    await terminalSubmit(page, 'name John Doe');
    
    const state = await getOnboardingState(page);
    expect(state.character.name).toBe('John Doe');
  });

  test('ONB-032: Set handle', async ({ page }) => {
    await terminalSubmit(page, 'handle Chrome');
    
    const state = await getOnboardingState(page);
    expect(state.character.handle).toBe('Chrome');
  });

  test('ONB-033: Set pronouns', async ({ page }) => {
    await terminalSubmit(page, 'pronouns he/him');
    
    const state = await getOnboardingState(page);
    expect(state.character.pronouns).toBe('he/him');
  });

  test('ONB-034: Name with spaces', async ({ page }) => {
    await terminalSubmit(page, 'name Jane Mary Doe');
    
    const state = await getOnboardingState(page);
    expect(state.character.name).toBe('Jane Mary Doe');
  });

  test('ONB-035: Continue to portrait', async ({ page }) => {
    await terminalSubmit(page, 'name Test');
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(1000);
    
    const charPhase = await getCharacterPhase(page);
    expect(charPhase).toBe('portrait');
  });

});

// ============================================================================
// SECTION 4.5: CHARACTER CREATION - PORTRAIT
// ============================================================================

test.describe('1.4.5 Phase 3: Character Creation - Portrait', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await startOnboardingFromChat(page);
    
    // Advance to portrait phase
    await terminalSubmit(page, 'continue'); // Skip audio
    await page.waitForTimeout(300);
    await terminalSubmit(page, 'continue'); // Skip visual
    await page.waitForTimeout(300);
    await terminalSubmit(page, 'name Test');
    await terminalSubmit(page, 'continue'); // Skip identity -> portrait
    await page.waitForTimeout(300);
  });

  test('ONB-036: Portrait phase displays', async ({ page }) => {
    const phase = await getOnboardingPhase(page);
    expect(phase).toBe('character');
    
    const charPhase = await getCharacterPhase(page);
    expect(charPhase).toBe('portrait');
  });

  test('ONB-037: Select portrait by number', async ({ page }) => {
    await terminalSubmit(page, '1');
    
    const state = await getOnboardingState(page);
    expect(state.character.portrait).toBe('portrait_2');
  });

  test('ONB-038: Select portrait by command', async ({ page }) => {
    await terminalSubmit(page, 'portrait 2');
    
    const state = await getOnboardingState(page);
    expect(state.character.portrait).toBe('portrait_9');
  });

  test('ONB-039: Continue to background', async ({ page }) => {
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(500);
    
    const charPhase = await getCharacterPhase(page);
    expect(charPhase).toBe('background');
  });

  test('ONB-040: Portrait optional - can skip', async ({ page }) => {
    // Don't select a portrait, just continue
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(500);
    
    const state = await getOnboardingState(page);
    expect(state.character.portrait).toBeNull();
    
    const charPhase = await getCharacterPhase(page);
    expect(charPhase).toBe('background');
  });

});

// ============================================================================
// SECTION 5: CHARACTER CREATION - BACKGROUND
// ============================================================================

test.describe('1.5 Phase 3: Character Creation - Background', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await startOnboardingFromChat(page);
    
    // Advance to background phase
    await terminalSubmit(page, 'continue'); // Skip audio
    await page.waitForTimeout(300);
    await terminalSubmit(page, 'continue'); // Skip visual
    await page.waitForTimeout(300);
    await terminalSubmit(page, 'name Test');
    await terminalSubmit(page, 'continue'); // Skip identity -> portrait
    await page.waitForTimeout(300);
    await terminalSubmit(page, 'continue'); // Skip portrait -> background
    await page.waitForTimeout(300);
  });

  test('ONB-041: Select by number', async ({ page }) => {
    await terminalSubmit(page, '1');
    
    const state = await getOnboardingState(page);
    expect(state.character.background).toBe('street_kid');
  });

  test('ONB-042: Select by name', async ({ page }) => {
    await terminalSubmit(page, 'background corporate');
    
    const state = await getOnboardingState(page);
    expect(state.character.background).toBe('corporate');
  });

  test('ONB-045: Background applies skills', async ({ page }) => {
    await terminalSubmit(page, '1'); // Street Kid
    
    const state = await getOnboardingState(page);
    expect(state.character.skills.streetwise).toBe(1);
    expect(state.character.skills.melee).toBe(1);
  });

  test('ONB-046: Background sets debt', async ({ page }) => {
    await terminalSubmit(page, 'background corporate');
    
    const state = await getOnboardingState(page);
    expect(state.debt.baseDebt).toBe(15000);
  });

});

// ============================================================================
// SECTION 6: DEBT & EQUIPMENT PHASE
// ============================================================================

test.describe('1.6 Phase 4: Debt & Equipment', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await startOnboardingFromChat(page);
    
    // Fast-forward to debt phase
    await terminalSubmit(page, 'continue'); // Skip audio
    await page.waitForTimeout(500);
    await terminalSubmit(page, 'continue'); // Skip visual
    await page.waitForTimeout(1500);
    await terminalSubmit(page, 'name Test');
    await terminalSubmit(page, 'continue'); // Skip identity -> portrait
    await page.waitForTimeout(500);
    await terminalSubmit(page, 'continue'); // Skip portrait -> background
    await page.waitForTimeout(500);
    await terminalSubmit(page, '1'); // Select Street Kid
    await terminalSubmit(page, 'continue'); // Go to debt
    await page.waitForTimeout(1500);
  });

  test('ONB-050: Debt phase displays', async ({ page }) => {
    const phase = await getOnboardingPhase(page);
    expect(phase).toBe('debt');
  });

  test('ONB-053: Add package', async ({ page }) => {
    await terminalSubmit(page, 'add 1');
    
    const state = await getOnboardingState(page);
    expect(state.debt.selectedPackages).toContain('survival_kit');
    expect(state.debt.totalDebt).toBe(8000 + 2000); // Street Kid base + Survival Kit
  });

  test('ONB-054: Remove package', async ({ page }) => {
    await terminalSubmit(page, 'add 1');
    await terminalSubmit(page, 'remove 1');
    
    const state = await getOnboardingState(page);
    expect(state.debt.selectedPackages).not.toContain('survival_kit');
    expect(state.debt.totalDebt).toBe(8000); // Back to base
  });

  test('ONB-055: Max 3 packages', async ({ page }) => {
    await terminalSubmit(page, 'add 1');
    await terminalSubmit(page, 'add 2');
    await terminalSubmit(page, 'add 3');
    await terminalSubmit(page, 'add 4'); // Should fail
    
    const state = await getOnboardingState(page);
    expect(state.debt.selectedPackages.length).toBe(3);
  });

  test('ONB-056: No duplicate packages', async ({ page }) => {
    await terminalSubmit(page, 'add 1');
    await terminalSubmit(page, 'add 1'); // Should fail
    
    const state = await getOnboardingState(page);
    expect(state.debt.selectedPackages.filter((p: string) => p === 'survival_kit').length).toBe(1);
  });

});

// ============================================================================
// SECTION 7: DOCUMENT PRESENTATION & COMPLETION
// ============================================================================

test.describe('1.7-1.8 Documents & Completion', () => {
  
  test('ONB-070: Complete full onboarding flow', async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await startOnboardingFromChat(page);
    
    // Audio phase
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(500);
    
    // Visual phase
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(1500);
    
    // Identity phase
    await terminalSubmit(page, 'name Test Character');
    await terminalSubmit(page, 'handle TestHandle');
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(500);
    
    // Portrait phase (skip)
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(500);
    
    // Background phase
    await terminalSubmit(page, '1'); // Street Kid
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(1500);
    
    // Debt phase
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(4000); // Documents generation takes time
    
    // Documents phase - complete
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(3000);
    
    // Verify completion
    const phase = await getOnboardingPhase(page);
    expect(phase).toBe('complete');
    
    // Verify onboarding is no longer active
    const active = await isOnboardingActive(page);
    expect(active).toBe(false);
  });

  test('ONB-073: Character data saved', async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await startOnboardingFromChat(page);
    
    // Quick path through onboarding
    await terminalSubmit(page, 'continue'); // Audio
    await page.waitForTimeout(500);
    await terminalSubmit(page, 'continue'); // Visual
    await page.waitForTimeout(1500);
    await terminalSubmit(page, 'name Test Character');
    await terminalSubmit(page, 'handle Chrome');
    await terminalSubmit(page, 'pronouns they/them');
    await terminalSubmit(page, 'continue'); // Identity -> Portrait
    await page.waitForTimeout(500);
    await terminalSubmit(page, '1'); // Select portrait
    await terminalSubmit(page, 'continue'); // Portrait -> Background
    await page.waitForTimeout(500);
    await terminalSubmit(page, '2'); // Corporate
    await terminalSubmit(page, 'continue'); // Background -> Debt
    await page.waitForTimeout(1500);
    await terminalSubmit(page, 'add 1'); // Add survival kit
    await terminalSubmit(page, 'continue'); // Debt -> Documents
    await page.waitForTimeout(4000);
    await terminalSubmit(page, 'continue'); // Documents -> Complete
    await page.waitForTimeout(3000);
    
    // Get final state before it resets
    const state = await getOnboardingState(page);
    
    // Verify character data
    expect(state.character.name).toBe('Test Character');
    expect(state.character.handle).toBe('Chrome');
    expect(state.character.pronouns).toBe('they/them');
    expect(state.character.background).toBe('corporate');
    expect(state.debt.selectedPackages).toContain('survival_kit');
  });

});

// ============================================================================
// SECTION 8: CANCELLATION & ERROR HANDLING
// ============================================================================

test.describe('1.9 Cancellation & Error Handling', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
  });

  test('ONB-080: Cancel during audio', async ({ page }) => {
    await startOnboardingFromChat(page);
    
    await terminalSubmit(page, 'cancel');
    await page.waitForTimeout(1500);
    
    const active = await isOnboardingActive(page);
    expect(active).toBe(false);
  });

  test('ONB-081: Cancel during visual', async ({ page }) => {
    await startOnboardingFromChat(page);
    await terminalSubmit(page, 'continue'); // Go to visual
    await page.waitForTimeout(500);
    
    await terminalSubmit(page, 'cancel');
    await page.waitForTimeout(1500);
    
    const active = await isOnboardingActive(page);
    expect(active).toBe(false);
  });

  test('ONB-086: Command outside phase', async ({ page }) => {
    await startOnboardingFromChat(page);
    await terminalSubmit(page, 'continue'); // Go to visual
    await page.waitForTimeout(500);
    
    // Try audio command in visual phase
    await terminalSubmit(page, 'music 50');
    
    // Should still be in visual phase (command ignored)
    const phase = await getOnboardingPhase(page);
    expect(phase).toBe('visual');
  });

  test('ONB-087: Cancel alias quit', async ({ page }) => {
    await startOnboardingFromChat(page);
    
    await terminalSubmit(page, 'quit');
    await page.waitForTimeout(1500);
    
    const active = await isOnboardingActive(page);
    expect(active).toBe(false);
  });

  test('ONB-088: Cancel alias exit', async ({ page }) => {
    await startOnboardingFromChat(page);
    
    await terminalSubmit(page, 'exit');
    await page.waitForTimeout(1500);
    
    const active = await isOnboardingActive(page);
    expect(active).toBe(false);
  });

  test('ONB-090: State resets on cancel', async ({ page }) => {
    await startOnboardingFromChat(page);
    
    // Set some state
    await terminalSubmit(page, 'music 25');
    await terminalSubmit(page, 'cancel');
    await page.waitForTimeout(1500);
    
    // Restart onboarding via chat (more reliable than terminal)
    await chatCommand(page, '/onboard');
    
    // Wait for onboarding to become active
    await page.waitForFunction(() => {
      return typeof OnboardingManager !== 'undefined' && OnboardingManager.isActive();
    }, { timeout: 10000 });
    
    // Check state is fresh
    const state = await getOnboardingState(page);
    expect(state.audio.musicVolume).toBe(0.5); // Default value
  });

});

// ============================================================================
// SECTION 9: STATE TRACKING
// ============================================================================

test.describe('1.10 Onboarding State Persistence', () => {
  
  test('ONB-091: Phase tracking', async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await startOnboardingFromChat(page);
    
    // Check each phase
    expect(await getOnboardingPhase(page)).toBe('audio');
    
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(500);
    expect(await getOnboardingPhase(page)).toBe('visual');
    
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(1500);
    expect(await getOnboardingPhase(page)).toBe('character');
  });

  test('ONB-092: Active status', async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    
    // Not active before starting
    expect(await isOnboardingActive(page)).toBe(false);
    
    await startOnboardingFromChat(page);
    
    // Active during onboarding
    expect(await isOnboardingActive(page)).toBe(true);
    
    await terminalSubmit(page, 'cancel');
    await page.waitForTimeout(1500);
    
    // Not active after cancel
    expect(await isOnboardingActive(page)).toBe(false);
  });

  test('ONB-093: Character phase tracking', async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await startOnboardingFromChat(page);
    
    // Advance to character phase
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(500);
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(1500);
    
    expect(await getCharacterPhase(page)).toBe('identity');
    
    await terminalSubmit(page, 'name Test');
    await terminalSubmit(page, 'continue');
    await page.waitForTimeout(500);
    
    expect(await getCharacterPhase(page)).toBe('background');
  });

});
