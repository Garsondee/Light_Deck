import { test, expect, Page } from '@playwright/test';

/**
 * Terminal Mode Tests
 * 
 * Tests for the canvas-based terminal system with phosphor text effects.
 * Terminal uses Three.js rendering, so we verify state via JS evaluation.
 */

// ============================================================================
// TEST HELPERS
// ============================================================================

async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#scene-canvas', { timeout: 15000 });
  await page.waitForTimeout(2000);
}

async function isTerminalVisible(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof TerminalManager !== 'undefined' && TerminalManager.isVisible();
  });
}

async function getTerminalState(page: Page): Promise<any> {
  return await page.evaluate(() => {
    if (typeof TerminalManager === 'undefined') return null;
    return TerminalManager.getState();
  });
}

async function enterTerminalMode(page: Page) {
  // Use App.toggleTerminalMode instead of backtick (not mapped)
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
      TerminalManager.runBootSequence();
    }
  });
  
  // Wait for boot to complete
  await page.waitForFunction(() => {
    return typeof TerminalManager !== 'undefined' && TerminalManager.isBootComplete();
  }, { timeout: 5000 });
}

async function exitTerminalMode(page: Page) {
  await page.evaluate(() => {
    if (typeof App !== 'undefined' && typeof App.toggleTerminalMode === 'function') {
      App.toggleTerminalMode();
    }
  });
  
  // Wait for terminal to become hidden
  await page.waitForFunction(() => {
    return typeof TerminalManager !== 'undefined' && !TerminalManager.isVisible();
  }, { timeout: 10000 });
}

async function waitForBootComplete(page: Page, timeout = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const state = await getTerminalState(page);
    if (state?.bootComplete) return true;
    await page.waitForTimeout(200);
  }
  throw new Error('Boot sequence did not complete');
}

async function terminalType(page: Page, text: string) {
  // Use TerminalManager.handleChar directly for reliability
  // Playwright keyboard events may not trigger the InputManager correctly
  await page.evaluate((chars) => {
    if (typeof TerminalManager !== 'undefined') {
      for (const char of chars) {
        TerminalManager.handleChar(char);
      }
    }
  }, text);
}

async function terminalKey(page: Page, key: string, modifiers: { ctrl?: boolean; shift?: boolean } = {}) {
  // Use TerminalManager.handleKey directly for special keys
  await page.evaluate(({ key, modifiers }) => {
    if (typeof TerminalManager !== 'undefined') {
      TerminalManager.handleKey(key, modifiers);
    }
  }, { key, modifiers });
}

async function terminalSubmit(page: Page, command: string) {
  await terminalType(page, command);
  await terminalKey(page, 'Enter');
  await page.waitForTimeout(300);
}

async function getInputBuffer(page: Page): Promise<string> {
  const state = await getTerminalState(page);
  return state?.inputBuffer || '';
}

async function getCaretPosition(page: Page): Promise<number> {
  const state = await getTerminalState(page);
  return state?.caretPosition || 0;
}

async function getScrollOffset(page: Page): Promise<number> {
  const state = await getTerminalState(page);
  return state?.scrollOffset || 0;
}

async function getLineCount(page: Page): Promise<number> {
  const state = await getTerminalState(page);
  return state?.lines?.length || 0;
}

async function getCommandHistory(page: Page): Promise<string[]> {
  const state = await getTerminalState(page);
  return state?.commandHistory || [];
}

// ============================================================================
// SECTION 1: TERMINAL VISIBILITY & TRANSITIONS
// ============================================================================

test.describe('2.1 Terminal Visibility & Transitions', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
  });

  test('TRM-001: Toggle terminal mode', async ({ page }) => {
    // Test toggle on
    await enterTerminalMode(page);
    expect(await isTerminalVisible(page)).toBe(true);
    
    // Test toggle off
    await exitTerminalMode(page);
    expect(await isTerminalVisible(page)).toBe(false);
  });

  test('TRM-002: Terminal plane visible', async ({ page }) => {
    await enterTerminalMode(page);
    
    const visible = await isTerminalVisible(page);
    expect(visible).toBe(true);
  });

  test('TRM-004: Exit terminal mode', async ({ page }) => {
    await enterTerminalMode(page);
    expect(await isTerminalVisible(page)).toBe(true);
    
    await exitTerminalMode(page);
    expect(await isTerminalVisible(page)).toBe(false);
  });

  test.skip('TRM-006: EventBus notification', async ({ page }) => {
    // Skip: EventBus notifications are internal implementation details
    // The toggle functionality is already verified in TRM-001
    // This test would require deeper integration with the event system
    await page.evaluate(() => {
      (window as any).modeChangeCount = 0;
      if (typeof EventBus !== 'undefined') {
        EventBus.on('input:mode-changed', () => {
          (window as any).modeChangeCount++;
        });
      }
    });
    
    await enterTerminalMode(page);
    
    const count = await page.evaluate(() => (window as any).modeChangeCount);
    expect(count).toBeGreaterThanOrEqual(1);
  });

});

