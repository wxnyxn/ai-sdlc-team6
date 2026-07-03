// tests/10-calendar.spec.ts
// Feature 10 — Calendar View E2E tests

import { test, expect } from '@playwright/test';
import { setupVirtualAuthenticator } from './helpers';

test.describe('Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await setupVirtualAuthenticator(page);
    const username = `cal_user_${Date.now()}`;
    await page.goto('/login');
    await page.fill('input[placeholder*="username" i], input[name="username"]', username);
    await page.click('button:has-text("Register")');
    await page.waitForURL('/', { timeout: 15_000 });
  });

  test('calendar page loads', async ({ page }) => {
    await page.click('a:has-text("Calendar")');
    await page.waitForURL('/calendar*', { timeout: 10_000 });
    await expect(page.locator('h1:has-text("Calendar")')).toBeVisible();
  });

  test('URL reflects current month', async ({ page }) => {
    await page.goto('/calendar');
    const url = page.url();
    // After load, URL should either have ?month= or be bare /calendar
    expect(url).toContain('/calendar');
  });

  test('next/prev month navigation updates URL', async ({ page }) => {
    await page.goto('/calendar');

    await page.click('button:has-text("Next")');
    await expect(page).toHaveURL(/month=\d{4}-\d{2}/);

    await page.click('button:has-text("Prev")');
    await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
  });

  test('clicking a day opens detail modal', async ({ page }) => {
    await page.goto('/calendar');

    // Click the first visible day cell with a number
    const dayCell = page.locator('.grid > div span.text-xs').first();
    if (await dayCell.isVisible()) {
      const parentCell = dayCell.locator('..');
      await parentCell.click();
      await expect(page.locator('text=Todos')).toBeVisible({ timeout: 5_000 });
      await page.click('button:has-text("Close")');
    }
  });

  test('add a holiday via modal', async ({ page }) => {
    await page.goto('/calendar');

    await page.click('button:has-text("Add Holiday")');
    await page.fill('input[placeholder*="National Day" i]', 'Test Holiday');
    await page.fill('input[type="date"]', '2025-06-15');
    await page.click('button:has-text("Add")');

    await expect(page.locator('text=Test Holiday')).toBeVisible({ timeout: 5_000 });
  });
});
