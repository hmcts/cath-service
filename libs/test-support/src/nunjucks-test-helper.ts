import path from "node:path";
import { fileURLToPath } from "node:url";
import { type CheerioAPI, load } from "cheerio";
import nunjucks from "nunjucks";

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
 * @returns Configured Nunjucks environment
 */
export function createTestEnvironment(modulePaths: string[]): nunjucks.Environment {
  // From libs/test-support/src, go up to project root then to govuk-frontend
  const govukPath = path.join(__dirname, "../../../node_modules/govuk-frontend/dist");

  return nunjucks.configure([...modulePaths, govukPath], {
    autoescape: true,
    noCache: true
  });
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
