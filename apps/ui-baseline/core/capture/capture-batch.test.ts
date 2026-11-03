import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Browser } from "playwright";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { launchChromium } from "./browser.js";
import { captureBatch } from "./capture-batch.js";
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
});
