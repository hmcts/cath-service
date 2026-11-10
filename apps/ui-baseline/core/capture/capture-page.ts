import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "playwright";

const DEFAULT_REGION = "main";
// WCAG 2.2 AA, matching what CaTH's E2E suite checks, but with no rules disabled: a baseline records everything
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
// WCAG 1.4.10: content must reflow at 320 CSS pixels, the width of 1280 at 400% zoom
const REFLOW_WIDTH = 320;
// Reflow is measured on mobile captures only. From there to 320px crosses none of GOV.UK Frontend's
// breakpoints (the first is 641px), so no component tears down or rebuilds, and a desktop capture,
// and the journey step after it, are never resized.
const MOBILE_WIDTH_MAX = 640;

// Captures one page state: the region's accessibility tree and text (the comparison), the whole
// page's tree and HTML (the frame: header, navigation, banners, footer), page details, axe results,
// whether the page reflows, and screenshots as evidence.
export async function capturePage(page: Page, outDir: string, options: CaptureOptions = {}): Promise<CaptureMeta> {
  const region = page.locator(options.region ?? DEFAULT_REGION).first();
  await region.waitFor({ timeout: 5000 });
  await mkdir(outDir, { recursive: true });

  const meta = await readMeta(page, options);
  const [aria, pageAria, text, html, pageHtml, axe] = await Promise.all([
    region.ariaSnapshot(),
    page.locator("body").ariaSnapshot(),
    region.innerText(),
    region.innerHTML(),
    page.locator("body").innerHTML(),
    runAxe(page)
  ]);

  await Promise.all([
    writeFile(path.join(outDir, "aria.yml"), `${aria}\n`),
    writeFile(path.join(outDir, "page.aria.yml"), `${pageAria}\n`),
    writeFile(path.join(outDir, "text.txt"), `${normaliseWhitespace(text)}\n`),
    writeFile(path.join(outDir, "axe.json"), `${JSON.stringify(axe, null, 2)}\n`),
    writeFile(path.join(outDir, "raw.html"), html),
    writeFile(path.join(outDir, "page.html"), pageHtml)
  ]);
  await screenshot(page, outDir);
  const withReflow = { ...meta, reflow: await measureReflow(page) };
  await writeFile(path.join(outDir, "meta.json"), `${JSON.stringify(withReflow, null, 2)}\n`);

  return withReflow;
}

// Opens collapsed content so the accessibility tree includes it. Returns false when there was
// nothing to open, in which case an "expanded" state would duplicate "default".
export async function expandAll(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const closedDetails = [...document.querySelectorAll("details")].filter((details) => !details.open);
    const showAll = [...document.querySelectorAll<HTMLButtonElement>(".govuk-accordion__show-all[aria-expanded='false']")];
    const sections = [...document.querySelectorAll<HTMLButtonElement>(".govuk-accordion__section-button[aria-expanded='false']")];
    for (const details of closedDetails) details.open = true;
    for (const button of showAll) button.click();
    if (showAll.length === 0) for (const button of sections) button.click();
    return closedDetails.length + showAll.length + sections.length > 0;
  });
}

async function runAxe(page: Page): Promise<AxeSummary> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return {
    violations: results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      help: violation.help,
      helpUrl: violation.helpUrl,
      targets: violation.nodes.map((node) => node.target.join(" "))
    })),
    incompleteCount: results.incomplete.length,
    // What axe could not decide, such as contrast over an image or of text styled as disabled
    incomplete: results.incomplete.map((check) => ({
      id: check.id,
      impact: check.impact ?? null,
      help: check.help,
      helpUrl: check.helpUrl,
      targets: check.nodes.map((node) => node.target.join(" "))
    })),
    passesCount: results.passes.length
  };
}

