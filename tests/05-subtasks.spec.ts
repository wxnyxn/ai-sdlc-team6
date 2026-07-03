// tests/05-subtasks.spec.ts
// Feature 05 — Subtasks & progress tracking E2E tests

import { test, expect } from '@playwright/test';
import { setupVirtualAuthenticator, TodoHelpers } from './helpers';

test.describe('Subtasks', () => {
  test.beforeEach(async ({ page }) => {
    await setupVirtualAuthenticator(page);
    const username = `subtask_user_${Date.now()}`;
    await page.goto('/login');
    await page.fill('input[placeholder*="username" i], input[name="username"]', username);
    await page.click('button:has-text("Register")');
    await page.waitForURL('/', { timeout: 15_000 });
  });

  test('add a subtask to a todo', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Project planning');
    await h.addSubtask('Project planning', 'Write specification');
    await expect(page.locator('text=Write specification')).toBeVisible();
  });

  test('progress bar appears when subtasks exist', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Multi-step task');
    await h.addSubtask('Multi-step task', 'Step 1');
    await h.addSubtask('Multi-step task', 'Step 2');

    // Progress bar should be visible
    await expect(page.locator('text=Progress')).toBeVisible();
    await expect(page.locator('text=0/2 (0%)')).toBeVisible();
  });

  test('progress bar turns green when all subtasks complete', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Small task');
    await h.addSubtask('Small task', 'Only step');

    // Complete the subtask
    const subtaskCheckbox = page.locator('input[type="checkbox"]').last();
    await subtaskCheckbox.check();

    // Progress bar should show 100%
    await expect(page.locator('text=1/1 (100%)')).toBeVisible();
    // Should have green class
    await expect(page.locator('.bg-green-500')).toBeVisible();
  });

  test('delete a subtask', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Task with subtask');
    await h.addSubtask('Task with subtask', 'Remove this step');

    // Hover over the subtask to show delete button
    const subtaskItem = page.locator('text=Remove this step');
    await subtaskItem.hover();
    await page.locator('button:has-text("×"):near(text=Remove this step)').click();

    await expect(page.locator('text=Remove this step')).not.toBeVisible({ timeout: 5_000 });
  });
});
