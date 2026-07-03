// tests/06-tags.spec.ts
// Feature 06 — Tag Management E2E tests

import { test, expect } from '@playwright/test';
import { setupVirtualAuthenticator, TodoHelpers } from './helpers';

test.describe('Tags', () => {
  test.beforeEach(async ({ page }) => {
    await setupVirtualAuthenticator(page);
    const username = `tag_user_${Date.now()}`;
    await page.goto('/login');
    await page.fill('input[placeholder*="username" i], input[name="username"]', username);
    await page.click('button:has-text("Register")');
    await page.waitForURL('/', { timeout: 15_000 });
  });

  test('create a tag', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTag('Work');
    // After closing the modal, open it again to verify the tag exists
    await page.click('button:has-text("Tags")');
    await expect(page.locator('text=Work')).toBeVisible();
    await page.click('button:has-text("Close")');
  });

  test('assign tag to todo and filter by tag', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Tagged item');
    await h.createTag('Personal');

    // Expand the todo and add the tag
    await page.click('button[title*="Expand" i], button:has-text("►")');
    const tagSelect = page.locator('select:near(text=Tags)').first();
    await tagSelect.selectOption({ label: 'Personal' });

    // Enable advanced filter and filter by tag
    await page.click('button:has-text("Advanced")');
    await page.click('button:has-text("Personal")');

    await expect(page.locator('text=Tagged item')).toBeVisible();
  });

  test('search matches tag name', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Meeting notes');
    await h.createTag('Work');

    // Expand todo and add Work tag
    await page.click('button[title*="Expand" i], button:has-text("►")');
    const tagSelect = page.locator('select:near(text=Tags)').first();
    await tagSelect.selectOption({ label: 'Work' });
    await page.click('button[title*="Collapse" i], button:has-text("▼")');

    // Search by tag name
    await page.fill('input[placeholder*="Search" i]', 'Work');
    await page.waitForTimeout(500); // Debounce delay

    await expect(page.locator('text=Meeting notes')).toBeVisible();
  });

  test('delete a tag', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTag('ToDelete');

    await page.click('button:has-text("Tags")');
    await page.click('button:has-text("Delete"):near(text=ToDelete)');
    await expect(page.locator('text=ToDelete')).not.toBeVisible();
    await page.click('button:has-text("Close")');
  });
});