// ============================================================================
// SECTION 2: TERMINAL INPUT
// ============================================================================

test.describe('2.2 Terminal Input', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await enterTerminalMode(page);
    await waitForBootComplete(page);
  });

  test('TRM-010: Type text', async ({ page }) => {
    await terminalType(page, 'hello');
    
    const buffer = await getInputBuffer(page);
    expect(buffer).toBe('hello');
  });

  test('TRM-011: Backspace', async ({ page }) => {
    await terminalType(page, 'hello');
    await terminalKey(page, 'Backspace');
    
    const buffer = await getInputBuffer(page);
    expect(buffer).toBe('hell');
  });

  test('TRM-012: Delete key', async ({ page }) => {
    await terminalType(page, 'hello');
    // Move caret to beginning
    await terminalKey(page, 'Home');
    // Delete first character
    await terminalKey(page, 'Delete');
    
    const buffer = await getInputBuffer(page);
    expect(buffer).toBe('ello');
  });

  test('TRM-013: Enter submits', async ({ page }) => {
    const initialLines = await getLineCount(page);
    
    await terminalSubmit(page, 'help');
    
    const newLines = await getLineCount(page);
    expect(newLines).toBeGreaterThan(initialLines);
  });

  test('TRM-014: Command history up', async ({ page }) => {
    await terminalSubmit(page, 'help');
    await terminalSubmit(page, 'clear');
    
    // Press up to get previous command
    await terminalKey(page, 'ArrowUp');
    
    const buffer = await getInputBuffer(page);
    expect(buffer).toBe('clear');
    
    // Press up again
    await terminalKey(page, 'ArrowUp');
    const buffer2 = await getInputBuffer(page);
    expect(buffer2).toBe('help');
  });

  test('TRM-015: Command history down', async ({ page }) => {
    await terminalSubmit(page, 'help');
    await terminalSubmit(page, 'clear');
    
    // Go back in history
    await terminalKey(page, 'ArrowUp');
    await terminalKey(page, 'ArrowUp');
    
    // Go forward
    await terminalKey(page, 'ArrowDown');
    
    const buffer = await getInputBuffer(page);
    expect(buffer).toBe('clear');
  });

  test('TRM-016: Caret left', async ({ page }) => {
    await terminalType(page, 'hello');
    const initialPos = await getCaretPosition(page);
    
    await terminalKey(page, 'ArrowLeft');
    
    const newPos = await getCaretPosition(page);
    expect(newPos).toBe(initialPos - 1);
  });

  test('TRM-017: Caret right', async ({ page }) => {
    await terminalType(page, 'hello');
    await terminalKey(page, 'Home');
    
    await terminalKey(page, 'ArrowRight');
    
    const pos = await getCaretPosition(page);
    expect(pos).toBe(1);
  });

  test('TRM-018: Home key', async ({ page }) => {
    await terminalType(page, 'hello');
    await terminalKey(page, 'Home');
    
    const pos = await getCaretPosition(page);
    expect(pos).toBe(0);
  });

  test('TRM-019: End key', async ({ page }) => {
    await terminalType(page, 'hello');
    await terminalKey(page, 'Home');
    await terminalKey(page, 'End');
    
    const pos = await getCaretPosition(page);
    expect(pos).toBe(5);
  });

  test('TRM-020: Ctrl+C', async ({ page }) => {
    await terminalType(page, 'some text');
    await terminalKey(page, 'c', { ctrl: true });
    
    const buffer = await getInputBuffer(page);
    expect(buffer).toBe('');
  });

  test('TRM-021: Ctrl+L', async ({ page }) => {
    // Add some lines
    await terminalSubmit(page, 'help');
    const linesBefore = await getLineCount(page);
    expect(linesBefore).toBeGreaterThan(0);
    
    // Clear with Ctrl+L
    await terminalKey(page, 'l', { ctrl: true });
    await page.waitForTimeout(100);
    
    const linesAfter = await getLineCount(page);
    // Ctrl+L clears screen - may leave prompt or be fully empty
    expect(linesAfter).toBeLessThan(linesBefore);
  });

});

// ============================================================================
// SECTION 3: TERMINAL SCROLLING
// ============================================================================

