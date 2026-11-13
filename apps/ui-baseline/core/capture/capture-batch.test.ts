import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Browser } from "playwright";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { launchChromium } from "./browser.js";
import { captureBatch, captureBatches } from "./capture-batch.js";
import { type CaptureResult, type CaptureTarget, captureTarget } from "./capture-target.js";

vi.mock("./browser.js", () => ({ launchChromium: vi.fn() }));
vi.mock("./capture-target.js", () => ({ captureTarget: vi.fn() }));

function fakeBrowser(connected = true) {
  return { isConnected: vi.fn(() => connected), close: vi.fn().mockResolvedValue(undefined) };
}

function ok(target: CaptureTarget, state = "default"): CaptureResult {
  return { ok: true, id: target.id, locale: target.locale ?? "en", state, outDir: `/out/${target.id}`, status: 200 };
}

async function setUp(entries: unknown[]) {
  const dir = await mkdtemp(path.join(tmpdir(), "capture-batch-"));
  const targetsFile = path.join(dir, "targets.json");
  await writeFile(targetsFile, JSON.stringify(entries));
  return { targetsFile, outDir: path.join(dir, "out") };
}

describe("captureBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should capture every target in every locale it lists, replacing the output directory, when all succeed", async () => {
    // Arrange
    const { targetsFile, outDir } = await setUp([
      { id: "home", url: "http://localhost/", locales: ["en", "cy"] },
      { id: "faq", url: "http://localhost/faq", locale: "cy" },
      { id: "about", url: "http://localhost/about" }
    ]);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "stale.txt"), "old run");
    const browser = fakeBrowser();
    vi.mocked(launchChromium).mockResolvedValue(browser as unknown as Browser);
    vi.mocked(captureTarget).mockImplementation(async (_browser, target) => [ok(target)]);

    // Act
    const results = await captureBatch(targetsFile, { outDir }, 2);

    // Assert
    expect(results.map((r) => `${r.id} ${r.locale}`).sort()).toEqual(["about en", "faq cy", "home cy", "home en"]);
    expect(captureTarget).toHaveBeenCalledTimes(4);
    expect(vi.mocked(captureTarget).mock.calls[0][1]).not.toHaveProperty("locales");
    await expect(stat(path.join(outDir, "stale.txt"))).rejects.toThrow();
    expect(browser.close).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith("ok   home en/default");
  });

  it("should run no more captures at once than the concurrency allows", async () => {
    // Arrange
    const { targetsFile, outDir } = await setUp(Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, url: "http://localhost/" })));
    vi.mocked(launchChromium).mockResolvedValue(fakeBrowser() as unknown as Browser);
    let running = 0;
    let peak = 0;
    vi.mocked(captureTarget).mockImplementation(async (_browser, target) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return [ok(target)];
    });

    // Act
    const results = await captureBatch(targetsFile, { outDir }, 2);

    // Assert
    expect(results).toHaveLength(6);
    expect(peak).toBe(2);
  });

  it("should tell how many target-language captures are done after each, not counting a retry again", async () => {
    // Arrange
    const { targetsFile, outDir } = await setUp([
      { id: "home", url: "http://localhost/", locales: ["en", "cy"] },
      { id: "faq", url: "http://localhost/faq" }
    ]);
    vi.mocked(launchChromium).mockResolvedValue(fakeBrowser() as unknown as Browser);
    let faqAttempts = 0;
    vi.mocked(captureTarget).mockImplementation(async (_browser, target) => {
      if (target.id !== "faq") return [ok(target)];
      faqAttempts++;
      return faqAttempts === 1 ? [{ ...ok(target), ok: false, error: "timeout" }] : [ok(target)];
    });
    const onCaptured = vi.fn();

    // Act
    await captureBatch(targetsFile, { outDir }, 1, onCaptured);

    // Assert
    expect(faqAttempts).toBe(2);
    expect(onCaptured.mock.calls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3]
    ]);
  });

  it("should leave no index line for a capture whose retry also failed", async () => {
    // Arrange
    const { targetsFile, outDir } = await setUp([
      { id: "home", url: "http://localhost/", locales: ["en", "cy"] },
      { id: "faq", url: "http://localhost/faq" }
    ]);
    vi.mocked(launchChromium).mockResolvedValue(fakeBrowser() as unknown as Browser);
    let homeCyAttempts = 0;
    vi.mocked(captureTarget).mockImplementation(async (_browser, target, settings) => {
      const locale = target.locale ?? "en";
      if (target.id === "home" && locale === "cy" && ++homeCyAttempts > 1) throw new Error("the page crashed");
      await mkdir(path.join(settings.outDir, target.id, locale, "default"), { recursive: true });
      await writeFile(path.join(settings.outDir, "index.jsonl"), `${JSON.stringify({ id: target.id, locale, state: "default" })}\n`, { flag: "a" });
      // The Welsh home page's default state is captured before its expanded state fails
      return target.id === "home" && locale === "cy" ? [ok(target), { ...ok(target, "expanded"), ok: false, error: "timeout" }] : [ok(target)];
    });

    // Act
    await captureBatch(targetsFile, { outDir }, 1);

    // Assert
    const index = (await readFile(path.join(outDir, "index.jsonl"), "utf-8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(index.map((entry) => `${entry.id} ${entry.locale}`)).toEqual(["home en", "faq en"]);
    await expect(stat(path.join(outDir, "home", "cy", "default"))).rejects.toThrow();
  });

  it("should retry each failed target once and keep only the retry's results and index lines", async () => {
    // Arrange
    const { targetsFile, outDir } = await setUp([
      { id: "home", url: "http://localhost/" },
      { id: "faq", url: "http://localhost/faq" }
    ]);
    vi.mocked(launchChromium).mockResolvedValue(fakeBrowser() as unknown as Browser);
    let faqAttempts = 0;
    vi.mocked(captureTarget).mockImplementation(async (_browser, target, settings) => {
      if (target.id === "home") return [ok(target)];
      faqAttempts++;
      const line = (state: string, attempt: number) => `${JSON.stringify({ id: "faq", locale: "en", state, attempt })}\n`;
      await mkdir(path.join(settings.outDir, "faq", "en"), { recursive: true });
      await writeFile(path.join(settings.outDir, "index.jsonl"), line("default", faqAttempts), { flag: "a" });
      if (faqAttempts === 1) return [ok(target), { ...ok(target, "expanded"), ok: false, error: "timeout" }];
      await writeFile(path.join(settings.outDir, "index.jsonl"), line("expanded", faqAttempts), { flag: "a" });
      return [ok(target), ok(target, "expanded")];
    });

    // Act
    const results = await captureBatch(targetsFile, { outDir }, 2);

    // Assert
    expect(faqAttempts).toBe(2);
    expect(results.filter((r) => r.id === "faq")).toEqual([ok({ id: "faq", url: "" }), ok({ id: "faq", url: "" }, "expanded")]);
    expect(results.every((r) => r.ok)).toBe(true);
    const index = (await readFile(path.join(outDir, "index.jsonl"), "utf-8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(index).toEqual([
      { id: "faq", locale: "en", state: "default", attempt: 2 },
      { id: "faq", locale: "en", state: "expanded", attempt: 2 }
    ]);
    expect(console.log).toHaveBeenCalledWith("FAIL faq en/expanded — timeout");
    expect(console.log).toHaveBeenCalledWith("retrying 1 failed capture one at a time");
  });

  it("should retry only the viewport that failed, leaving the page's other viewport's capture in place", async () => {
    // Arrange
    const { targetsFile, outDir } = await setUp([
      { id: "home", url: "http://localhost/" },
      { id: "home", url: "http://localhost/", viewport: "mobile" }
    ]);
    vi.mocked(launchChromium).mockResolvedValue(fakeBrowser() as unknown as Browser);
    let mobileAttempts = 0;
    vi.mocked(captureTarget).mockImplementation(async (_browser, target, settings) => {
      const state = target.viewport === "mobile" ? "mobile" : "default";
      if (state === "mobile") mobileAttempts++;
      await mkdir(path.join(settings.outDir, "home", "en", state), { recursive: true });
      await writeFile(path.join(settings.outDir, "home", "en", state, "page.png"), "png");
      await writeFile(path.join(settings.outDir, "index.jsonl"), `${JSON.stringify({ id: "home", locale: "en", state })}\n`, { flag: "a" });
      return state === "mobile" && mobileAttempts === 1 ? [{ ...ok(target, "mobile"), ok: false, error: "timeout" }] : [ok(target, state)];
    });

    // Act
    const results = await captureBatch(targetsFile, { outDir }, 2);

    // Assert
    expect(captureTarget).toHaveBeenCalledTimes(3);
    expect(results.map((r) => `${r.state} ${r.ok}`).sort()).toEqual(["default true", "mobile true"]);
    expect(await readFile(path.join(outDir, "home/en/default/page.png"), "utf-8")).toBe("png");
    const index = (await readFile(path.join(outDir, "index.jsonl"), "utf-8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line).state);
    expect(index.sort()).toEqual(["default", "mobile"]);
  });

  it("should record a failed default state and relaunch the browser when a capture throws after the browser dies", async () => {
    // Arrange
    const { targetsFile, outDir } = await setUp([
      { id: "a", url: "http://localhost/a" },
      { id: "b", url: "http://localhost/b", locale: "cy" }
    ]);
    const dead = fakeBrowser(false);
    const live = fakeBrowser();
    vi.mocked(launchChromium)
      .mockResolvedValueOnce(dead as unknown as Browser)
      .mockResolvedValue(live as unknown as Browser);
    vi.mocked(captureTarget).mockRejectedValue(new Error("Target crashed"));

    // Act
    const results = await captureBatch(targetsFile, { outDir }, 1);

    // Assert
    expect(results).toEqual([
      { ok: false, id: "a", locale: "en", state: "default", outDir: "", status: null, error: "Target crashed" },
      { ok: false, id: "b", locale: "cy", state: "default", outDir: "", status: null, error: "Target crashed" }
    ]);
    expect(captureTarget).toHaveBeenCalledTimes(4);
    expect(vi.mocked(captureTarget).mock.calls[0][0]).toBe(live);
    expect(console.log).toHaveBeenCalledWith("retrying 2 failed captures one at a time");
    expect(await readFile(path.join(outDir, "index.jsonl"), "utf-8")).toBe("");
    expect(live.close).toHaveBeenCalledTimes(1);
  });

  it("should try to relaunch again for the next capture when a relaunch fails, rather than fail every capture after it", async () => {
    // Arrange
    const { targetsFile, outDir } = await setUp([
      { id: "a", url: "http://localhost/a" },
      { id: "b", url: "http://localhost/b" }
    ]);
    const live = fakeBrowser();
    vi.mocked(launchChromium)
      .mockResolvedValueOnce(fakeBrowser(false) as unknown as Browser)
      .mockRejectedValueOnce(new Error("out of memory"))
      .mockResolvedValue(live as unknown as Browser);
    vi.mocked(captureTarget).mockImplementation(async (_browser, target) => [ok(target)]);

    // Act
    const results = await captureBatch(targetsFile, { outDir }, 1);

    // Assert
    expect(results.map((r) => `${r.id} ${r.ok}`).sort()).toEqual(["a true", "b true"]);
    expect(launchChromium).toHaveBeenCalledTimes(3);
    expect(console.log).toHaveBeenCalledWith("FAIL a en/default — out of memory");
    expect(live.close).toHaveBeenCalledTimes(1);
  });
});

describe("captureBatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should capture every batch into its own directory from one browser", async () => {
    // Arrange
    const lists = await setUp([{ id: "civil", url: "http://localhost/civil" }]);
    const pages = await setUp([{ id: "home", url: "http://localhost/", locales: ["en", "cy"] }]);
    const browser = fakeBrowser();
    vi.mocked(launchChromium).mockResolvedValue(browser as unknown as Browser);
    vi.mocked(captureTarget).mockImplementation(async (_browser, target) => [ok(target)]);

    // Act
    const results = await captureBatches(
      [
        { targetsFile: lists.targetsFile, settings: { outDir: lists.outDir } },
        { targetsFile: pages.targetsFile, settings: { outDir: pages.outDir } }
      ],
      2
    );

    // Assert
    expect(results.map((batch) => batch.map((r) => `${r.id} ${r.locale}`).sort())).toEqual([["civil en"], ["home cy", "home en"]]);
    expect(vi.mocked(captureTarget).mock.calls.map(([, target, settings]) => `${target.id} ${settings.outDir}`)).toEqual(
      expect.arrayContaining([`civil ${lists.outDir}`, `home ${pages.outDir}`])
    );
    expect(launchChromium).toHaveBeenCalledTimes(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("should start the next batch's captures while the first batch's slowest page is still going", async () => {
    // Arrange
    const lists = await setUp([
      { id: "slow-list", url: "http://localhost/slow" },
      { id: "quick-list", url: "http://localhost/quick" }
    ]);
    const pages = await setUp([{ id: "home", url: "http://localhost/" }]);
    vi.mocked(launchChromium).mockResolvedValue(fakeBrowser() as unknown as Browser);
    const order: string[] = [];
    vi.mocked(captureTarget).mockImplementation(async (_browser, target) => {
      await new Promise((resolve) => setTimeout(resolve, target.id === "slow-list" ? 30 : 1));
      order.push(target.id);
      return [ok(target)];
    });

    // Act
    await captureBatches(
      [
        { targetsFile: lists.targetsFile, settings: { outDir: lists.outDir } },
        { targetsFile: pages.targetsFile, settings: { outDir: pages.outDir } }
      ],
      2
    );

    // Assert
    expect(order).toEqual(["quick-list", "home", "slow-list"]);
  });

  it("should tell a batch it has finished as soon as its captures are in, before the other batch ends", async () => {
    // Arrange
    const lists = await setUp([{ id: "civil", url: "http://localhost/civil" }]);
    const pages = await setUp([{ id: "slow-page", url: "http://localhost/slow" }]);
    vi.mocked(launchChromium).mockResolvedValue(fakeBrowser() as unknown as Browser);
    const events: string[] = [];
    vi.mocked(captureTarget).mockImplementation(async (_browser, target) => {
      await new Promise((resolve) => setTimeout(resolve, target.id === "slow-page" ? 30 : 1));
      events.push(`captured ${target.id}`);
      return [ok(target)];
    });

    // Act
    await captureBatches(
      [
        { targetsFile: lists.targetsFile, settings: { outDir: lists.outDir }, onFinished: (results) => events.push(`lists finished with ${results.length}`) },
        { targetsFile: pages.targetsFile, settings: { outDir: pages.outDir }, onFinished: (results) => events.push(`pages finished with ${results.length}`) }
      ],
      2
    );

    // Assert
    expect(events).toEqual(["captured civil", "lists finished with 1", "captured slow-page", "pages finished with 1"]);
  });

  it("should tell a batch with a failure it has finished only after its retry", async () => {
    // Arrange
    const lists = await setUp([{ id: "civil", url: "http://localhost/civil" }]);
    vi.mocked(launchChromium).mockResolvedValue(fakeBrowser() as unknown as Browser);
    let attempts = 0;
    vi.mocked(captureTarget).mockImplementation(async (_browser, target) =>
      ++attempts === 1 ? [{ ...ok(target), ok: false, error: "timeout" }] : [ok(target)]
    );
    const onFinished = vi.fn();

    // Act
    await captureBatches([{ targetsFile: lists.targetsFile, settings: { outDir: lists.outDir }, onFinished }], 1);

    // Assert
    expect(attempts).toBe(2);
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(onFinished.mock.calls[0][0]).toEqual([ok({ id: "civil", url: "http://localhost/civil", locale: "en" })]);
  });
});
