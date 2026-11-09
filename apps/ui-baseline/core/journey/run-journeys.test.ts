import { mkdir, mkdtemp, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Browser } from "playwright";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { launchChromium } from "../capture/browser.js";
import { capturePage } from "../capture/capture-page.js";
import { settle } from "../capture/settle.js";
import type { JourneySuite } from "./journey.js";
import { runJourneys } from "./run-journeys.js";

vi.mock("../capture/browser.js", () => ({ launchChromium: vi.fn() }));
vi.mock("../capture/capture-page.js", () => ({ capturePage: vi.fn() }));
vi.mock("../capture/settle.js", () => ({
  trackRequests: vi.fn(),
  settle: vi.fn().mockResolvedValue(undefined),
  gotoSettled: vi.fn((page: { goto: (url: string, options: unknown) => Promise<unknown> }, url: string) => page.goto(url, { waitUntil: "load" }))
}));

// The suite module the runner imports is written per test; the suite itself lives on globalThis
// so a test can hand it functions
const SUITE_KEY = "__runJourneysTestSuite";

async function writeSuiteModule(dir: string, suite: JourneySuite): Promise<string> {
  (globalThis as Record<string, unknown>)[SUITE_KEY] = suite;
  const file = path.join(dir, `journeys-${Math.random().toString(36).slice(2)}.mjs`);
  await writeFile(file, `export default globalThis.${SUITE_KEY};\n`);
  return file;
}

function fakeBrowser(options: { video?: boolean } = {}) {
  let currentUrl = "about:blank";
  const pages: ReturnType<typeof makePage>[] = [];
  const makePage = (videoDir: string) => ({
    goto: vi.fn(async (url: string) => {
      currentUrl = url;
    }),
    url: () => currentUrl,
    evaluate: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    content: vi.fn().mockResolvedValue("<html>failed</html>"),
    screenshot: vi.fn().mockResolvedValue(Buffer.from("")),
    video: () =>
      options.video === false
        ? null
        : {
            path: async () => {
              const file = path.join(videoDir, "abc.webm");
              await mkdir(videoDir, { recursive: true });
              await writeFile(file, "video");
              return file;
            }
          }
  });
  const contexts: { options: Record<string, unknown>; addCookies: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }[] = [];
  const browser = {
    close: vi.fn().mockResolvedValue(undefined),
    newContext: vi.fn(async (contextOptions: { recordVideo: { dir: string } }) => {
      const page = makePage(contextOptions.recordVideo.dir);
      pages.push(page);
      const context = {
        options: contextOptions,
        addCookies: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        newPage: async () => page
      };
      contexts.push(context);
      return context;
    })
  };
  return { browser, pages, contexts };
}

function suiteOf(overrides: Partial<JourneySuite> = {}): JourneySuite {
  return {
    app: "cath",
    baseUrl: "http://localhost:8080",
    journeys: [
      {
        id: "search",
        description: "Search for a court",
        run: async ({ goto, act, checkpoint, page }) => {
          await goto("/search");
          await checkpoint("search");
          await act("search for Oxford", async () => page.goto("http://localhost:8080/results?q=oxford"));
          await checkpoint("results", "reached by URL");
        }
      }
    ],
    ...overrides
  };
}

