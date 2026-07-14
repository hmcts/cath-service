import path from "node:path";
import { fileURLToPath } from "node:url";
import { type CheerioAPI, load } from "cheerio";
import nunjucks from "nunjucks";
import { expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RenderResult {
  html: string;
  $: CheerioAPI;
}

/**
 * Create a Nunjucks environment configured for testing
 *
 * @param modulePaths - Array of paths to template directories
 * @param options - Optional Nunjucks environment options (merged over the defaults)
 * @returns Configured Nunjucks environment
 */
export function createTestEnvironment(modulePaths: string[], options: nunjucks.ConfigureOptions = {}): nunjucks.Environment {
  // From libs/test-support/src, go up to project root then to govuk-frontend
  const govukPath = path.join(__dirname, "../../../node_modules/govuk-frontend/dist");

  // Build an isolated environment rather than nunjucks.configure(), which mutates
  // a shared global environment and lets concurrent test files clobber each
  // other's template search paths.
  const loader = new nunjucks.FileSystemLoader([...modulePaths, govukPath], { noCache: true });
  return new nunjucks.Environment(loader, { autoescape: true, ...options });
}

/**
 * Render a Nunjucks template and return both the HTML and a Cheerio instance
 *
 * @param env - Nunjucks environment
 * @param template - Template path relative to configured paths
 * @param data - Data to pass to the template
 * @returns Object containing the raw HTML and Cheerio instance
 */
export function render(env: nunjucks.Environment, template: string, data: Record<string, unknown>): RenderResult {
  const html = env.render(template, data);
  const $ = load(html);
  return { html, $ };
}

/**
 * Assert that the rendered page contains no GOV.UK error summary
 *
 * @param $ - Cheerio instance for the rendered page
 */
export function assertNoErrors($: CheerioAPI): void {
  expect($(".govuk-error-summary")).toHaveLength(0);
}

/**
 * Assert that the rendered page shows a GOV.UK error summary containing the
 * given messages
 *
 * @param $ - Cheerio instance for the rendered page
 * @param expectedMessages - Error messages expected in the summary list
 */
export function assertErrorSummary($: CheerioAPI, expectedMessages: string[]): void {
  const summary = $(".govuk-error-summary");
  expect(summary).toHaveLength(1);

  const listedErrors = summary
    .find(".govuk-error-summary__list li")
    .map((_, el) => $(el).text().trim())
    .get();

  for (const message of expectedMessages) {
    expect(listedErrors).toContain(message);
  }
}
