import { defineConfig, devices } from "@playwright/test";

const isDeployed = !!process.env.CATH_SERVICE_WEB_URL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  ...(isDeployed ? {} : { globalSetup: "./global-setup.ts", globalTeardown: "./global-teardown.ts" }),
  reporter: process.env.CI
    ? [["dot"], ["github"], ["junit", { outputFile: "junit-results.xml" }], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : "list",
  use: {
    baseURL: process.env.CATH_SERVICE_WEB_URL || "https://localhost:8080",
    trace: "on-first-retry",
    headless: true,
    screenshot: "only-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  ...(isDeployed
    ? {}
    : {
        webServer: {
          command: process.env.CI
            ? `NODE_ENV=development ENABLE_SSO=true ENABLE_CFT_IDAM=true ENABLE_B2C=true GOVUK_NOTIFY_API_KEY="${process.env.GOVUK_NOTIFY_API_KEY || ""}" GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION="${process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION || ""}" yarn dev:ci`
            : `NODE_ENV=development ENABLE_SSO=true ENABLE_CFT_IDAM=true ENABLE_B2C=true GOVUK_NOTIFY_API_KEY="${process.env.GOVUK_NOTIFY_API_KEY || ""}" GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION="${process.env.GOVUK_NOTIFY_TEMPLATE_ID_SUBSCRIPTION || ""}" yarn dev:nowatch`,
          port: 8080,
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
          cwd: "..",
          stdout: "pipe",
          stderr: "pipe"
        }
      }),
  timeout: 60 * 1000
});
