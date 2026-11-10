import { chromium } from "playwright";
import { afterEach, describe, expect, it, vi } from "vitest";
import { acceptsUnverifiedCertificate, launchChromium } from "./browser.js";

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

describe("acceptsUnverifiedCertificate", () => {
  it("should accept a self-signed certificate only from this machine or Docker Desktop on the host", () => {
    // Arrange
    const local = ["https://localhost:8180", "http://127.0.0.1:8080/x", "https://[::1]:8443", "https://host.docker.internal:8180", "https://cath.localhost"];
    const deployed = [
      "https://cath.aat.platform.hmcts.net",
      "https://idam-web-public.aat.platform.hmcts.net/login",
      "https://localhost.attacker.example",
      "not a url"
    ];

    // Act
    const results = [...local, ...deployed].map((url) => [url, acceptsUnverifiedCertificate(url)]);

    // Assert
    expect(results).toEqual([...local.map((url) => [url, true]), ...deployed.map((url) => [url, false])]);
  });
});
