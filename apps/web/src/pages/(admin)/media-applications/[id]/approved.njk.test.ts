import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./approved-cy.js";
import { en } from "./approved-en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesRoot = path.resolve(__dirname, "../../../");
const webCoreViews = path.resolve(__dirname, "../../../../../../../libs/web-core/src/views");
const template = "(admin)/media-applications/[id]/approved.njk";

const mockApplication = {
  id: "app-123",
  name: "John Smith",
  email: "john@bbc.co.uk",
  employer: "BBC",
  appliedDate: new Date("2024-03-15")
};

describe("approved.njk template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([pagesRoot, webCoreViews]);
    env.addFilter("date", (value: string | Date) => {
      if (!value) return "";
      const date = typeof value === "string" ? new Date(value) : value;
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    });
  });

  describe("English content", () => {
    it("should render the confirmation panel with the page title", () => {
      const data = {
        pageTitle: en.pageTitle,
        tableHeaders: en.tableHeaders,
        whatHappensNextHeading: en.whatHappensNextHeading,
        whatHappensNextText: en.whatHappensNextText,
        returnLink: en.returnLink,
        application: mockApplication
      };

      const { $ } = render(env, template, data);

      const panel = $(".govuk-panel--confirmation");
      expect(panel).toHaveLength(1);
      expect(panel.find(".govuk-panel__title").text()).toContain(en.pageTitle);
    });

    it("should render the application details in a summary list", () => {
      const data = {
        pageTitle: en.pageTitle,
        tableHeaders: en.tableHeaders,
        whatHappensNextHeading: en.whatHappensNextHeading,
        whatHappensNextText: en.whatHappensNextText,
        returnLink: en.returnLink,
        application: mockApplication
      };

      const { $ } = render(env, template, data);

      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      const values = $(".govuk-summary-list__value")
        .map((_, el) => $(el).text().trim())
        .get();

      expect(keys).toEqual([en.tableHeaders.name, en.tableHeaders.email, en.tableHeaders.employer, en.tableHeaders.dateApplied]);
      expect(values).toContain(mockApplication.name);
      expect(values).toContain(mockApplication.email);
      expect(values).toContain(mockApplication.employer);
      expect(values).toContain("15 Mar 2024");
    });

    it("should render the what happens next section", () => {
      const data = {
        pageTitle: en.pageTitle,
        tableHeaders: en.tableHeaders,
        whatHappensNextHeading: en.whatHappensNextHeading,
        whatHappensNextText: en.whatHappensNextText,
        returnLink: en.returnLink,
        application: mockApplication
      };

      const { $ } = render(env, template, data);

      expect($("h2").text()).toContain(en.whatHappensNextHeading);
      expect($.html()).toContain(en.whatHappensNextText);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh page title and headers", () => {
      const data = {
        pageTitle: cy.pageTitle,
        tableHeaders: cy.tableHeaders,
        whatHappensNextHeading: cy.whatHappensNextHeading,
        whatHappensNextText: cy.whatHappensNextText,
        returnLink: cy.returnLink,
        application: mockApplication
      };

      const { $ } = render(env, template, data);

      expect($(".govuk-panel__title").text()).toContain(cy.pageTitle);
      const keys = $(".govuk-summary-list__key")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(keys).toEqual([cy.tableHeaders.name, cy.tableHeaders.email, cy.tableHeaders.employer, cy.tableHeaders.dateApplied]);
      expect($("h2").text()).toContain(cy.whatHappensNextHeading);
    });
  });

  describe("Error state", () => {
    it("should render the error summary and no panel when an error is passed", () => {
      const data = {
        pageTitle: en.pageTitle,
        error: en.errorMessages.loadFailed,
        application: null
      };

      const { $ } = render(env, template, data);

      const errorSummary = $(".govuk-error-summary");
      expect(errorSummary).toHaveLength(1);
      expect(errorSummary.text()).toContain(en.errorMessages.loadFailed);
      expect($(".govuk-panel--confirmation")).toHaveLength(0);
      expect($(".govuk-summary-list")).toHaveLength(0);
    });
  });
});
