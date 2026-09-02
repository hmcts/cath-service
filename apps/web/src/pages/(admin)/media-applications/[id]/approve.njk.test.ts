import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./approve-cy.js";
import { en } from "./approve-en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/media-applications/[id]/approve.njk";

const mockApplication = {
  id: "app-123",
  name: "Jane Reporter",
  email: "jane@news.example.com",
  employer: "Example News",
  appliedDate: new Date("2026-01-15T09:00:00Z"),
  proofOfIdPath: "path/to/proof.pdf",
  proofOfIdOriginalName: "press-card.pdf"
};

const buildData = (lang: typeof en | typeof cy, overrides: Record<string, unknown> = {}) => ({
  pageTitle: lang.pageTitle,
  subheading: lang.subheading,
  tableHeaders: lang.tableHeaders,
  proofOfIdText: lang.proofOfIdText,
  viewProofOfId: lang.viewProofOfId,
  fileNotAvailable: lang.fileNotAvailable,
  radioLegend: lang.radioLegend,
  radioOptions: lang.radioOptions,
  continueButton: lang.continueButton,
  application: mockApplication,
  proofOfIdFilename: mockApplication.proofOfIdOriginalName,
  ...overrides
});

describe("approve template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../../"), // pages directory
      path.join(__dirname, "../../../../../../../libs/web-core/src/views") // layouts
    ]);
    env.addFilter("date", (value: string | Date) => (value ? new Date(value).toLocaleDateString("en-GB") : ""));
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);
    });

    it("should render the applicant details summary list", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h2.govuk-heading-m").text()).toContain(en.subheading);
      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toContain(en.tableHeaders.name);
      expect(keys).toContain(en.tableHeaders.email);
      expect(keys).toContain(en.tableHeaders.employer);
      expect(keys).toContain(en.tableHeaders.proofOfId);

      const values = $(".govuk-summary-list__value").text();
      expect(values).toContain(mockApplication.name);
      expect(values).toContain(mockApplication.email);
      expect(values).toContain(mockApplication.employer);
    });

    it("should render the proof of id view link when a proof path exists", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const link = $(`a[href="/media-applications/${mockApplication.id}/proof-of-id"]`);
      expect(link).toHaveLength(1);
      expect(link.text()).toContain(en.viewProofOfId);
    });

    it("should render the file not available text when there is no proof path", () => {
      const data = buildData(en, {
        application: { ...mockApplication, proofOfIdPath: null }
      });

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-summary-list__value").text()).toContain(en.fileNotAvailable);
      expect($(`a[href="/media-applications/${mockApplication.id}/proof-of-id"]`)).toHaveLength(0);
    });

    it("should render the confirm radios and continue button", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const radios = $('input[name="confirm"]');
      expect(radios).toHaveLength(2);
      expect(radios.map((_, el) => $(el).attr("value")).get()).toEqual(["yes", "no"]);
      expect($("form button.govuk-button").text()).toContain(en.continueButton);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render a validation error summary when errors are present", () => {
      const data = buildData(en, {
        errors: [{ text: en.errorMessages.selectOption, href: "#confirm" }]
      });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorMessages.selectOption]);
    });

    it("should render a top-level error message and back link when error is set", () => {
      const data = {
        pageTitle: en.pageTitle,
        error: en.errorMessages.loadFailed,
        application: null
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-error-summary__body").text()).toContain(en.errorMessages.loadFailed);
      expect($('a[href="/media-applications"]')).toHaveLength(1);
      expect($('input[name="confirm"]')).toHaveLength(0);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and subheading", () => {
      const data = buildData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);
      expect($("h2.govuk-heading-m").text()).toContain(cy.subheading);
    });

    it("should render Welsh radio options and continue button", () => {
      const data = buildData(cy);

      const { $ } = render(env, TEMPLATE, data);

      const labels = $(".govuk-radios__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(labels).toContain(cy.radioOptions.yes);
      expect(labels).toContain(cy.radioOptions.no);
      expect($("form button.govuk-button").text()).toContain(cy.continueButton);
    });
  });
});
