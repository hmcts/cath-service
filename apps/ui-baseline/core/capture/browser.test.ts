import { chromium } from "playwright";
import { afterEach, describe, expect, it, vi } from "vitest";
import { launchChromium } from "./browser.js";

vi.mock("playwright", () => ({ chromium: { launch: vi.fn().mockResolvedValue({ name: "browser" }) } }));

describe("launchChromium", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should launch Playwright's own Chromium when no executable path is set", async () => {
    // Arrange
    vi.stubEnv("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH", "");

    // Act
    const browser = await launchChromium();

    // Assert
    expect(browser).toEqual({ name: "browser" });
    expect(chromium.launch).toHaveBeenLastCalledWith({ executablePath: undefined });
  });

  it("should launch the Chromium at PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH when it is set", async () => {
    // Arrange
    vi.stubEnv("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH", "/usr/bin/chromium-browser");

    // Act
    await launchChromium();

    // Assert
    expect(chromium.launch).toHaveBeenLastCalledWith({ executablePath: "/usr/bin/chromium-browser" });
  });
});
