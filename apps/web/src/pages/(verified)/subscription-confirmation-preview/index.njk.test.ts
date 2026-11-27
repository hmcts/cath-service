import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/subscription-confirmation-preview/index.njk";

describe("subscription-confirmation-preview template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the heading, location, list type and version tables", () => {
      const data = {
        ...en,
        confirmedCaseSubscriptions: [],
        locationRows: [{ locationId: "1", name: "Blackburn Crown Court" }],
        listTypes: [{ listTypeId: 5, name: "Civil Daily Cause List" }],
        languageDisplay: "English",
        pendingLanguage: "ENGLISH"
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text().trim()).toBe(en.heading);
      expect($.text()).toContain("Blackburn Crown Court");
      expect($.text()).toContain("Civil Daily Cause List");
      expect($.text()).toContain("English");
      expect($("th").text()).toContain(en.tableHeaderCourt);
      expect($("th").text()).toContain(en.tableHeaderListType);
      expect($("th").text()).toContain(en.tableHeaderVersion);
      assertNoErrors($);
    });

    it("should render remove and confirm actions for locations", () => {
      const data = {
        ...en,
        confirmedCaseSubscriptions: [],
        locationRows: [{ locationId: "42", name: "Blackburn Crown Court" }],
        listTypes: [{ listTypeId: 5, name: "Civil Daily Cause List" }],
        languageDisplay: "English"
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($('input[name="locationId"][value="42"]')).toHaveLength(1);
      expect($('input[name="action"][value="remove-location"]')).toHaveLength(1);
      expect($('input[name="action"][value="remove-list-type"]')).toHaveLength(1);
      expect($('input[name="action"][value="change-version"]')).toHaveLength(1);
      const confirmForm = $('input[name="action"][value="confirm"]').closest("form");
      expect(confirmForm.attr("method")).toBe("post");
      expect($("button[type='submit']").text()).toContain(en.confirmButton);
    });

    it("should render the select list types link when no list types selected", () => {
      const data = {
        ...en,
        confirmedCaseSubscriptions: [],
        locationRows: [{ locationId: "42", name: "Blackburn Crown Court" }],
        listTypes: [],
        languageDisplay: en.noLanguageSelected,
        errors: {
          titleText: en.errorSummaryTitle,
          errorList: [{ text: en.errorNoListType, href: "#select-list-types-link" }]
        }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorNoListType]);
      expect($("#select-list-types-link").text().trim()).toBe(en.selectListTypesLink);
    });

    it("should render the case subscriptions table when only cases are confirmed", () => {
      const data = {
        ...en,
        confirmedCaseSubscriptions: [{ caseName: "Smith v Jones", caseNumber: "ABC123" }],
        locationRows: [],
        listTypes: [],
        languageDisplay: en.noLanguageSelected
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("th").text()).toContain(en.tableHeaderCaseName);
      expect($("th").text()).toContain(en.tableHeaderReferenceNumber);
      expect($.text()).toContain("Smith v Jones");
      expect($.text()).toContain("ABC123");
      expect($('input[name="action"][value="confirm"]')).toHaveLength(1);
    });

    it("should render an error summary and add subscriptions button when nothing is selected", () => {
      const data = {
        ...en,
        confirmedCaseSubscriptions: [],
        locationRows: [],
        listTypes: [],
        languageDisplay: en.noLanguageSelected,
        errors: {
          titleText: en.errorSummaryTitle,
          errorList: [{ text: en.errorNoSubscription, href: "#" }]
        }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorNoSubscription]);
      expect($("button[type='submit']").text()).toContain(en.addSubscriptionsButton);
      expect($('form[action="/add-email-subscription"]')).toHaveLength(1);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and table headers", () => {
      const data = {
        ...cy,
        confirmedCaseSubscriptions: [],
        locationRows: [{ locationId: "1", name: "Llys y Goron Blackburn" }],
        listTypes: [{ listTypeId: 5, name: "Rhestr Achosion Dyddiol Sifil" }],
        languageDisplay: "Saesneg"
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text().trim()).toBe(cy.heading);
      expect($("th").text()).toContain(cy.tableHeaderCourt);
      expect($("button[type='submit']").text()).toContain(cy.confirmButton);
    });

    it("should render the Welsh error summary when nothing is selected", () => {
      const data = {
        ...cy,
        confirmedCaseSubscriptions: [],
        locationRows: [],
        listTypes: [],
        languageDisplay: cy.noLanguageSelected,
        errors: {
          titleText: cy.errorSummaryTitle,
          errorList: [{ text: cy.errorNoSubscription, href: "#" }]
        }
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.errorNoSubscription]);
    });
  });

  describe("version column header", () => {
    it("should render the version header as plain text with no tooltip", () => {
      const data = {
        ...en,
        confirmedCaseSubscriptions: [],
        locationRows: [{ locationId: "1", name: "Blackburn Crown Court" }],
        listTypes: [],
        languageDisplay: "English"
      };

      const { $ } = render(env, TEMPLATE, data);

      const versionHeader = $("th.govuk-table__header").filter((_, el) => $(el).text().trim() === en.tableHeaderVersion);
      expect(versionHeader).toHaveLength(1);
      expect(versionHeader.find("svg")).toHaveLength(0);
      expect($(".app-version-header")).toHaveLength(0);
      expect($("table svg")).toHaveLength(0);
      expect($('[role="region"][aria-label="information"]')).toHaveLength(0);
    });

    it("should render the Welsh version header with no tooltip", () => {
      const data = {
        ...cy,
        confirmedCaseSubscriptions: [],
        locationRows: [{ locationId: "1", name: "Llys y Goron Blackburn" }],
        listTypes: [],
        languageDisplay: "Saesneg"
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($("th.govuk-table__header").filter((_, el) => $(el).text().trim() === cy.tableHeaderVersion)).toHaveLength(1);
      expect($("table svg")).toHaveLength(0);
    });
  });

  it("should have matching English and Welsh content keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
  });
});
