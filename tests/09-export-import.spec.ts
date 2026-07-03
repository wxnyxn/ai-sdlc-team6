// tests/09-export-import.spec.ts
// Feature 09 — Export/Import E2E tests

import { test, expect } from '@playwright/test';
import { setupVirtualAuthenticator, TodoHelpers } from './helpers';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

test.describe('Export / Import', () => {
  test.beforeEach(async ({ page }) => {
    await setupVirtualAuthenticator(page);
    const username = `export_user_${Date.now()}`;
    await page.goto('/login');
    await page.fill('input[placeholder*="username" i], input[name="username"]', username);
    await page.click('button:has-text("Register")');
    await page.waitForURL('/', { timeout: 15_000 });
  });

  test('export JSON includes version field', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Export test todo');

    // Intercept the export request to check the response
    const exportRes = await page.evaluate(async () => {
      const r = await fetch('/api/todos/export');
      return r.json();
    });

    expect(exportRes).toHaveProperty('version', '1.0');
    expect(exportRes).toHaveProperty('todos');
  });

  test('export and re-import todos', async ({ page }) => {
    const h = new TodoHelpers(page);
    await h.createTodo('Import me please');

    // Get export data
    const exportData = await page.evaluate(async () => {
      const r = await fetch('/api/todos/export');
      return r.json();
    });

    expect(exportData.todos.length).toBeGreaterThan(0);

    // Write to temp file and use it for import
    const tmpFile = path.join(os.tmpdir(), `todos-test-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(exportData));

    // Import via hidden file input
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('button:has-text("Data")'),
    ]);
    // Should have opened the data menu
    await page.click('button:has-text("Import JSON")');

    // Clean up
    fs.unlinkSync(tmpFile);
  });
});
