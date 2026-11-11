import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Browser } from "playwright";
import { launchChromium } from "./browser.js";
import { type CaptureResult, type CaptureSettings, type CaptureTarget, captureTarget } from "./capture-target.js";

// The states a target's capture is stored as (capture-target.ts): a page's desktop and mobile targets
// share its id and locale, so a target's results, folders and index lines are told apart by these
const DESKTOP_STATES = ["default", "expanded"];
const MOBILE_STATES = ["mobile"];

// Captures every target in a targets file. Each entry may list several locales. onCaptured is told
// after each target-language capture how many of them are done; a retry is not counted again.
export async function captureBatch(
  targetsFile: string,
  settings: CaptureSettings,
  concurrency: number,
  onCaptured?: (done: number, total: number) => void
): Promise<CaptureResult[]> {
  const [results] = await captureBatches([{ targetsFile, settings, onCaptured }], concurrency);
  return results;
}

// Captures several targets files, each into its own directory, from one queue in one browser, so
// the workers that finish one batch's last pages go straight on to the next batch rather than wait
// for the slowest page of the first. A batch's onFinished is told its results as soon as all of
// them are in: when its last capture ends, or after its retries if any failed.
export async function captureBatches(batches: CaptureBatch[], concurrency: number): Promise<CaptureResult[][]> {
  const loaded = await Promise.all(
    batches.map(async (batch) => {
      const entries = JSON.parse(await readFile(batch.targetsFile, "utf-8")) as BatchEntry[];
      const targets = entries.flatMap(({ locales, ...target }) => (locales ?? [target.locale ?? "en"]).map((locale) => ({ ...target, locale })));
      // A baseline directory must only ever hold one run, or index.jsonl mixes runs
      await rm(batch.settings.outDir, { recursive: true, force: true });
      await mkdir(batch.settings.outDir, { recursive: true });
      return { ...batch, targets, results: [] as CaptureResult[], done: 0 };
    })
  );

  // One shared browser; if it dies (a crashed page can take it down, e.g. when memory runs out)
  // it is relaunched so the rest of the batch carries on
  let browser = await launchChromium();
  let relaunching: Promise<Browser> | null = null;
  const liveBrowser = async () => {
    if (browser.isConnected()) return browser;
    // Cleared however the launch ends, so one that fails (memory not yet freed, say) fails only the
    // captures waiting on it, and the next capture tries again
    relaunching ??= launchChromium()
      .then((launched) => {
        browser = launched;
        return launched;
      })
      .finally(() => {
        relaunching = null;
      });
    return relaunching;
  };
  // A browser that cannot be relaunched fails the capture, not the whole batch
  const capture = async (target: CaptureTarget, settings: CaptureSettings) =>
    liveBrowser()
      .then((live) => captureTarget(live, target, settings))
      .catch((error: Error) => [
        { ok: false, id: target.id, locale: target.locale ?? "en", state: statesOf(target)[0], outDir: "", status: null, error: error.message }
      ]);
  const log = (captured: CaptureResult[]) => {
    for (const result of captured)
      console.log(`${result.ok ? "ok  " : "FAIL"} ${result.id} ${result.locale}/${result.state}${result.error ? ` — ${result.error}` : ""}`);
  };
  const failedTargets = (batch: (typeof loaded)[number]) => batch.targets.filter((target) => batch.results.some((r) => !r.ok && belongsTo(target, r)));

  const queue = loaded.flatMap((batch) => batch.targets.map((target) => ({ batch, target })));
  try {
    await Promise.all(
      Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          const { batch, target } = next;
          const captured = await capture(target, batch.settings);
          log(captured);
          batch.results.push(...captured);
          batch.done += 1;
          batch.onCaptured?.(batch.done, batch.targets.length);
          if (batch.done === batch.targets.length && !failedTargets(batch).length) batch.onFinished?.(batch.results);
        }
      })
    );
    // Failures are usually the machine being busy rather than the page, so each gets one more go,
    // alone, starting from a clean directory. A retry replaces the target's earlier results.
    for (const batch of loaded) {
      const failed = failedTargets(batch);
      if (!failed.length) continue;
      console.log(`retrying ${failed.length} failed capture${failed.length === 1 ? "" : "s"} one at a time`);
      for (const target of failed) {
        const locale = target.locale ?? "en";
        // Its folders and its index lines go together, so a retry that fails leaves no line behind
        // pointing at a capture that is no longer there. Only this target's states: the page's other
        // viewport, captured fine, is left as it is.
        for (const state of statesOf(target)) await rm(path.join(batch.settings.outDir, target.id, locale, state), { recursive: true, force: true });
        await dropIndexLines(path.join(batch.settings.outDir, "index.jsonl"), target);
        const captured = await capture(target, batch.settings);
        log(captured);
        batch.results = [...batch.results.filter((r) => !belongsTo(target, r)), ...captured];
      }
      batch.onFinished?.(batch.results);
    }
  } finally {
    await browser.close();
  }
  return loaded.map((batch) => batch.results);
}

function statesOf(target: CaptureTarget): string[] {
  return target.viewport === "mobile" ? MOBILE_STATES : DESKTOP_STATES;
}

// Whether a result or index line is one of this target's captures
function belongsTo(target: CaptureTarget, capture: { id: string; locale: string; state: string }): boolean {
  return capture.id === target.id && capture.locale === (target.locale ?? "en") && statesOf(target).includes(capture.state);
}

// Removes a target's lines from the index, as its folders are removed for a retry
async function dropIndexLines(file: string, target: CaptureTarget): Promise<void> {
  const lines = (await readFile(file, "utf-8").catch(() => "")).split("\n").filter(Boolean);
  const kept = lines.filter((line) => !belongsTo(target, JSON.parse(line) as { id: string; locale: string; state: string }));
  await writeFile(file, kept.map((line) => `${line}\n`).join(""));
}

export interface BatchEntry extends CaptureTarget {
  locales?: string[];
}

export interface CaptureBatch {
  targetsFile: string;
  settings: CaptureSettings;
  onCaptured?: (done: number, total: number) => void;
  onFinished?: (results: CaptureResult[]) => void;
}
