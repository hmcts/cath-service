import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Citizen and verified user journeys (a11y audit #1621, item 2.6). Admin journeys are audited separately.
const JOURNEY_DIRECTORIES = ["(public)", "(verified)", "(list-types)", "(core)", "(auth)"];

// Pages whose error summary is not a form submission error, so Back cannot bring back a fixed error.
const EXEMPT_PAGES = new Set([
  // Shows an error on GET when the user has no list types; the POST only redirects.
  "(verified)/subscription-configure-list-preview/index.ts"
]);

const ERROR_SUMMARY = /govukErrorSummary|govuk-error-summary/;
const EXPORTS_POST = /export const POST|export \{[^}]*\bPOST\b[^}]*\}/;

const formPages = JOURNEY_DIRECTORIES.flatMap((directory) => findControllers(path.join(__dirname, directory)))
  .map((controllerPath) => ({
    page: path.relative(__dirname, controllerPath),
    controller: readFileSync(controllerPath, "utf8"),
    templatePath: controllerPath.replace(/\.ts$/, ".njk")
  }))
  .filter(({ page, controller, templatePath }) => {
    return !EXEMPT_PAGES.has(page) && EXPORTS_POST.test(controller) && existsSync(templatePath) && ERROR_SUMMARY.test(readFileSync(templatePath, "utf8"));
  });

describe("form pages clear fixed errors when the user goes Back", () => {
  it("should find the form pages to check", () => {
    expect(formPages.length).toBeGreaterThan(0);
  });

  it.each(formPages.map((formPage) => [formPage.page, formPage]))("%s should replace its history entry with backButtonHistory", (_, formPage) => {
    expect(readFileSync(formPage.templatePath, "utf8")).toContain("backButtonHistory(cspNonce)");
  });

  it.each(formPages.map((formPage) => [formPage.page, formPage]))("%s should send a no-store Cache-Control header", (_, formPage) => {
    expect(formPage.controller).toMatch(/noStore\(\)|NO_STORE/);
  });
});

function findControllers(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findControllers(entryPath);
    }
    return entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") ? [entryPath] : [];
  });
}
