import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/list-search-config/index.njk";

const buildData = (lang: typeof en | typeof cy) => ({
  pageTitle: lang.pageTitle,
  heading: lang.heading,
  body: lang.body,
  caseNumberFieldLabel: lang.caseNumberFieldLabel,
  caseNameFieldLabel: lang.caseNameFieldLabel,
  saveButton: lang.saveButton,
  errorSummaryTitle: lang.errorSummaryTitle,
  data: {
    caseNumberFieldName: "",
    caseNameFieldName: ""
  },
  listTypeId: 5
});

describe("list-search-config template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // apps/web/src/pages/
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts and components
    ]);
  });

  describe("English content", () => {
    it("should render the page heading and body", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text().trim()).toBe(en.heading);
      expect($("p.govuk-body").text().trim()).toBe(en.body);
    });

    it("should render both field inputs with their labels inside a post form", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("form").attr("method")).toBe("post");
      expect($("#caseNumberFieldName")).toHaveLength(1);
      expect($("#caseNumberFieldName").attr("name")).toBe("caseNumberFieldName");
      expect($('label[for="caseNumberFieldName"]').text().trim()).toBe(en.caseNumberFieldLabel);
      expect($("#caseNameFieldName")).toHaveLength(1);
      expect($("#caseNameFieldName").attr("name")).toBe("caseNameFieldName");
      expect($('label[for="caseNameFieldName"]').text().trim()).toBe(en.caseNameFieldLabel);
      expect($("button[type='submit']").text().trim()).toBe(en.saveButton);
    });

    it("should render existing field values", () => {
      // Arrange
      const data = {
        ...buildData(en),
        data: {
          caseNumberFieldName: "caseRef",
          caseNameFieldName: "caseName"
        }
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("#caseNumberFieldName").attr("value")).toBe("caseRef");
      expect($("#caseNameFieldName").attr("value")).toBe("caseName");
    });

    it("should not render an error summary when there are no errors", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });

    it("should render an error summary and field errors when validation fails", () => {
      // Arrange
      const data = {
        ...buildData(en),
        errors: [
          { text: en.errorCaseNumberInvalid, href: "#case-number-field-name" },
          { text: en.errorCaseNameInvalid, href: "#case-name-field-name" }
        ],
        fieldErrors: {
          caseNumberFieldName: { text: en.errorCaseNumberInvalid },
          caseNameFieldName: { text: en.errorCaseNameInvalid }
        }
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.errorCaseNumberInvalid, en.errorCaseNameInvalid]);
      expect($("#caseNumberFieldName-error").text()).toContain(en.errorCaseNumberInvalid);
      expect($("#caseNameFieldName-error").text()).toContain(en.errorCaseNameInvalid);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh heading, labels and button", () => {
      // Arrange
      const data = buildData(cy);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text().trim()).toBe(cy.heading);
      expect($("p.govuk-body").text().trim()).toBe(cy.body);
      expect($('label[for="caseNumberFieldName"]').text().trim()).toBe(cy.caseNumberFieldLabel);
      expect($('label[for="caseNameFieldName"]').text().trim()).toBe(cy.caseNameFieldLabel);
      expect($("button[type='submit']").text().trim()).toBe(cy.saveButton);
    });

    it("should render the Welsh error summary when validation fails", () => {
      // Arrange
      const data = {
        ...buildData(cy),
        errors: [{ text: cy.errorCaseNumberInvalid, href: "#case-number-field-name" }],
        fieldErrors: {
          caseNumberFieldName: { text: cy.errorCaseNumberInvalid }
        }
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [cy.errorCaseNumberInvalid]);
    });
  });
});
