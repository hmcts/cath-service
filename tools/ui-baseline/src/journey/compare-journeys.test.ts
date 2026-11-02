import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compareJourneys } from "./compare-journeys.js";

// A journey run as runJourneys writes it, each checkpoint a minimal capture with the given heading
async function writeRun(dir: string, journey: string, steps: { name: string; path: string; heading?: string }[], options: RunOptions = {}) {
  const locale = options.locale ?? "en";
  const journeyDir = path.join(dir, journey, locale);
  const recorded = steps.map((step, i) => ({ ...step, step: `${String(i + 1).padStart(2, "0")}-${step.name}` }));
  for (const step of recorded) {
    const stepDir = path.join(journeyDir, step.step);
    await mkdir(stepDir, { recursive: true });
    await writeFile(path.join(stepDir, "aria.yml"), `- main:\n  - heading "${step.heading ?? step.name}" [level=1]\n`);
    await writeFile(path.join(stepDir, "meta.json"), JSON.stringify({ title: step.heading ?? step.name, lang: locale, forms: [] }));
  }
  await writeFile(
    path.join(journeyDir, "journey.json"),
    JSON.stringify({
      journey,
      locale,
      ok: options.error === undefined,
      error: options.error ?? null,
      steps: recorded.map((step) => ({ step: step.step, path: step.path, via: null }))
    })
  );
}

async function runs() {
  const root = await mkdtemp(path.join(tmpdir(), "compare-journeys-"));
  return { source: path.join(root, "source"), target: path.join(root, "target"), out: path.join(root, "out") };
}

const BASKET = [
  { name: "pending", path: "/pending-subscriptions" },
  { name: "preview", path: "/subscription-confirmation-preview" },
  { name: "confirmed", path: "/subscription-confirmed" }
];

describe("compareJourneys", () => {
  it("should match when the target reaches the same checkpoints with the same pages", async () => {
    // Arrange
    const dirs = await runs();
    await writeRun(dirs.source, "basket", BASKET);
    await writeRun(dirs.target, "basket", BASKET);

    // Act
    const summary = await compareJourneys(dirs);

    // Assert
    expect(summary.totals).toEqual({ runs: 1, match: 1, differs: 0, notRun: 0 });
    expect(summary.results[0].steps.map((s) => [s.name, s.verdict])).toEqual([
      ["pending", "match"],
      ["preview", "match"],
      ["confirmed", "match"]
    ]);
  });

  it("should pair checkpoints by name when the target misses one", async () => {
    // Arrange
    const dirs = await runs();
    await writeRun(dirs.source, "basket", BASKET);
    await writeRun(dirs.target, "basket", [BASKET[0], BASKET[2]]);

    // Act
    const [result] = (await compareJourneys(dirs)).results;

    // Assert
    expect(result.verdict).toBe("differs");
    expect(result.findings).toEqual([{ category: "journey", change: "missing", detail: '"preview" is not reached' }]);
    expect(result.steps.map((s) => [s.name, s.verdict])).toEqual([
      ["pending", "match"],
      ["preview", "not-captured"],
      ["confirmed", "match"]
    ]);
  });

  it("should report a checkpoint reached in another order as moved", async () => {
    // Arrange
    const dirs = await runs();
    await writeRun(dirs.source, "basket", BASKET);
    await writeRun(dirs.target, "basket", [BASKET[1], BASKET[0], BASKET[2]]);

    // Act
    const [result] = (await compareJourneys(dirs)).results;

    // Assert
    expect(result.findings.map((f) => f.change)).toEqual(["moved"]);
  });

  it("should report a checkpoint the target reaches at an unexpected page", async () => {
    // Arrange
    const dirs = await runs();
    await writeRun(dirs.source, "basket", [{ name: "start", path: "/subscription-add" }]);
    await writeRun(dirs.target, "basket", [{ name: "start", path: "/subscription-management" }]);

    // Act
    const [result] = (await compareJourneys({ ...dirs, expectedPath: (p) => ({ "/subscription-add": "/add-email-subscription" })[p] })).results;

    // Assert
    expect(result.findings).toEqual([
      { category: "journey", change: "path", detail: '"start" is at /subscription-management, expected /add-email-subscription (from /subscription-add)' }
    ]);
  });

  it("should compare each checkpoint's page and report where it differs", async () => {
    // Arrange
    const dirs = await runs();
    await writeRun(dirs.source, "basket", BASKET);
    await writeRun(dirs.target, "basket", [BASKET[0], { ...BASKET[1], heading: "Check your subscriptions" }, BASKET[2]]);

    // Act
    const summary = await compareJourneys(dirs);

    // Assert
    expect(summary.results[0].findings).toEqual([]);
    expect(summary.results[0].steps.find((s) => s.name === "preview")?.verdict).toBe("differs");
    expect(summary.pages.results.find((r) => r.state === "preview")?.findings).toContainEqual({
      category: "page",
      change: "title",
      detail: '"preview" → "Check your subscriptions"'
    });
  });

  it("should record where the target stopped", async () => {
    // Arrange
    const dirs = await runs();
    await writeRun(dirs.source, "basket", BASKET);
    await writeRun(dirs.target, "basket", [BASKET[0]], { error: "locator.click: Timeout 30000ms exceeded\nCall log: ..." });

    // Act
    const [result] = (await compareJourneys(dirs)).results;

    // Assert
    expect(result.findings).toContainEqual({
      category: "journey",
      change: "stopped",
      detail: "stopped after 1 checkpoints: locator.click: Timeout 30000ms exceeded"
    });
  });

  it("should count source journeys the target did not run, per locale", async () => {
    // Arrange
    const dirs = await runs();
    await writeRun(dirs.source, "basket", BASKET);
    await writeRun(dirs.source, "basket", BASKET, { locale: "cy" });
    await writeRun(dirs.source, "media", [{ name: "applications", path: "/media-applications" }]);
    await writeRun(dirs.target, "basket", BASKET);

    // Act
    const summary = await compareJourneys(dirs);

    // Assert
    expect(summary.totals).toEqual({ runs: 3, match: 1, differs: 0, notRun: 2 });
    expect(JSON.parse(await readFile(path.join(dirs.out, "journeys-compare.json"), "utf-8")).totals.notRun).toBe(2);
  });

  it("should compare only the journeys named", async () => {
    // Arrange
    const dirs = await runs();
    await writeRun(dirs.source, "basket", BASKET);
    await writeRun(dirs.source, "media", [{ name: "applications", path: "/media-applications" }]);
    await writeRun(dirs.target, "basket", BASKET);

    // Act
    const summary = await compareJourneys({ ...dirs, only: ["basket"] });

    // Assert
    expect(summary.results.map((r) => r.journey)).toEqual(["basket"]);
  });
});

interface RunOptions {
  locale?: string;
  error?: string;
}
