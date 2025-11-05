import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI
    ? [
        ['dot'],
        ['github'],
        ['junit', { outputFile: 'junit-results.xml' }],
        ['html', { outputFolder: 'playwright-report', open: 'never' }]
      ]
    : 'list',
  use: {
    baseURL: 'https://localhost:8080',
    trace: 'on-first-retry',
    headless: true,
    screenshot: "only-on-failure",
    video: process.env.CI ? 'retain-on-failure' : 'off',
    // Ignore HTTPS errors for self-signed certificates
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'NODE_ENV=development yarn dev:nowatch',
    // Check port instead of URL to avoid HTTPS certificate issues
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    cwd: '..',
    stdout: 'pipe',
    stderr: 'pipe',
  },
  // Longer timeout for SSO tests (Azure AD redirects)
  timeout: 60 * 1000,
});