import { appendFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { type Browser, chromium } from "playwright";
import { capturePage } from "../capture/capture-page.js";
import type { Journey, JourneySuite } from "./journey.js";

const PLAYWRIGHT_VERSION = createRequire(import.meta.url)("playwright/package.json").version as string;
const TIMEZONE = "Europe/London";
const VIEWPORT = { width: 1280, height: 800 };

// Runs every journey in a project's journeys module, once per locale, each in a fresh browser
// context with video. Output: <outDir>/<journey>/<locale>/<NN-checkpoint>/ plus video.webm and
// journey.json (the ordered checkpoints and the actions between them).
export async function runJourneys(moduleFile: string, options: RunJourneysOptions): Promise<JourneyResult[]> {
  const suite = (await import(pathToFileURL(path.resolve(moduleFile)).href)).default as JourneySuite;
  const selected = options.only?.length ? suite.journeys.filter((journey) => options.only?.includes(journey.id)) : suite.journeys;

  // A full run replaces the output; a partial run (--only) replaces just the journeys it runs
  if (options.only?.length) for (const journey of selected) await rm(path.join(options.outDir, journey.id), { recursive: true, force: true });
  else await rm(options.outDir, { recursive: true, force: true });
  await mkdir(options.outDir, { recursive: true });

  const browser = await chromium.launch();
  const results: JourneyResult[] = [];
  try {
    // Sequential on purpose: journeys change shared app data, so their order is part of the baseline
    for (const journey of selected) {
      for (const locale of options.locales) results.push(await runOne(browser, suite, journey, locale, options.outDir));
    }
  } finally {
    await browser.close();
  }
  return results;
}

async function runOne(browser: Browser, suite: JourneySuite, journey: Journey, locale: string, outDir: string): Promise<JourneyResult> {
  const journeyDir = path.join(outDir, journey.id, locale);
  const videoDir = path.join(journeyDir, ".video");
  await mkdir(journeyDir, { recursive: true });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: "en-GB",
    timezoneId: TIMEZONE,
    reducedMotion: "reduce",
    ignoreHTTPSErrors: true,
    recordVideo: { dir: videoDir, size: VIEWPORT }
  });
  if (suite.cookies?.length) await context.addCookies(suite.cookies.map((cookie) => ({ ...cookie, url: suite.baseUrl })));
  const page = await context.newPage();

  const steps: JourneyStep[] = [];
  let pendingAction: string | null = null;
  const startedAt = new Date().toISOString();
  let error: string | null = null;

  try {
    if (journey.viewAs) {
      if (!suite.signIn) throw new Error(`${journey.id} needs sign-in as ${journey.viewAs} but ${suite.app} has no signIn`);
      await suite.signIn(page, journey.viewAs);
    }
    await journey.run({
      page,
      locale,
      data: suite.data ?? {},
      goto: async (pagePath) => {
        await page.goto(withLocale(`${suite.baseUrl}${pagePath}`, locale), { waitUntil: "networkidle" });
      },
      act: async (description, action) => {
        await action();
        await page.waitForLoadState("networkidle");
        pendingAction = description;
      },
      checkpoint: async (name, note) => {
        const stepName = `${String(steps.length + 1).padStart(2, "0")}-${name}`;
        await page.evaluate(() => document.fonts.ready);
        const meta = await capturePage(page, path.join(journeyDir, stepName));
        steps.push({ step: stepName, url: meta.url, path: new URL(meta.url).pathname, via: pendingAction, note: note ?? null, title: meta.title, h1: meta.h1 });
        pendingAction = null;
      }
    });
  } catch (caught) {
    error = (caught as Error).message;
    await writeFile(path.join(journeyDir, "error.html"), await page.content().catch(() => ""));
    await page.screenshot({ path: path.join(journeyDir, "error.png"), fullPage: true }).catch(() => undefined);
  }

  const video = page.video();
  await context.close();
  if (video) await rename(await video.path(), path.join(journeyDir, "video.webm")).catch(() => undefined);
  await rm(videoDir, { recursive: true, force: true });

  const record = {
    journey: journey.id,
    description: journey.description,
    app: suite.app,
    locale,
    viewAs: journey.viewAs ?? null,
    startedAt,
    timezone: TIMEZONE,
    viewport: VIEWPORT,
    playwright: PLAYWRIGHT_VERSION,
    ok: error === null,
    error,
    steps
  };
  await writeFile(path.join(journeyDir, "journey.json"), `${JSON.stringify(record, null, 2)}\n`);
  await appendFile(path.join(outDir, "index.jsonl"), `${JSON.stringify({ journey: journey.id, locale, ok: record.ok, steps: steps.length, error })}\n`);
  return { journey: journey.id, locale, ok: record.ok, steps: steps.length, error };
}

function withLocale(url: string, locale: string): string {
  const parsed = new URL(url);
  if (locale !== "en") parsed.searchParams.set("lng", locale);
  return parsed.toString();
}

export interface RunJourneysOptions {
  outDir: string;
  locales: string[];
  only?: string[];
}

export interface JourneyResult {
  journey: string;
  locale: string;
  ok: boolean;
  steps: number;
  error: string | null;
}

interface JourneyStep {
  step: string;
  url: string;
  path: string;
  via: string | null;
  note: string | null;
  title: string;
  h1: string[];
}
