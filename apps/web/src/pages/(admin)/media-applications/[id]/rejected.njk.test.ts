import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./rejected-cy.js";
import { en } from "./rejected-en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "media-applications/[id]/rejected.njk";

const mockApplication = {
  id: "app-123",
  name: "John Smith",
  email: "john@bbc.co.uk",
  employer: "BBC",
  appliedDate: new Date("2024-01-15")
};

const buildData = (lang: typeof en | typeof cy, overrides: Record<string, unknown> = {}) => ({
  pageTitle: lang.pageTitle,
  tableHeaders: lang.tableHeaders,
  reasonsHeading: lang.reasonsHeading,
  viewLinkText: lang.viewLinkText,
  whatHappensNextHeading: lang.whatHappensNextHeading,
  whatHappensNextText: lang.whatHappensNextText,
  returnLink: lang.returnLink,
  application: mockApplication,
  reasonsList: [],
  ...overrides
});

describe("rejected.njk template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../../libs/web-core/src/views")]);
    env.addFilter("date", (value: string | Date) => {
      if (!value) return "";
      const date = typeof value === "string" ? new Date(value) : value;
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    });
  });

  describe("English content", () => {
    it("should render the confirmation panel with the page title", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const panel = $(".govuk-panel--confirmation");
      expect(panel).toHaveLength(1);
      expect(panel.find(".govuk-panel__title").text()).toContain(en.pageTitle);
      assertNoErrors($);
    });

    it("should render the applicant details in the summary list", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const summaryText = $(".govuk-summary-list").text();
      expect(summaryText).toContain(en.tableHeaders.name);
      expect(summaryText).toContain(mockApplication.name);
      expect(summaryText).toContain(en.tableHeaders.email);
      expect(summaryText).toContain(mockApplication.email);
      expect(summaryText).toContain(en.tableHeaders.employer);
      expect(summaryText).toContain(mockApplication.employer);
      expect(summaryText).toContain(en.tableHeaders.dateApplied);
    });

    it("should render the what happens next section with a mailto link", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h2.govuk-heading-m").text()).toContain(en.whatHappensNextHeading);
      const mailto = $(`a[href="mailto:${mockApplication.email}"]`);
      expect(mailto).toHaveLength(1);
      expect(mailto.text()).toBe(mockApplication.email);
    });

    it("should render selected rejection reasons as a numbered list", () => {
      const reasonsList = [en.reasons.invalidId, en.reasons.detailsMismatch];
      const data = buildData(en, { reasonsList });

      const { $ } = render(env, TEMPLATE, data);

      const orderedList = $("ol.govuk-list--number");
      expect(orderedList).toHaveLength(1);
      expect($(".govuk-summary-list").text()).toContain(en.reasonsHeading);
      const items = orderedList.find("li");
      expect(items).toHaveLength(2);
      expect(orderedList.text()).toContain("ID provided has expired or is not a Press ID.");
      expect(orderedList.text()).toContain("Details provided do not match.");
    });

    it("should not render the reasons row when reasonsList is empty", () => {
      const data = buildData(en, { reasonsList: [] });

      const { $ } = render(env, TEMPLATE, data);

      expect($("ol.govuk-list--number")).toHaveLength(0);
      expect($(".govuk-summary-list").text()).not.toContain(en.reasonsHeading);
    });
  });

  describe("Welsh content", () => {
    it("should render the panel title and headings in Welsh", () => {
      const data = buildData(cy);

      const { $ } = render(env, TEMPLATE, data);

      expect($(".govuk-panel__title").text()).toContain(cy.pageTitle);
      expect($("h2.govuk-heading-m").text()).toContain(cy.whatHappensNextHeading);
      expect($(".govuk-summary-list").text()).toContain(cy.tableHeaders.name);
      assertNoErrors($);
    });
  });

  describe("Error state", () => {
    it("should render the error summary and return link when an error is present", () => {
      const data = {
        pageTitle: en.pageTitle,
        error: en.errorMessages.loadFailed,
        returnLink: en.returnLink,
        application: null
      };

      const { $ } = render(env, TEMPLATE, data);

      const errorSummary = $(".govuk-error-summary");
      expect(errorSummary).toHaveLength(1);
      expect(errorSummary.text()).toContain(en.errorMessages.loadFailed);
      const returnLink = $('a[href="/media-applications"]');
      expect(returnLink).toHaveLength(1);
      expect(returnLink.text()).toContain(en.returnLink);
      expect($(".govuk-panel--confirmation")).toHaveLength(0);
    });
  });
});
