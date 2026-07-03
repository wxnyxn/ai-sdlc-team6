import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration
 * Uses virtual WebAuthn authenticators (Chromium only).
 * Singapore timezone set to match app locale.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // WebAuthn tests share browser state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker so tests run sequentially
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Singapore timezone
    timezoneId: 'Asia/Singapore',
    locale: 'en-SG',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enable virtual WebAuthn authenticator via Chrome DevTools Protocol flags
        launchOptions: {
          args: [
            '--enable-features=WebAuthenticationVirtualAuthenticatorEnvironment',
          ],
        },
      },
    },
  ],

  // Start Next.js dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
