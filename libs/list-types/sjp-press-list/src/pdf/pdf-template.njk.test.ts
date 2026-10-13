import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { en } from "../sjp-press-list/en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE = "pdf-template.njk";

const t = en.common;

function buildCase(offenceOverrides: Record<string, unknown> = {}) {
  return {
    name: "John Smith",
    formattedDob: "1 January 1990",
    reference: "REF-123",
    address: "1 Test Street",
    prosecutor: "TV Licensing",
    offences: [
      {
        reportingRestriction: false,
        offenceTitle: "Non-payment of TV licence",
        offenceWording: "",
        ...offenceOverrides
      }
    ]
  };
}

function baseData(overrides: Record<string, unknown> = {}) {
  return {
    t,
    pdfStyles: "",
    listTitle: "Single Justice Procedure cases",
    contentDate: "13 July 2026",
    publishedDateTime: "13 July 2026 at 9:00am",
    cases: [buildCase()],
    ...overrides
  };
}

function renderPdf(overrides: Record<string, unknown> = {}) {
  return render(env, TEMPLATE, baseData(overrides));
}

let env: nunjucks.Environment;

beforeEach(() => {
  env = createTestEnvironment([__dirname]);
});

describe("sjp-press-list pdf-template", () => {
  describe("Reporting restriction tag", () => {
    it("should render the restriction-tag class, which now carries a grey background, when an offence has a reporting restriction", () => {
      const { $ } = renderPdf({ cases: [buildCase({ reportingRestriction: true })] });

      const restrictionTag = $("p.restriction-tag");
      expect(restrictionTag).toHaveLength(1);
      expect(restrictionTag.text()).toContain(t.reportingRestrictionHeader);
    });

    it("should not render the restriction tag when an offence has no reporting restriction", () => {
      const { $ } = renderPdf({ cases: [buildCase({ reportingRestriction: false })] });

      expect($("p.restriction-tag")).toHaveLength(0);
    });
  });

  describe("Caution box", () => {
    it("should render the caution box with the caution note and reporting text", () => {
      const { $ } = renderPdf();

      const cautionBox = $(".caution-box");
      expect(cautionBox).toHaveLength(1);
      expect(cautionBox.text()).toContain(t.cautionNote);
      expect(cautionBox.text()).toContain(t.cautionReporting);
    });
  });
});