// page.png is the page as users see it at the capture width. Full-page screenshots cannot see
// content scrolled sideways inside a container (wide tables), so when anything overflows,
// page-full.png widens the viewport and lifts the overflow clipping to show all of it.
async function screenshot(page: Page, outDir: string): Promise<void> {
  await page.screenshot({ path: path.join(outDir, "page.png"), fullPage: true, animations: "disabled" });

  const neededWidth = await page.evaluate(() => {
    let width = document.documentElement.scrollWidth;
    for (const element of document.querySelectorAll<HTMLElement>("body *")) {
      if (element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).overflowX !== "visible") {
        width = Math.max(width, element.getBoundingClientRect().left + element.scrollWidth + 32);
      }
    }
    return Math.ceil(width);
  });
  const viewport = page.viewportSize();
  if (!viewport || neededWidth <= viewport.width) return;

  const style = await page.addStyleTag({ content: "body * { overflow: visible !important; max-width: none !important; }" });
  // Restored however the screenshot ends, as a journey carries on in the same page
  try {
    await page.setViewportSize({ width: neededWidth, height: viewport.height });
    await page.screenshot({ path: path.join(outDir, "page-full.png"), fullPage: true, animations: "disabled" });
  } finally {
    await style.evaluate((element) => (element as HTMLElement).remove()).catch(() => {});
    await page.setViewportSize(viewport);
  }
}

// How wide the page is at 320px: wider means it scrolls sideways. A table that scrolls inside its
// own container does not widen the page, so only content that breaks the layout is caught.
async function measureReflow(page: Page): Promise<{ width: number; scrollWidth: number } | null> {
  const viewport = page.viewportSize();
  if (!viewport || viewport.width > MOBILE_WIDTH_MAX) return null;
  try {
    await page.setViewportSize({ width: REFLOW_WIDTH, height: viewport.height });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    return { width: REFLOW_WIDTH, scrollWidth };
  } finally {
    await page.setViewportSize(viewport);
  }
}

async function readMeta(page: Page, options: CaptureOptions): Promise<CaptureMeta> {
  const dom = await page.evaluate((regionSelector) => {
    const region = document.querySelector(regionSelector) ?? document.body;
    return {
      title: document.title.trim(),
      lang: document.documentElement.lang,
      h1: [...region.querySelectorAll("h1")].map((h1) => (h1.textContent ?? "").replace(/\s+/g, " ").trim()),
      backLink: document.querySelector<HTMLAnchorElement>(".govuk-back-link")?.getAttribute("href") ?? null,
      forms: [...region.querySelectorAll("form")].map((form) => ({
        action: form.getAttribute("action"),
        method: (form.getAttribute("method") ?? "get").toLowerCase(),
        fields: [...form.querySelectorAll<HTMLInputElement>("input[name], select[name], textarea[name]")]
          .filter((field) => field.type !== "hidden")
          .map((field) => ({ name: field.name, type: field.type || field.tagName.toLowerCase() }))
      })),
      links: [...region.querySelectorAll("a[href]")].map((link) => ({
        text: (link.textContent ?? "").replace(/\s+/g, " ").trim(),
        href: link.getAttribute("href")
      }))
    };
  }, options.region ?? DEFAULT_REGION);

  return { url: page.url(), status: options.status ?? null, region: options.region ?? DEFAULT_REGION, ...dom };
}

function normaliseWhitespace(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

export interface CaptureOptions {
  region?: string;
  status?: number | null;
}

export interface CaptureMeta {
  url: string;
  status: number | null;
  // The region compared; the frame is the page around it
  region: string;
  title: string;
  lang: string;
  h1: string[];
  backLink: string | null;
  forms: { action: string | null; method: string; fields: { name: string; type: string }[] }[];
  links: { text: string; href: string | null }[];
  reflow?: { width: number; scrollWidth: number } | null;
}

export interface AxeSummary {
  violations: { id: string; impact: string | null; help: string; helpUrl: string; targets: string[] }[];
  incompleteCount: number;
  incomplete: { id: string; impact: string | null; help: string; helpUrl: string; targets: string[] }[];
  passesCount: number;
}
