import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/pending-subscriptions/index.njk";

describe("pending-subscriptions template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the heading and a location table with a remove action", () => {
      // Arrange
      const data = {
        ...en,
        locations: [{ locationId: "42", name: "Birmingham Civil Court" }],
        confirmButton: en.confirmButton
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.heading);
      expect($("table th").eq(0).text()).toContain(en.tableHeaderLocation);
      expect($("table td").first().text()).toContain("Birmingham Civil Court");
      expect($('input[name="locationId"]').attr("value")).toBe("42");
      expect($('button[type="submit"]').text()).toContain(en.removeLink);
      expect($('a[href="/add-email-subscription"]').text()).toContain(en.addAnotherSubscription);
      assertNoErrors($);
    });

    it("should render the confirm button text passed by the controller", () => {
      // Arrange
      const data = {
        ...en,
        locations: [{ locationId: "1", name: "Court A" }],
        confirmButton: en.confirmButton
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const confirmForm = $('form input[name="action"][value="confirm"]').closest("form");
      expect(confirmForm.find("button").text()).toContain(en.confirmButton);
    });

    it("should render a case subscriptions table when case subscriptions are present", () => {
      // Arrange
      const data = {
        ...en,
        locations: [],
        pendingCaseSubscriptions: [{ caseName: "R v Smith", caseNumber: "CASE-123", searchType: "CASE_ID", searchValue: "CASE-123" }],
        confirmButton: en.confirmSubscription
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("th").text()).toContain(en.caseNameLabel);
      expect($("th").text()).toContain(en.referenceNumberLabel);
      expect($("td").text()).toContain("R v Smith");
      expect($("td").text()).toContain("CASE-123");
      expect($('input[name="action"][value="remove-case"]').attr("value")).toBe("remove-case");
      assertNoErrors($);
    });

    it("should render an error summary and add-subscriptions button when nothing is pending", () => {
      // Arrange
      const data = {
        ...en,
        locations: [],
        showBackToSearch: true,
        errors: {
          titleText: en.errorSummaryTitle,
          errorList: [{ text: en.errorAtLeastOne, href: "#" }]
        }
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.heading);
      assertErrorSummary($, [en.errorAtLeastOne]);
      const addForm = $('form[action="/add-email-subscription"]');
      expect(addForm.find("button").text()).toContain(en.addSubscriptions);
    });
  });

  describe("Welsh content", () => {
    it("should render the heading and location table in Welsh", () => {
      // Arrange
      const data = {
        ...cy,
        locale: "cy",
        locations: [{ locationId: "7", name: "Llys Sifil Caerdydd" }],
        confirmButton: cy.confirmButton
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.heading);
      expect($("table th").eq(0).text()).toContain(cy.tableHeaderLocation);
      expect($("table td").first().text()).toContain("Llys Sifil Caerdydd");
      expect($('button[type="submit"]').text()).toContain(cy.removeLink);
    });
  });
});
