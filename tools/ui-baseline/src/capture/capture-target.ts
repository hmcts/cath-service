import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type { Browser, BrowserContextOptions, Page } from "playwright";
import { capturePage, expandAll } from "./capture-page.js";

const PLAYWRIGHT_VERSION = createRequire(import.meta.url)("playwright/package.json").version as string;
const DEFAULT_TIMEZONE = "Europe/London";

// Captures one target into <outDir>/<id>/<locale>/<state>/ for each state the page has:
// "default" as users first see it, and "expanded" when there is collapsed content to open.
export async function captureTarget(browser: Browser, target: CaptureTarget, settings: CaptureSettings): Promise<CaptureResult[]> {
  const locale = target.locale ?? "en";
  const context = await browser.newContext(contextOptions(settings));
  const page = await context.newPage();
  try {
    if (target.cookies?.length) await context.addCookies(target.cookies.map((cookie) => ({ ...cookie, url: target.url })));
    for (const setupUrl of target.setup ?? []) await page.goto(setupUrl, { waitUntil: "networkidle" });

    const response = await page.goto(withLocale(target.url, locale), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const status = response?.status() ?? null;

    const results = [await captureState(page, target, settings, locale, "default", status)];
    if (await expandAll(page)) {
      await page.waitForLoadState("networkidle");
      results.push(await captureState(page, target, settings, locale, "expanded", status));
    }
    return results;
  } finally {
    await context.close();
  }
}

async function captureState(
  page: Page,
  target: CaptureTarget,
  settings: CaptureSettings,
  locale: string,
  state: string,
  status: number | null
): Promise<CaptureResult> {
  const outDir = path.join(settings.outDir, target.id, locale, state);
  const capturedAt = new Date().toISOString();
  try {
    const meta = await capturePage(page, outDir, { region: settings.region, status });
    const provenance = {
      id: target.id,
      locale,
      state,
      status,
      url: meta.url,
      capturedAt,
      timezone: settings.timezone ?? DEFAULT_TIMEZONE,
      viewport: page.viewportSize(),
      playwright: PLAYWRIGHT_VERSION,
      source: target.source ?? null
    };
    await writeFile(path.join(outDir, "provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`);
    await appendFile(path.join(settings.outDir, "index.jsonl"), `${JSON.stringify(provenance)}\n`);
    return { ok: true, id: target.id, locale, state, outDir, status };
  } catch (error) {
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "error.html"), await page.content());
    return { ok: false, id: target.id, locale, state, outDir, status, error: (error as Error).message };
  }
}

function contextOptions(settings: CaptureSettings): BrowserContextOptions {
  return {
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    locale: "en-GB",
    timezoneId: settings.timezone ?? DEFAULT_TIMEZONE,
    reducedMotion: "reduce",
    ignoreHTTPSErrors: true
  };
}

function withLocale(url: string, locale: string): string {
  if (locale === "en") return url;
  const parsed = new URL(url);
  parsed.searchParams.set("lng", locale);
  return parsed.toString();
}

export interface CaptureTarget {
  id: string;
  url: string;
  locale?: string;
  // Visited first in the same browser context, e.g. a sign-in URL
  setup?: string[];
  cookies?: { name: string; value: string }[];
  // Free-form record of how this page's data was produced (fixture, artefact, app commit, role)
  source?: Record<string, unknown>;
}

export interface CaptureSettings {
  outDir: string;
  region?: string;
  timezone?: string;
}

export interface CaptureResult {
  ok: boolean;
  id: string;
  locale: string;
  state: string;
  outDir: string;
  status: number | null;
  error?: string;
}
