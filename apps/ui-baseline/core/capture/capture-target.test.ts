import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Browser } from "playwright";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { capturePage, expandAll } from "./capture-page.js";
import { captureTarget } from "./capture-target.js";
import { settle, trackRequests } from "./settle.js";

vi.mock("./capture-page.js", () => ({ capturePage: vi.fn(), expandAll: vi.fn() }));
vi.mock("./settle.js", () => ({
  trackRequests: vi.fn(),
  settle: vi.fn().mockResolvedValue(undefined),
  gotoSettled: vi.fn((page: { goto: (url: string, options: unknown) => Promise<unknown> }, url: string) => page.goto(url, { waitUntil: "load" }))
}));

function fakeBrowser(status: number | null = 200) {
  const page = {
    goto: vi.fn().mockResolvedValue(status === null ? null : { status: () => status }),
    evaluate: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    viewportSize: vi.fn(() => ({ width: 1280, height: 800 })),
    content: vi.fn().mockResolvedValue("<html>broken</html>")
  };
  const context = { newPage: vi.fn().mockResolvedValue(page), addCookies: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
  const browser = { newContext: vi.fn().mockResolvedValue(context) };
  return { browser, context, page };
}

describe("captureTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(capturePage).mockImplementation(async (_page, outDir) => {
      await mkdir(outDir, { recursive: true });
      return { url: "http://localhost/page" } as never;
    });
    vi.mocked(expandAll).mockResolvedValue(false);
  });

  it("should not accept a certificate it cannot verify from a deployed CaTH", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-target-"));
    const { browser } = fakeBrowser();

    // Act
    await captureTarget(browser as unknown as Browser, { id: "home", url: "https://cath.aat.platform.hmcts.net/page" }, { outDir });

    // Assert
    expect(browser.newContext).toHaveBeenCalledWith(expect.objectContaining({ ignoreHTTPSErrors: false }));
  });

  it("should capture the default state with provenance and an index line when the page has nothing collapsed", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-target-"));
    const { browser, context, page } = fakeBrowser();

    // Act
    const results = await captureTarget(
      browser as unknown as Browser,
      { id: "home", url: "http://localhost/page", source: { fixture: "civil" } },
      { outDir, region: "#main" }
    );

    // Assert
    expect(results).toEqual([{ ok: true, id: "home", locale: "en", state: "default", outDir: path.join(outDir, "home/en/default"), status: 200 }]);
    expect(browser.newContext).toHaveBeenCalledWith({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      locale: "en-GB",
      timezoneId: "Europe/London",
      reducedMotion: "reduce",
      ignoreHTTPSErrors: true
    });
    expect(page.goto).toHaveBeenCalledWith("http://localhost/page", { waitUntil: "load" });
    expect(trackRequests).toHaveBeenCalledWith(context);
    expect(capturePage).toHaveBeenCalledWith(page, path.join(outDir, "home/en/default"), { region: "#main", status: 200 });
    expect(context.addCookies).not.toHaveBeenCalled();
    expect(context.close).toHaveBeenCalledTimes(1);
    const provenance = JSON.parse(await readFile(path.join(outDir, "home/en/default/provenance.json"), "utf-8"));
    expect(provenance).toMatchObject({
      id: "home",
      locale: "en",
      state: "default",
      status: 200,
      url: "http://localhost/page",
      timezone: "Europe/London",
      viewport: { width: 1280, height: 800 },
      playwright: expect.any(String),
      source: { fixture: "civil" }
    });
    const index = (await readFile(path.join(outDir, "index.jsonl"), "utf-8")).trim().split("\n");
    expect(index).toHaveLength(1);
    expect(JSON.parse(index[0]).id).toBe("home");
  });

  it("should also capture an expanded state when there is collapsed content to open", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-target-"));
    const { browser, page } = fakeBrowser();
    vi.mocked(expandAll).mockResolvedValue(true);

    // Act
    const results = await captureTarget(browser as unknown as Browser, { id: "faq", url: "http://localhost/faq" }, { outDir });

    // Assert
    expect(results.map((r) => r.state)).toEqual(["default", "expanded"]);
    expect(settle).toHaveBeenCalledWith(page);
    expect((await readFile(path.join(outDir, "index.jsonl"), "utf-8")).trim().split("\n")).toHaveLength(2);
  });

  it("should set cookies, visit setup URLs, add the locale and use the given timezone when the target asks for them", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-target-"));
    const { browser, context, page } = fakeBrowser();

    // Act
    const results = await captureTarget(
      browser as unknown as Browser,
      { id: "list", url: "http://localhost/list?x=1", locale: "cy", setup: ["http://localhost/sign-in"], cookies: [{ name: "session", value: "abc" }] },
      { outDir, timezone: "UTC" }
    );

    // Assert
    expect(results[0].locale).toBe("cy");
    expect(context.addCookies).toHaveBeenCalledWith([{ name: "session", value: "abc", url: "http://localhost/list?x=1" }]);
    expect(page.goto).toHaveBeenNthCalledWith(1, "http://localhost/sign-in", { waitUntil: "load" });
    expect(page.goto).toHaveBeenNthCalledWith(2, "http://localhost/list?x=1&lng=cy", { waitUntil: "load" });
    expect(browser.newContext).toHaveBeenCalledWith(expect.objectContaining({ timezoneId: "UTC" }));
    const provenance = JSON.parse(await readFile(path.join(outDir, "list/cy/default/provenance.json"), "utf-8"));
    expect(provenance.timezone).toBe("UTC");
    expect(provenance.source).toBeNull();
  });

  it("should capture one mobile state at the mobile width without expanding when the target is mobile", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-target-"));
    const { browser } = fakeBrowser(null);
    vi.mocked(expandAll).mockResolvedValue(true);

    // Act
    const results = await captureTarget(browser as unknown as Browser, { id: "home", url: "http://localhost/", viewport: "mobile" }, { outDir });

    // Assert
    expect(results).toEqual([expect.objectContaining({ ok: true, state: "mobile", status: null })]);
    expect(browser.newContext).toHaveBeenCalledWith(expect.objectContaining({ viewport: { width: 375, height: 812 } }));
    expect(expandAll).not.toHaveBeenCalled();
  });

  it("should record the failure and save the page's HTML when a state cannot be captured", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-target-"));
    const { browser } = fakeBrowser(500);
    vi.mocked(capturePage).mockRejectedValue(new Error("main not found"));

    // Act
    const results = await captureTarget(browser as unknown as Browser, { id: "broken", url: "http://localhost/broken" }, { outDir });

    // Assert
    expect(results).toEqual([
      { ok: false, id: "broken", locale: "en", state: "default", outDir: path.join(outDir, "broken/en/default"), status: 500, error: "main not found" }
    ]);
    expect(await readFile(path.join(outDir, "broken/en/default/error.html"), "utf-8")).toBe("<html>broken</html>");
  });

  it("should close the context when navigation fails", async () => {
    // Arrange
    const outDir = await mkdtemp(path.join(tmpdir(), "capture-target-"));
    const { browser, context, page } = fakeBrowser();
    page.goto.mockRejectedValue(new Error("net::ERR_CONNECTION_REFUSED"));

    // Act
    const capture = captureTarget(browser as unknown as Browser, { id: "down", url: "http://localhost/" }, { outDir });

    // Assert
    await expect(capture).rejects.toThrow("ERR_CONNECTION_REFUSED");
    expect(context.close).toHaveBeenCalledTimes(1);
  });
});
