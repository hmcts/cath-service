import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { type Browser, chromium } from "playwright";
import { type CaptureResult, type CaptureSettings, type CaptureTarget, captureTarget } from "./capture-target.js";

// Captures every target in a targets file. Each entry may list several locales.
export async function captureBatch(targetsFile: string, settings: CaptureSettings, concurrency: number): Promise<CaptureResult[]> {
  const entries = JSON.parse(await readFile(targetsFile, "utf-8")) as BatchEntry[];
  const targets = entries.flatMap(({ locales, ...target }) => (locales ?? [target.locale ?? "en"]).map((locale) => ({ ...target, locale })));

  // A baseline directory must only ever hold one run, or index.jsonl mixes runs
  await rm(settings.outDir, { recursive: true, force: true });
  await mkdir(settings.outDir, { recursive: true });

  // One shared browser; if it dies (a crashed page can take it down, e.g. when memory runs out)
  // it is relaunched so the rest of the batch carries on
  let browser = await chromium.launch();
  let relaunching: Promise<Browser> | null = null;
  const liveBrowser = async () => {
    if (browser.isConnected()) return browser;
    relaunching ??= chromium.launch().then((launched) => {
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
  try {
    await Promise.all(
      Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        for (let target = queue.shift(); target; target = queue.shift()) {
          const captured = await capture(target);
          log(captured);
          results.push(...captured);
        }
      })
    );
    // Failures are usually the machine being busy rather than the page, so each gets one more go,
    // alone, starting from a clean directory. A retry replaces the target's earlier results.
    const failed = targets.filter((target) => results.some((r) => !r.ok && r.id === target.id && r.locale === (target.locale ?? "en")));
    if (failed.length) console.log(`retrying ${failed.length} failed capture${failed.length === 1 ? "" : "s"} one at a time`);
    for (const target of failed) {
      await rm(path.join(settings.outDir, target.id, target.locale ?? "en"), { recursive: true, force: true });
      const captured = await capture(target);
      log(captured);
      const locale = target.locale ?? "en";
      for (let i = results.length - 1; i >= 0; i--) if (results[i].id === target.id && results[i].locale === locale) results.splice(i, 1);
      results.push(...captured);
    }
    if (failed.length) await dedupeIndex(path.join(settings.outDir, "index.jsonl"));
  } finally {
    await browser.close();
  }
  return results;
}

// A target whose first state succeeded before a later one failed is in the index twice once
// retried; the retry's line is the one that matches what is on disk
async function dedupeIndex(file: string): Promise<void> {
  const lines = (await readFile(file, "utf-8").catch(() => "")).trim().split("\n").filter(Boolean);
  const latest = new Map(
    lines.map((line) => {
      const { id, locale, state } = JSON.parse(line) as { id: string; locale: string; state: string };
      return [`${id}\u0000${locale}\u0000${state}`, line];
    })
  );
  await writeFile(file, [...latest.values()].map((line) => `${line}\n`).join(""));
}

export interface BatchEntry extends CaptureTarget {
  locales?: string[];
}
