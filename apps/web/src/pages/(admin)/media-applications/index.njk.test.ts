import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(admin)/media-applications/index.njk";

const mockApplications = [
  { id: "app-1", name: "John Smith", employer: "BBC", appliedDate: new Date("2024-01-01") },
  { id: "app-2", name: "Jane Doe", employer: "ITV", appliedDate: new Date("2024-01-02") }
];

describe("media-applications index template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);

    env.addFilter("date", (value: string | Date) => {
      if (!value) return "";
      const date = typeof value === "string" ? new Date(value) : value;
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    });
  });

  describe("English content", () => {
    it("should render the page heading and a table row per application", () => {
      const data = {
        pageTitle: en.pageTitle,
        tableHeaders: en.tableHeaders,
        viewLink: en.viewLink,
        noApplications: en.noApplications,
        applications: mockApplications
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.pageTitle);

      const headers = $(".govuk-table__head .govuk-table__header")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([en.tableHeaders.name, en.tableHeaders.employer, en.tableHeaders.dateApplied, en.tableHeaders.action]);

      const bodyRows = $(".govuk-table__body .govuk-table__row");
      expect(bodyRows).toHaveLength(2);
      expect($(bodyRows[0]).text()).toContain("John Smith");
      expect($(bodyRows[0]).text()).toContain("BBC");

      const viewLinks = $(".govuk-table__body a.govuk-link");
      expect(viewLinks).toHaveLength(2);
      expect($(viewLinks[0]).attr("href")).toBe("/media-applications/app-1");
      expect($(viewLinks[0]).text().trim()).toBe(en.viewLink);
      expect($(viewLinks[1]).attr("href")).toBe("/media-applications/app-2");

      assertNoErrors($);
    });

    it("should show the no-applications message when the list is empty", () => {
      const data = {
        pageTitle: en.pageTitle,
        tableHeaders: en.tableHeaders,
        viewLink: en.viewLink,
        noApplications: en.noApplications,
        applications: []
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("p.govuk-body").text()).toContain(en.noApplications);
      expect($(".govuk-table")).toHaveLength(0);
      assertNoErrors($);
    });

    it("should render the error summary when loading fails", () => {
      const data = {
        pageTitle: en.pageTitle,
        error: en.errorMessages.loadFailed,
        applications: []
      };

      const { $ } = render(env, TEMPLATE, data);

      const summary = $(".govuk-error-summary");
      expect(summary).toHaveLength(1);
      expect(summary.text()).toContain(en.errorMessages.loadFailed);
      expect($(".govuk-table")).toHaveLength(0);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and table headers", () => {
      const data = {
        pageTitle: cy.pageTitle,
        tableHeaders: cy.tableHeaders,
        viewLink: cy.viewLink,
        noApplications: cy.noApplications,
        applications: mockApplications
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.pageTitle);

      const headers = $(".govuk-table__head .govuk-table__header")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toEqual([cy.tableHeaders.name, cy.tableHeaders.employer, cy.tableHeaders.dateApplied, cy.tableHeaders.action]);

      expect($(".govuk-table__body a.govuk-link").first().text().trim()).toBe(cy.viewLink);
    });
  });
});
