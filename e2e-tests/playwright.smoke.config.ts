import { defineConfig } from "@playwright/test";

// Runs API-only smoke specs against a deployed API: no global seeding, no local web server
export default defineConfig({
  testDir: "./tests/smoke",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 30 * 1000,
  reporter: process.env.CI ? [["line"], ["github"], ["junit", { outputFile: "junit-results.xml" }]] : "list",
  use: {
    ignoreHTTPSErrors: true
  }
});
