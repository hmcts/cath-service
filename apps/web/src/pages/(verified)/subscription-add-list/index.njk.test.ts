import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/subscription-add-list/index.njk";

const sampleGroups = [
  { letter: "C", items: [{ listTypeId: 1, name: "Civil List" }] },
  {
    letter: "F",
    items: [
      { listTypeId: 2, name: "Family List" },
      { listTypeId: 3, name: "Fast Track List" }
    ]
  }
];

function buildData(t: typeof en, overrides: Record<string, unknown> = {}) {
  return {
    ...t,
    listTypeGroups: sampleGroups,
    ...overrides
  };
}

describe("subscription-add-list template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the heading and description", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.heading);
      expect($("p.govuk-body").text()).toContain(en.description);
      assertNoErrors($);
    });

    it("should render a checkbox and label for each list type item", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($('input[name="selectedListTypes"]')).toHaveLength(3);
      expect($("#listType_1").attr("value")).toBe("1");
      expect($("#listType_2").attr("value")).toBe("2");
      expect($("table#list-types-table").text()).toContain("Civil List");
      expect($("table#list-types-table").text()).toContain("Family List");
      expect($("table#list-types-table").text()).toContain("Fast Track List");
    });

    it("should render one grouping header per letter group", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const headerText = $("table#list-types-table th").text();
      expect(headerText).toContain("C");
      expect(headerText).toContain("F");
    });

    it("should render the selection counter and continue button", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h2.govuk-heading-m").text()).toContain(en.userSelections);
      expect($("#selectionCount").text()).toBe("0");
      expect($("button.govuk-button").text()).toContain(en.continueButton);
    });

    it("should render the back link", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("a.govuk-back-link").attr("href")).toBe("/pending-subscriptions");
      expect($("a.govuk-back-link").text()).toContain(en.back);
    });
  });

  describe("no list types", () => {
    it("should render a message and no form when there are no list type groups", () => {
      // Arrange
      const data = buildData(en, { listTypeGroups: [] });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("p.govuk-body").text()).toContain(en.noListTypes);
      expect($("form")).toHaveLength(0);
      expect($("table")).toHaveLength(0);
    });
  });

  describe("error state", () => {
    it("should render the error summary when a selection error is passed", () => {
      // Arrange
      const data = buildData(en, {
        errors: {
          titleText: en.errorSummaryTitle,
          errorList: [{ text: en.errorSelectListType, href: "#list-types-table" }]
        }
      });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.errorSelectListType]);
      expect($(".govuk-error-summary__title").text()).toContain(en.errorSummaryTitle);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading, description, counter and button", () => {
      // Arrange
      const data = buildData(cy);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.heading);
      expect($("p.govuk-body").text()).toContain(cy.description);
      expect($("h2.govuk-heading-m").text()).toContain(cy.userSelections);
      expect($("button.govuk-button").text()).toContain(cy.continueButton);
    });
  });
});