describe("runJourneys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(capturePage).mockImplementation(async (page) => ({ url: page.url(), title: `Title of ${page.url()}`, h1: ["Heading"] }) as never);
  });

  it("should run each journey once per locale and record its checkpoints, actions and video when it completes", async () => {
    // Arrange
    const dir = await mkdtemp(path.join(tmpdir(), "run-journeys-"));
    const outDir = path.join(dir, "out");
    const { browser, pages, contexts } = fakeBrowser();
    vi.mocked(launchChromium).mockResolvedValue(browser as unknown as Browser);
    const moduleFile = await writeSuiteModule(dir, suiteOf({ cookies: [{ name: "consent", value: "yes" }], data: { seed: 1 } }));

    // Act
    const results = await runJourneys(moduleFile, { outDir, locales: ["en", "cy"] });

    // Assert
    expect(results).toEqual([
      { journey: "search", locale: "en", ok: true, steps: 2, error: null },
      { journey: "search", locale: "cy", ok: true, steps: 2, error: null }
    ]);
    expect(pages[0].goto).toHaveBeenCalledWith("http://localhost:8080/search", { waitUntil: "load" });
    expect(pages[1].goto).toHaveBeenCalledWith("http://localhost:8080/search?lng=cy", { waitUntil: "load" });
    expect(settle).toHaveBeenCalledWith(pages[0]);
    expect(contexts[0].addCookies).toHaveBeenCalledWith([{ name: "consent", value: "yes", url: "http://localhost:8080" }]);
    expect(contexts[0].options).toMatchObject({ timezoneId: "Europe/London", viewport: { width: 1280, height: 800 } });
    expect(capturePage).toHaveBeenCalledWith(pages[0], path.join(outDir, "search/en/01-search"));
    expect(capturePage).toHaveBeenCalledWith(pages[0], path.join(outDir, "search/en/02-results"));

    const record = JSON.parse(await readFile(path.join(outDir, "search/en/journey.json"), "utf-8"));
    expect(record).toMatchObject({ journey: "search", description: "Search for a court", app: "cath", locale: "en", viewAs: null, ok: true, error: null });
    expect(record.steps).toEqual([
      {
        step: "01-search",
        url: "http://localhost:8080/search",
        path: "/search",
        via: null,
        note: null,
        title: "Title of http://localhost:8080/search",
        h1: ["Heading"]
      },
      {
        step: "02-results",
        url: "http://localhost:8080/results?q=oxford",
        path: "/results",
        via: "search for Oxford",
        note: "reached by URL",
        title: "Title of http://localhost:8080/results?q=oxford",
        h1: ["Heading"]
      }
    ]);
    expect(await readFile(path.join(outDir, "search/en/video.webm"), "utf-8")).toBe("video");
    await expect(stat(path.join(outDir, "search/en/.video"))).rejects.toThrow();
    const index = (await readFile(path.join(outDir, "index.jsonl"), "utf-8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(index).toEqual([
      { journey: "search", locale: "en", ok: true, steps: 2, error: null },
      { journey: "search", locale: "cy", ok: true, steps: 2, error: null }
    ]);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("should tell how many journey-language runs are done after each", async () => {
    // Arrange
    const dir = await mkdtemp(path.join(tmpdir(), "run-journeys-"));
    const { browser } = fakeBrowser();
    vi.mocked(launchChromium).mockResolvedValue(browser as unknown as Browser);
    const moduleFile = await writeSuiteModule(dir, suiteOf());
    const onRun = vi.fn();

    // Act
    await runJourneys(moduleFile, { outDir: path.join(dir, "out"), locales: ["en", "cy"], onRun });

    // Assert
    expect(onRun.mock.calls).toEqual([
      [1, 2],
      [2, 2]
    ]);
  });

  it("should sign in as the journey's user in its locale when the journey has viewAs", async () => {
    // Arrange
    const dir = await mkdtemp(path.join(tmpdir(), "run-journeys-"));
    const { browser, pages } = fakeBrowser({ video: false });
    vi.mocked(launchChromium).mockResolvedValue(browser as unknown as Browser);
    const signIn = vi.fn().mockResolvedValue(undefined);
    const run = vi.fn().mockResolvedValue(undefined);
    const moduleFile = await writeSuiteModule(dir, suiteOf({ signIn, journeys: [{ id: "admin", description: "Admin", viewAs: "system-admin", run }] }));

    // Act
    const results = await runJourneys(moduleFile, { outDir: path.join(dir, "out"), locales: ["cy"] });

    // Assert
    expect(results).toEqual([{ journey: "admin", locale: "cy", ok: true, steps: 0, error: null }]);
    expect(signIn).toHaveBeenCalledWith(pages[0], "system-admin", "cy");
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ locale: "cy", data: {} }));
    const record = JSON.parse(await readFile(path.join(dir, "out/admin/cy/journey.json"), "utf-8"));
    expect(record.viewAs).toBe("system-admin");
    await expect(stat(path.join(dir, "out/admin/cy/video.webm"))).rejects.toThrow();
  });

  it("should record the failure with error.html and error.png when a journey throws", async () => {
    // Arrange
    const dir = await mkdtemp(path.join(tmpdir(), "run-journeys-"));
    const outDir = path.join(dir, "out");
    const { browser, pages } = fakeBrowser();
    vi.mocked(launchChromium).mockResolvedValue(browser as unknown as Browser);
    const moduleFile = await writeSuiteModule(
      dir,
      suiteOf({
        journeys: [
          {
            id: "broken",
            description: "Breaks",
            run: async ({ goto, checkpoint }) => {
              await goto("/start");
              await checkpoint("start");
              throw new Error("button not found");
            }
          }
        ]
      })
    );

    // Act
    const results = await runJourneys(moduleFile, { outDir, locales: ["en"] });

    // Assert
    expect(results).toEqual([{ journey: "broken", locale: "en", ok: false, steps: 1, error: "button not found" }]);
    expect(await readFile(path.join(outDir, "broken/en/error.html"), "utf-8")).toBe("<html>failed</html>");
    expect(pages[0].screenshot).toHaveBeenCalledWith({ path: path.join(outDir, "broken/en/error.png"), fullPage: true });
    const record = JSON.parse(await readFile(path.join(outDir, "broken/en/journey.json"), "utf-8"));
    expect(record).toMatchObject({ ok: false, error: "button not found" });
    expect(record.steps).toHaveLength(1);
  });

  it("should still record the failure when the page cannot give its content or a screenshot", async () => {
    // Arrange
    const dir = await mkdtemp(path.join(tmpdir(), "run-journeys-"));
    const outDir = path.join(dir, "out");
    const { browser } = fakeBrowser();
    vi.mocked(launchChromium).mockResolvedValue(browser as unknown as Browser);
    const moduleFile = await writeSuiteModule(
      dir,
      suiteOf({
        journeys: [
          {
            id: "crashed",
            description: "Page crashes",
            run: async ({ page }) => {
              vi.mocked(page.content).mockRejectedValue(new Error("Target closed"));
              vi.mocked(page.screenshot).mockRejectedValue(new Error("Target closed"));
              throw new Error("page crashed");
            }
          }
        ]
      })
    );

    // Act
    const results = await runJourneys(moduleFile, { outDir, locales: ["en"] });

    // Assert
    expect(results[0]).toMatchObject({ ok: false, error: "page crashed" });
    expect(await readFile(path.join(outDir, "crashed/en/error.html"), "utf-8")).toBe("");
  });

  it("should fail a journey that needs sign-in when the suite has no signIn", async () => {
    // Arrange
    const dir = await mkdtemp(path.join(tmpdir(), "run-journeys-"));
    const { browser } = fakeBrowser();
    vi.mocked(launchChromium).mockResolvedValue(browser as unknown as Browser);
    const run = vi.fn();
    const moduleFile = await writeSuiteModule(dir, suiteOf({ app: "pip", journeys: [{ id: "admin", description: "Admin", viewAs: "ctsc", run }] }));

    // Act
    const results = await runJourneys(moduleFile, { outDir: path.join(dir, "out"), locales: ["en"] });

    // Assert
    expect(results[0].error).toBe("admin needs sign-in as ctsc but pip has no signIn");
    expect(run).not.toHaveBeenCalled();
  });

  it("should run and replace only the listed journeys, keeping the rest of the output, when only is given", async () => {
    // Arrange
    const dir = await mkdtemp(path.join(tmpdir(), "run-journeys-"));
    const outDir = path.join(dir, "out");
    await mkdir(path.join(outDir, "search/en"), { recursive: true });
    await writeFile(path.join(outDir, "search/en/stale.txt"), "old");
    await mkdir(path.join(outDir, "other/en"), { recursive: true });
    await writeFile(path.join(outDir, "other/en/journey.json"), "{}");
    const { browser } = fakeBrowser();
    vi.mocked(launchChromium).mockResolvedValue(browser as unknown as Browser);
    const skipped = vi.fn();
    const suite = suiteOf();
    suite.journeys.push({ id: "skipped", description: "Not selected", run: skipped });
    const moduleFile = await writeSuiteModule(dir, suite);

    // Act
    const results = await runJourneys(moduleFile, { outDir, locales: ["en"], only: ["search"] });

    // Assert
    expect(results.map((r) => r.journey)).toEqual(["search"]);
    expect(skipped).not.toHaveBeenCalled();
    await expect(stat(path.join(outDir, "search/en/stale.txt"))).rejects.toThrow();
    expect(await readFile(path.join(outDir, "other/en/journey.json"), "utf-8")).toBe("{}");
  });

  it("should replace the whole output directory when every journey is run", async () => {
    // Arrange
    const dir = await mkdtemp(path.join(tmpdir(), "run-journeys-"));
    const outDir = path.join(dir, "out");
    await mkdir(path.join(outDir, "other"), { recursive: true });
    const { browser } = fakeBrowser();
    vi.mocked(launchChromium).mockResolvedValue(browser as unknown as Browser);
    const moduleFile = await writeSuiteModule(dir, suiteOf());

    // Act
    await runJourneys(moduleFile, { outDir, locales: ["en"], only: [] });

    // Assert
    expect((await readdir(outDir)).sort()).toEqual(["index.jsonl", "search"]);
  });
});
