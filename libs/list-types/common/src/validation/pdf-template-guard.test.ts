import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PDF_BASE_STYLES, PDF_CIVIL_FAMILY_STYLES } from "../pdf/pdf-styles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIST_TYPES_ROOT = path.resolve(__dirname, "../../../");

// Property-access patterns that indicate a template is rendering an actual
// per-case/per-hearing/per-offence reporting restriction (as opposed to the
// static legal-notice heading text that several templates also show, e.g.
// crown-warned-list's "Restrictions on publishing..." info-box, which uses
// locale strings like t.reportingRestrictionsTitle and has no restriction
// markup to colour at all). A plain substring match on "reportingRestriction"
// produces false positives against that static text.
const RESTRICTION_DATA_ACCESS_PATTERN = /\b(case|hearing|offence|application)\.(formattedReportingRestriction|reportingRestriction[A-Za-z]*)/;

const GREY_RESTRICTION_CLASS_PATTERN = /restriction-row|restriction-tag|restriction-row-block/;

const CREAM_BACKGROUND_PATTERN = /#fff7e6/i;

const WARNING_CLASS_REFERENCE_PATTERN = /class="warning-(row|icon|text)"/;

const LOCAL_WARNING_ROW_STYLE_PATTERN = /\.warning-row\s*\{/;

const BARE_COMMON_CAUTION_PATTERN = /\{\{\s*common\.(cautionNote|cautionReporting)/;

interface PdfTemplate {
  packageName: string;
  fileName: string;
  filePath: string;
  content: string;
}

function findPdfTemplates(): PdfTemplate[] {
  const entries = readdirSync(LIST_TYPES_ROOT, { withFileTypes: true });
  const templates: PdfTemplate[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const packageName = entry.name;
    if (packageName === "common") continue;

    const pdfDir = path.join(LIST_TYPES_ROOT, packageName, "src", "pdf");
    if (!existsSync(pdfDir)) continue;

    const njkFiles = readdirSync(pdfDir).filter((f) => f.endsWith(".njk"));
    for (const fileName of njkFiles) {
      const filePath = path.join(pdfDir, fileName);
      templates.push({ packageName, fileName, filePath, content: readFileSync(filePath, "utf-8") });
    }
  }

  return templates;
}

describe("guard: every PDF template renders reporting restrictions with a grey background and no undefined restriction/warning classes", () => {
  const templates = findPdfTemplates();

  it("should find at least one PDF template to guard (sanity check the glob covers src/pdf/*.njk)", () => {
    expect(templates.length).toBeGreaterThan(0);
    // utiac-jr-daily-hearing-list ships a second pdf-template-london.njk alongside
    // pdf-template.njk - if the glob only matched the fixed filename this would be 1 less.
    const utiacTemplates = templates.filter((t) => t.packageName === "utiac-jr-daily-hearing-list");
    expect(utiacTemplates.map((t) => t.fileName).sort()).toEqual(["pdf-template-london.njk", "pdf-template.njk"]);
  });

  it("should find no template with an unstyled or cream-background reporting-restriction row", () => {
    const violations: string[] = [];

    for (const template of templates) {
      if (CREAM_BACKGROUND_PATTERN.test(template.content)) {
        violations.push(`${template.packageName}/${template.fileName}: references cream #fff7e6 background`);
      }

      const rendersRestrictionData = RESTRICTION_DATA_ACCESS_PATTERN.test(template.content);
      if (rendersRestrictionData && !GREY_RESTRICTION_CLASS_PATTERN.test(template.content)) {
        violations.push(`${template.packageName}/${template.fileName}: renders reporting-restriction data without a grey restriction class`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("should find no template referencing warning-row/warning-icon/warning-text without a resolvable style definition", () => {
    const sharedStylesDefineWarning = `${PDF_BASE_STYLES}${PDF_CIVIL_FAMILY_STYLES}`.includes(".warning-row");

    const violations: string[] = [];

    for (const template of templates) {
      if (!WARNING_CLASS_REFERENCE_PATTERN.test(template.content)) continue;

      const hasLocalStyle = LOCAL_WARNING_ROW_STYLE_PATTERN.test(template.content);
      if (!hasLocalStyle && !sharedStylesDefineWarning) {
        violations.push(`${template.packageName}/${template.fileName}: references warning-row/warning-icon/warning-text with no resolvable style`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("should find no template using a bare `common.cautionNote`/`common.cautionReporting` context reference", () => {
    const violations = templates
      .filter((t) => BARE_COMMON_CAUTION_PATTERN.test(t.content))
      .map((t) => `${t.packageName}/${t.fileName}: uses a bare common.cautionNote/cautionReporting reference instead of t.cautionNote or t.common.cautionNote`);

    expect(violations).toEqual([]);
  });
});
