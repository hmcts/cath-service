import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Browser } from "playwright";
import { launchChromium } from "./browser.js";
import { type CaptureResult, type CaptureSettings, type CaptureTarget, captureTarget } from "./capture-target.js";

// Captures every target in a targets file. Each entry may list several locales. onCaptured is told
// after each target-language capture how many of them are done; a retry is not counted again.
export async function captureBatch(
  targetsFile: string,
  settings: CaptureSettings,
  concurrency: number,
  onCaptured?: (done: number, total: number) => void
): Promise<CaptureResult[]> {
  const entries = JSON.parse(await readFile(targetsFile, "utf-8")) as BatchEntry[];
  const targets = entries.flatMap(({ locales, ...target }) => (locales ?? [target.locale ?? "en"]).map((locale) => ({ ...target, locale })));

  // A baseline directory must only ever hold one run, or index.jsonl mixes runs
  await rm(settings.outDir, { recursive: true, force: true });
  await mkdir(settings.outDir, { recursive: true });

  // One shared browser; if it dies (a crashed page can take it down, e.g. when memory runs out)
  // it is relaunched so the rest of the batch carries on
  let browser = await launchChromium();
  let relaunching: Promise<Browser> | null = null;
  const liveBrowser = async () => {
    if (browser.isConnected()) return browser;
    relaunching ??= launchChromium().then((launched) => {
      browser = launched;
      relaunching = null;
      return launched;
    });
    return relaunching;
  };
  const capture = async (target: CaptureTarget) =>
    captureTarget(await liveBrowser(), target, settings).catch((error: Error) => [
      { ok: false, id: target.id, locale: target.locale ?? "en", state: "default", outDir: "", status: null, error: error.message }
    ]);
  const log = (captured: CaptureResult[]) => {
    for (const result of captured)
      console.log(`${result.ok ? "ok  " : "FAIL"} ${result.id} ${result.locale}/${result.state}${result.error ? ` — ${result.error}` : ""}`);
  };

  const results: CaptureResult[] = [];
  const queue = [...targets];
  let done = 0;
  try {
    await Promise.all(
      Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        for (let target = queue.shift(); target; target = queue.shift()) {
          const captured = await capture(target);
          log(captured);
          results.push(...captured);
          done += 1;
          onCaptured?.(done, targets.length);
        }
      })
    );
    // Failures are usually the machine being busy rather than the page, so each gets one more go,
    // alone, starting from a clean directory. A retry replaces the target's earlier results.
    const failed = targets.filter((target) => results.some((r) => !r.ok && r.id === target.id && r.locale === (target.locale ?? "en")));
    if (failed.length) console.log(`retrying ${failed.length} failed capture${failed.length === 1 ? "" : "s"} one at a time`);
    for (const target of failed) {
      // Its folder and its index lines go together, so a retry that fails leaves no line behind
      // pointing at a capture that is no longer there
      await rm(path.join(settings.outDir, target.id, target.locale ?? "en"), { recursive: true, force: true });
      await dropIndexLines(path.join(settings.outDir, "index.jsonl"), target.id, target.locale ?? "en");
      const captured = await capture(target);
      log(captured);
      const locale = target.locale ?? "en";
      for (let i = results.length - 1; i >= 0; i--) if (results[i].id === target.id && results[i].locale === locale) results.splice(i, 1);
      results.push(...captured);
    }
  } finally {
    await browser.close();
  }
  return results;
}

// Removes a target-language capture's lines from the index, as its folder is removed for a retry
async function dropIndexLines(file: string, id: string, locale: string): Promise<void> {
  const lines = (await readFile(file, "utf-8").catch(() => "")).split("\n").filter(Boolean);
  const kept = lines.filter((line) => {
    const entry = JSON.parse(line) as { id: string; locale: string };
    return entry.id !== id || entry.locale !== locale;
  });
  await writeFile(file, kept.map((line) => `${line}\n`).join(""));
}

export interface BatchEntry extends CaptureTarget {
  locales?: string[];
}
