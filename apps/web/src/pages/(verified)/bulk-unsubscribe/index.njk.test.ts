import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/bulk-unsubscribe/index.njk";

const caseSubscriptions = [
  {
    subscriptionId: "case-1",
    caseName: "Test Case",
    caseNumber: "REF123",
    dateAdded: new Date("2024-03-15")
  }
];

const courtSubscriptions = [
  {
    subscriptionId: "court-1",
    courtOrTribunalName: "Birmingham Crown Court",
    dateAdded: new Date("2024-03-16")
  }
];

const baseData = {
  caseSubscriptions,
  courtSubscriptions,
  previouslySelected: [],
  hasCaseSubscriptions: true,
  hasCourtSubscriptions: true,
  showEmptyState: false,
  caseSubscriptionsCount: 1,
  courtSubscriptionsCount: 1,
  allSubscriptionsCount: 2,
  csrfToken: "test-csrf-token"
};

describe("bulk-unsubscribe template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
    env.addFilter("date", (value: Date | string) => String(value));
  });

  describe("English content", () => {
    it("should render the page heading and bulk unsubscribe button", () => {
      const data = { ...en, ...baseData };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.bulkUnsubscribeHeading);
      expect($("button").text()).toContain(en.bulkUnsubscribeButton);
      assertNoErrors($);
    });

    it("should render a checkbox per subscription with subscription ids as values", () => {
      const data = { ...en, ...baseData };

      const { $ } = render(env, TEMPLATE, data);

      expect($("input.row-checkbox[value='case-1']").length).toBeGreaterThan(0);
      expect($("input.row-checkbox[value='court-1']").length).toBeGreaterThan(0);
      expect($("input[name='_csrf']").attr("value")).toBe("test-csrf-token");
    });

    it("should render subscription details in the tables", () => {
      const data = { ...en, ...baseData };

      const { $ } = render(env, TEMPLATE, data);

      expect($.html()).toContain("Test Case");
      expect($.html()).toContain("REF123");
      expect($.html()).toContain("Birmingham Crown Court");
      expect($.html()).toContain(en.tableHeaderCaseName);
      expect($.html()).toContain(en.tableHeaderCourtName);
    });

    it("should pre-check checkboxes for previously selected subscriptions", () => {
      const data = { ...en, ...baseData, previouslySelected: ["case-1"] };

      const { $ } = render(env, TEMPLATE, data);

      expect($("input.row-checkbox[value='case-1']").attr("checked")).toBeDefined();
      expect($("input.row-checkbox[value='court-1']").attr("checked")).toBeUndefined();
    });

    it("should render the empty state message and no form when there are no subscriptions", () => {
      const data = {
        ...en,
        caseSubscriptions: [],
        courtSubscriptions: [],
        previouslySelected: [],
        hasCaseSubscriptions: false,
        hasCourtSubscriptions: false,
        showEmptyState: true,
        caseSubscriptionsCount: 0,
        courtSubscriptionsCount: 0,
        allSubscriptionsCount: 0,
        csrfToken: "test-csrf-token"
      };

      const { $ } = render(env, TEMPLATE, data);

      expect($.html()).toContain(en.emptyStateMessage);
      expect($("form")).toHaveLength(0);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading and button", () => {
      const data = { ...cy, ...baseData };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.bulkUnsubscribeHeading);
      expect($("button").text()).toContain(cy.bulkUnsubscribeButton);
      expect($.html()).toContain(cy.tableHeaderCaseName);
    });
  });

  describe("Error states", () => {
    it("should render an error summary when errors are present", () => {
      const data = {
        ...en,
        ...baseData,
        errors: [{ text: en.errorNoSelectionMessage, href: en.errorNoSelectionHref }]
      };

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorNoSelectionMessage]);
    });
  });
});