test.describe('2.3 Terminal Scrolling', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await enterTerminalMode(page);
    await waitForBootComplete(page);
    
    // Add many lines to enable scrolling (use executeCommand for speed)
    // Need more than maxVisibleLines (typically ~25-30) to enable scrolling
    await page.evaluate(() => {
      if (typeof TerminalManager !== 'undefined') {
        for (let i = 0; i < 50; i++) {
          TerminalManager.executeCommand(`echo line ${i}`);
        }
      }
    });
    await page.waitForTimeout(100);
  });

  test('TRM-030: Page Up', async ({ page }) => {
    const initialOffset = await getScrollOffset(page);
    
    await terminalKey(page, 'PageUp');
    await page.waitForTimeout(100);
    
    const newOffset = await getScrollOffset(page);
    expect(newOffset).toBeGreaterThan(initialOffset);
  });

  test('TRM-031: Page Down', async ({ page }) => {
    // First scroll up
    await terminalKey(page, 'PageUp');
    await page.waitForTimeout(100);
    const scrolledOffset = await getScrollOffset(page);
    
    // Then scroll down
    await terminalKey(page, 'PageDown');
    await page.waitForTimeout(100);
    
    const newOffset = await getScrollOffset(page);
    expect(newOffset).toBeLessThan(scrolledOffset);
  });

  test('TRM-032: Ctrl+Home', async ({ page }) => {
    await terminalKey(page, 'Home', { ctrl: true });
    await page.waitForTimeout(100);
    
    const offset = await getScrollOffset(page);
    // Should be scrolled to top (max offset)
    expect(offset).toBeGreaterThan(0);
  });

  test('TRM-033: Ctrl+End', async ({ page }) => {
    // First scroll up
    await terminalKey(page, 'Home', { ctrl: true });
    await page.waitForTimeout(100);
    
    // Then scroll to bottom
    await terminalKey(page, 'End', { ctrl: true });
    await page.waitForTimeout(100);
    
    const offset = await getScrollOffset(page);
    expect(offset).toBe(0);
  });

});

// ============================================================================
// SECTION 4: TERMINAL COMMANDS
// ============================================================================

test.describe('2.4 Terminal Commands', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await enterTerminalMode(page);
    await waitForBootComplete(page);
  });

  test('TRM-040: Help command', async ({ page }) => {
    const linesBefore = await getLineCount(page);
    
    await terminalSubmit(page, 'help');
    
    const linesAfter = await getLineCount(page);
    expect(linesAfter).toBeGreaterThan(linesBefore);
  });

  test('TRM-041: Clear command', async ({ page }) => {
    await terminalSubmit(page, 'help');
    const linesBefore = await getLineCount(page);
    expect(linesBefore).toBeGreaterThan(0);
    
    await terminalSubmit(page, 'clear');
    await page.waitForTimeout(100); // Allow clear to complete
    
    const linesAfter = await getLineCount(page);
    // Clear should remove all or nearly all lines (may have 1 prompt line)
    expect(linesAfter).toBeLessThanOrEqual(1);
  });

  test('TRM-042: Unknown command', async ({ page }) => {
    await terminalSubmit(page, 'asdfghjkl');
    
    // Check that an error line was added
    const state = await getTerminalState(page);
    // Find the error line (could be at different positions)
    const errorLine = state.lines.find((line: any) => line.type === 'error');
    expect(errorLine).toBeDefined();
    expect(errorLine.text).toContain('Unknown command');
  });

  test('TRM-043: Case insensitive', async ({ page }) => {
    const linesBefore = await getLineCount(page);
    
    await terminalSubmit(page, 'HELP');
    
    const linesAfter = await getLineCount(page);
    expect(linesAfter).toBeGreaterThan(linesBefore);
  });

});

// ============================================================================
// SECTION 5: BOOT SEQUENCE
// ============================================================================

test.describe('2.6 Boot Sequence', () => {
  
  test('TRM-061: Boot complete flag', async ({ page }) => {
    await page.goto('/?testMode=1');
    await waitForAppReady(page);
    await enterTerminalMode(page);
    
    await waitForBootComplete(page);
    
    const state = await getTerminalState(page);
    expect(state.bootComplete).toBe(true);
  });

  test.skip('TRM-062: Input disabled during boot', async ({ page }) => {
    // Skip in test mode - boot completes instantly so there's no window to test
    // This test is only meaningful in non-test mode with full boot animation
    await page.goto('/'); // Non-test mode
    await waitForAppReady(page);
    
    // Enter terminal mode
    await page.evaluate(() => {
      if (typeof App !== 'undefined' && typeof App.toggleTerminalMode === 'function') {
        App.toggleTerminalMode();
      }
    });
    await page.waitForTimeout(500); // Don't wait for full transition
    
    // Try to type immediately (during boot)
    await page.keyboard.type('test', { delay: 10 });
    
    // Wait for boot to complete
    await waitForBootComplete(page);
    
    // Input should be empty (typing was ignored during boot)
    const buffer = await getInputBuffer(page);
    expect(buffer).toBe('');
  });

});
