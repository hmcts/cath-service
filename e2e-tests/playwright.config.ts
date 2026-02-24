import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
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
    // ENABLE_SSO=true required to test SSO flows (SSO disabled by default in development)
    // ENABLE_CFT_IDAM=true required to test CFT IDAM flows
    // GOVUK_NOTIFY_* required for notification tests
    // In CI: use dev:ci (skips docker-compose, service containers are used instead)
    // Locally: use dev:nowatch (starts docker-compose and runs migrations)
    command: process.env.CI
      ? `NODE_ENV=development ENABLE_SSO=true ENABLE_CFT_IDAM=true GOVUK_NOTIFY_TEST_API_KEY="${process.env.GOVUK_NOTIFY_TEST_API_KEY || ''}" GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION="${process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION || ''}" GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY="${process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY || ''}" GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY="${process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY || ''}" yarn dev:ci`
      : `NODE_ENV=development ENABLE_SSO=true ENABLE_CFT_IDAM=true GOVUK_NOTIFY_TEST_API_KEY="${process.env.GOVUK_NOTIFY_TEST_API_KEY || ''}" GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION="${process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION || ''}" GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY="${process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_AND_SUMMARY || ''}" GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY="${process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_SUMMARY_ONLY || ''}" yarn dev:nowatch`,
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