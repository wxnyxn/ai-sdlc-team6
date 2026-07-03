// tests/02-todo-crud.spec.ts
// Features 01-02 — Todo CRUD + Priority E2E tests

import { test, expect } from '@playwright/test';
import { setupVirtualAuthenticator, TodoHelpers } from './helpers';

test.describe('Todo CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupVirtualAuthenticator(page);
    const username = `crud_user_${Date.now()}`;
    await page.goto('/login');
    await page.fill('input[placeholder*="username" i], input[name="username"]', username);
    await page.click('button:has-text("Register")');
    await page.waitForURL('/', { timeout: 15_000 });
  });

  test('create a new todo', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Buy groceries', 'medium');
    await expect(page.locator('text=Buy groceries')).toBeVisible();
  });

  test('created todo shows priority badge', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Urgent task', 'high');
    // High priority badge should be visible
    await expect(page.locator('text=High')).toBeVisible();
  });

  test('complete a todo', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Task to complete');
    // Check the checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();
    // Todo should move to completed section
    await expect(page.locator('text=Completed')).toBeVisible();
  });

  test('delete a todo with confirmation', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Todo to delete');

    // Accept the confirmation dialog
    page.on('dialog', (d) => d.accept());
    await page.click('button:has-text("Del")');

    await expect(page.locator('text=Todo to delete')).not.toBeVisible({ timeout: 5_000 });
  });

  test('edit a todo title', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Original title');

    await page.click('button:has-text("Edit")');
    const editInput = page.locator('input[value="Original title"]');
    await editInput.clear();
    await editInput.fill('Updated title');
    await page.click('button:has-text("Save")');

    await expect(page.locator('text=Updated title')).toBeVisible();
    await expect(page.locator('text=Original title')).not.toBeVisible();
  });

  test('search filters todos by title', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Apple pie recipe');
    await h.createTodo('Buy oranges');

    await page.fill('input[placeholder*="Search" i]', 'apple');
    await page.waitForTimeout(500); // Wait for debounce

    await expect(page.locator('text=Apple pie recipe')).toBeVisible();
    await expect(page.locator('text=Buy oranges')).not.toBeVisible();
  });

  test('clear filters button appears and works', async ({ page }) => {
    await page.selectOption('select:near(text=All Priorities)', 'high');
    await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible();
    await page.click('button:has-text("Clear Filters")');
    await expect(page.locator('button:has-text("Clear Filters")')).not.toBeVisible();
  });
});
