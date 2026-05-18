import { defineConfig, devices } from "@playwright/test";

// When CATH_SERVICE_WEB_URL is set, tests run against the deployed environment
// and no local web server is needed
const deployedWebUrl = process.env.CATH_SERVICE_WEB_URL;
const baseURL = deployedWebUrl || "https://localhost:8080";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  reporter: process.env.CI
    ? [["line"], ["github"], ["junit", { outputFile: "junit-results.xml" }], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    headless: true,
    screenshot: "only-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
    // Ignore HTTPS errors for self-signed certificates
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  // Only start a local web server when not running against a deployed environment
  webServer: deployedWebUrl
    ? undefined
    : {
        // ENABLE_SSO=true required to test SSO flows (SSO disabled by default in development)
        // ENABLE_CFT_IDAM=true required to test CFT IDAM flows
        // ENABLE_CRIME_IDAM=true required to test Crime IDAM flows
        // GOVUK_NOTIFY_* required for notification tests
        // In CI: use dev:ci (skips docker-compose, service containers are used instead)
        // Locally: use dev:nowatch (starts docker-compose and runs migrations)
        command: process.env.CI
          ? `NODE_ENV=development ENABLE_SSO=true ENABLE_CFT_IDAM=true ENABLE_CRIME_IDAM=true CRIME_IDAM_BASE_URL="${process.env.CRIME_IDAM_BASE_URL || "https://login.sit.cjscp.org.uk"}" CRIME_IDAM_CLIENT_ID="${process.env.CRIME_IDAM_CLIENT_ID || ""}" CRIME_IDAM_CLIENT_SECRET="${process.env.CRIME_IDAM_CLIENT_SECRET || ""}" GOVUK_NOTIFY_API_KEY="${process.env.GOVUK_NOTIFY_API_KEY || ""}" GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION="${process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION || ""}" GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY="${process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY || ""}" yarn dev:ci`
          : `NODE_ENV=development ENABLE_SSO=true ENABLE_CFT_IDAM=true ENABLE_CRIME_IDAM=true CRIME_IDAM_BASE_URL="${process.env.CRIME_IDAM_BASE_URL || "https://login.sit.cjscp.org.uk"}" CRIME_IDAM_CLIENT_ID="${process.env.CRIME_IDAM_CLIENT_ID || ""}" CRIME_IDAM_CLIENT_SECRET="${process.env.CRIME_IDAM_CLIENT_SECRET || ""}" GOVUK_NOTIFY_API_KEY="${process.env.GOVUK_NOTIFY_API_KEY || ""}" GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION="${process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION || ""}" GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY="${process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION_PDF_ONLY || ""}" yarn dev:nowatch`,
        // Check port instead of URL to avoid HTTPS certificate issues
        port: 8080,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        cwd: "..",
        stdout: "pipe",
        stderr: "pipe"
      },
  // Longer timeout for SSO tests (Azure AD redirects)
  timeout: 60 * 1000
});
