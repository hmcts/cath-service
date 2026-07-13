import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/subscription-configure-list/index.njk";

const LIST_TYPE_GROUPS = [
  {
    letter: "A",
    items: [
      { listTypeId: 101, name: "Adoption Daily Cause List", checked: false },
      { listTypeId: 102, name: "Administrative Court Daily Cause List", checked: true }
    ]
  },
  {
    letter: "C",
    items: [{ listTypeId: 201, name: "Civil Daily Cause List", checked: false }]
  }
];

describe("subscription-configure-list template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading and description", () => {
      // Arrange
      const data = { ...en, listTypeGroups: LIST_TYPE_GROUPS };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-l").text().trim()).toBe(en.heading);
      expect($("p.govuk-body").first().text().trim()).toBe(en.description);
    });

    it("should render a back link to subscription management", () => {
      // Arrange
      const data = { ...en, listTypeGroups: LIST_TYPE_GROUPS };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const backLink = $('a.govuk-back-link[href="/subscription-management"]');
      expect(backLink).toHaveLength(1);
      expect(backLink.text().trim()).toBe(en.back);
    });

    it("should render a checkbox for each list type within a post form", () => {
      // Arrange
      const data = { ...en, listTypeGroups: LIST_TYPE_GROUPS };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("form").attr("method")).toBe("post");
      const checkboxes = $("input[type='checkbox'][name='selectedListTypes']");
      expect(checkboxes).toHaveLength(3);
      const values = checkboxes.map((_, el) => $(el).attr("value")).get();
      expect(values).toEqual(["101", "102", "201"]);
    });

    it("should mark the subscribed list type as checked", () => {
      // Arrange
      const data = { ...en, listTypeGroups: LIST_TYPE_GROUPS };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("#listType_102").is(":checked")).toBe(true);
      expect($("#listType_101").is(":checked")).toBe(false);
      expect($("#listType_201").is(":checked")).toBe(false);
    });

    it("should render the grouping letter as a row header", () => {
      // Arrange
      const data = { ...en, listTypeGroups: LIST_TYPE_GROUPS };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const headers = $("th.govuk-table__header")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headers).toContain("A");
      expect(headers).toContain("C");
    });

    it("should render the list type names and continue button", () => {
      // Arrange
      const data = { ...en, listTypeGroups: LIST_TYPE_GROUPS };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const cellText = $("td.govuk-table__cell")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(cellText).toContain("Adoption Daily Cause List");
      expect(cellText).toContain("Civil Daily Cause List");
      expect($("button.govuk-button").text().trim()).toBe(en.continueButton);
    });

    it("should render the no list types message when there are no groups", () => {
      // Arrange
      const data = { ...en, listTypeGroups: [] };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("form")).toHaveLength(0);
      const bodyText = $("p.govuk-body")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(bodyText).toContain(en.noListTypes);
    });

    it("should not render an error summary when there are no errors", () => {
      // Arrange
      const data = { ...en, listTypeGroups: LIST_TYPE_GROUPS };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });

    it("should render an error summary when no list type is selected", () => {
      // Arrange
      const data = {
        ...en,
        listTypeGroups: LIST_TYPE_GROUPS,
        errors: {
          titleText: en.errorSummaryTitle,
          errorList: [{ text: en.errorSelectListType, href: "#list-types-table" }]
        }
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.errorSelectListType]);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading, description and controls", () => {
      // Arrange
      const data = { ...cy, listTypeGroups: LIST_TYPE_GROUPS };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1.govuk-heading-l").text().trim()).toBe(cy.heading);
      expect($("p.govuk-body").first().text().trim()).toBe(cy.description);
      expect($("button.govuk-button").text().trim()).toBe(cy.continueButton);
      expect($('a.govuk-back-link[href="/subscription-management"]').text().trim()).toBe(cy.back);
    });

    it("should render the Welsh error summary", () => {
      // Arrange
      const data = {
        ...cy,
        listTypeGroups: LIST_TYPE_GROUPS,
        errors: {
          titleText: cy.errorSummaryTitle,
          errorList: [{ text: cy.errorSelectListType, href: "#list-types-table" }]
        }
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [cy.errorSelectListType]);
    });
  });
});
