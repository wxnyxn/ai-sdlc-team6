// tests/01-authentication.spec.ts
// Feature 11 — WebAuthn Authentication E2E tests

import { test, expect } from '@playwright/test';
import { setupVirtualAuthenticator } from './helpers';

test.describe('Authentication', () => {
  test('register page is reachable', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/todo/i);
    await expect(page.locator('button:has-text("Register")')).toBeVisible();
  });

  test('register with virtual authenticator', async ({ page }) => {
    const { cdpSession } = await setupVirtualAuthenticator(page);
    const username = `e2e_user_${Date.now()}`;

    await page.goto('/login');
    await page.fill('input[placeholder*="username" i], input[name="username"]', username);
    await page.click('button:has-text("Register")');

    // Should redirect to main page after successful registration
    await page.waitForURL('/', { timeout: 15_000 });
    await expect(page.locator(`text=${username}`)).toBeVisible();

    await cdpSession.detach();
  });

  test('login with existing user', async ({ page }) => {
    const { cdpSession } = await setupVirtualAuthenticator(page);
    const username = `e2e_login_${Date.now()}`;

    // Register first
    await page.goto('/login');
    await page.fill('input[placeholder*="username" i], input[name="username"]', username);
    await page.click('button:has-text("Register")');
    await page.waitForURL('/', { timeout: 15_000 });

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('/login', { timeout: 5_000 });

    // Now login
    await page.fill('input[placeholder*="username" i], input[name="username"]', username);
    await page.click('button:has-text("Login"), button:has-text("Sign in")');
    await page.waitForURL('/', { timeout: 15_000 });
    await expect(page.locator(`text=${username}`)).toBeVisible();

    await cdpSession.detach();
  });

  test('unauthenticated users are redirected to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
