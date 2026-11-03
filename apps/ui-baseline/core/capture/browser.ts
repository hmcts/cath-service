import { type Browser, chromium } from "playwright";

// Playwright's own Chromium, or the one at PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: Playwright's
// builds do not run on Alpine, so the hosted check's image uses Alpine's Chromium instead
export function launchChromium(): Promise<Browser> {
  return chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
}
