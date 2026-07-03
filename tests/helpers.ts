// tests/helpers.ts
// Shared test helpers for Playwright E2E tests.
// Provides reusable methods for common operations: createTodo, addSubtask, createTag, register, login.

import { type Page, type CDPSession } from '@playwright/test';

/**
 * Set up a virtual WebAuthn authenticator for the given page.
 * Must be called before any registration/login attempts.
 */
export async function setupVirtualAuthenticator(page: Page): Promise<{ cdpSession: CDPSession; authenticatorId: string }> {
  const cdpSession = await page.context().newCDPSession(page);

  await cdpSession.send('WebAuthn.enable', { enableUI: false });

  const { authenticatorId } = await cdpSession.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });

  return { cdpSession, authenticatorId };
}

/**
 * Register a new user and land on the main todo page.
 */
export async function registerAndLogin(page: Page, username = `testuser_${Date.now()}`): Promise<string> {
  await page.goto('/login');
  await page.fill('input[placeholder*="username" i], input[name="username"]', username);
  await page.click('button:has-text("Register")');
  // Wait for redirect to main page
  await page.waitForURL('/', { timeout: 15_000 });
  return username;
}

export class TodoHelpers {
  constructor(private page: Page) {}

  /**
   * Create a new todo with the given title (and optional priority).
   */
  async createTodo(title: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    await this.page.fill('input[placeholder*="new todo" i]', title);
    await this.page.selectOption('select', priority);
    await this.page.click('button:has-text("Add")');
    // Wait for the todo to appear in the list
    await this.page.waitForSelector(`text=${title}`, { timeout: 5_000 });
  }

  /**
   * Expand a todo's subtask area and add a subtask.
   */
  async addSubtask(todoTitle: string, subtaskTitle: string): Promise<void> {
    // Find the todo row and click expand
    const todoRow = this.page.locator(`text=${todoTitle}`).first();
    await todoRow.locator('..').locator('button[title*="Expand" i], button:has-text("►")').click();
    // Fill subtask input
    await this.page.fill('input[placeholder*="subtask" i]', subtaskTitle);
    await this.page.keyboard.press('Enter');
    await this.page.waitForSelector(`text=${subtaskTitle}`, { timeout: 5_000 });
  }

  /**
   * Create a new tag via the Tags modal.
   */
  async createTag(name: string, color = '#6b7280'): Promise<void> {
    await this.page.click('button:has-text("Tags")');
    await this.page.fill('input[placeholder*="tag name" i]', name);
    // Set color if color input is visible
    const colorInput = this.page.locator('input[type="color"]');
    if (await colorInput.isVisible()) {
      await colorInput.fill(color);
    }
    await this.page.click('button:has-text("Add"):near(input[placeholder*="tag name" i])');
    await this.page.waitForSelector(`text=${name}`, { timeout: 5_000 });
    await this.page.click('button:has-text("Close")');
  }
}
