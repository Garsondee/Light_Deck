import { test, expect } from '@playwright/test';

test.describe('Light Deck VTT - Smoke Tests', () => {
  
  test('server is running and serves main page', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
  });

  test('main page has required elements', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to be ready
    await page.waitForLoadState('domcontentloaded');
    
    // Check for the main Three.js canvas (scene-canvas)
    const canvas = page.locator('#scene-canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test('music API returns track list', async ({ request }) => {
    const response = await request.get('/api/music');
    expect(response.ok()).toBeTruthy();
    
    const tracks = await response.json();
    expect(Array.isArray(tracks)).toBeTruthy();
  });

  test('scenes API returns scene list', async ({ request }) => {
    const response = await request.get('/api/scenes');
    expect(response.ok()).toBeTruthy();
    
    const scenes = await response.json();
    expect(Array.isArray(scenes)).toBeTruthy();
  });

});
