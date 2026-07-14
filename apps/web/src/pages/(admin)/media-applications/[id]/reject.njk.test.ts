import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./reject-cy.js";
import { en } from "./reject-en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/media-applications/[id]/reject.njk";

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
  reasonsHeading: lang.reasonsHeading,
  tableHeaders: lang.tableHeaders,
  viewLinkText: lang.viewLinkText,
  radioLegend: lang.radioLegend,
  radioOptions: lang.radioOptions,
  continueButton: lang.continueButton,
  emailPreview: lang.emailPreview,
  application: mockApplication,
  reasonsList: [lang.reasons.notAccredited, lang.reasons.invalidId],
  ...overrides
});

describe("reject template", () => {
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
      expect(keys).toContain(en.tableHeaders.dateApplied);

      const values = $(".govuk-summary-list__value")
        .map((_, el) => $(el).text().trim())
        .get()
        .join(" ");
      expect(values).toContain(mockApplication.name);
      expect(values).toContain(mockApplication.email);
      expect(values).toContain(mockApplication.employer);
    });

    it("should render the rejection reasons row when reasons are present", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toContain(en.reasonsHeading);
      const reasonItems = $(".govuk-summary-list__value ol.govuk-list--number li");
      expect(reasonItems.length).toBe(2);
    });

    it("should render the proof of ID row with a view link", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const proofLink = $(`a[href="/media-applications/${mockApplication.id}/proof-of-id"]`);
      expect(proofLink.length).toBe(1);
      expect(proofLink.text()).toContain(en.viewLinkText);
    });

    it("should render the email preview details with the applicant name", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const details = $("details.govuk-details");
      expect(details.length).toBe(1);
      expect(details.find(".govuk-details__summary-text").text()).toContain(en.emailPreview.summaryText);
      expect(details.text()).toContain(mockApplication.name);
      expect(details.text()).toContain(en.emailPreview.rejectionMessage);
    });

    it("should render the confirmation radios and continue button", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const radios = $('input[name="confirm"]');
      expect(radios).toHaveLength(2);
      expect(radios.map((_, el) => $(el).attr("value")).get()).toEqual(["yes", "no"]);

      const form = $("form");
      expect(form.attr("method")).toBe("post");
      expect(form.attr("novalidate")).toBeDefined();
      expect($("button").text()).toContain(en.continueButton);
    });

    it("should not render an error summary when there are no errors", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render an error summary when validation fails", () => {
      const data = buildData(en, {
        errors: [{ text: en.errorMessages.selectOption, href: "#confirm" }]
      });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorMessages.selectOption]);
    });

    it("should render a load-failed error message instead of the form", () => {
      const data = {
        pageTitle: en.pageTitle,
        error: en.errorMessages.loadFailed,
        application: null
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-error-summary").text()).toContain(en.errorMessages.loadFailed);
      expect($('input[name="confirm"]')).toHaveLength(0);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and applicant detail keys", () => {
      const data = buildData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);
      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toContain(cy.tableHeaders.name);
      expect(keys).toContain(cy.reasonsHeading);
    });

    it("should render Welsh radio labels and button text", () => {
      const data = buildData(cy);

      const { $ } = render(env, TEMPLATE, data);

      const labels = $(".govuk-radios__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(labels).toEqual([cy.radioOptions.yes, cy.radioOptions.no]);
      expect($("button").text()).toContain(cy.continueButton);
    });

    it("should render the Welsh error summary", () => {
      const data = buildData(cy, {
        errors: [{ text: cy.errorMessages.selectOption, href: "#confirm" }]
      });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.errorMessages.selectOption]);
    });
  });
});
