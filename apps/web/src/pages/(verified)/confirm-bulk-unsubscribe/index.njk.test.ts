import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/confirm-bulk-unsubscribe/index.njk";

const caseSubscriptions = [{ type: "case", caseName: "Smith v Jones", caseNumber: "CASE-123", dateAdded: "2024-01-15" }];
const courtSubscriptions = [{ type: "court", courtOrTribunalName: "Central London County Court", dateAdded: "2024-02-20" }];

describe("confirm-bulk-unsubscribe template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
    env.addFilter("date", (value: string | Date) => (value ? new Date(value).toLocaleDateString("en-GB") : ""));
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      // Arrange
      const data = { ...en, caseSubscriptions, courtSubscriptions, hasCaseSubscriptions: true, hasCourtSubscriptions: true, csrfToken: "token" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(en.confirmHeading);
    });

    it("should render the case subscriptions table with case details", () => {
      // Arrange
      const data = { ...en, caseSubscriptions, courtSubscriptions: [], hasCaseSubscriptions: true, hasCourtSubscriptions: false, csrfToken: "token" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h2").text()).toContain(en.tabSubscriptionsByCase);
      expect($("th").text()).toContain(en.tableHeaderCaseName);
      expect($("th").text()).toContain(en.tableHeaderReferenceNumber);
      expect($("td").text()).toContain("Smith v Jones");
      expect($("td").text()).toContain("CASE-123");
    });

    it("should render the court subscriptions table with court details", () => {
      // Arrange
      const data = { ...en, caseSubscriptions: [], courtSubscriptions, hasCaseSubscriptions: false, hasCourtSubscriptions: true, csrfToken: "token" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("th").text()).toContain(en.tableHeaderCourtName);
      expect($("td").text()).toContain("Central London County Court");
    });

    it("should render the confirm radios and continue button", () => {
      // Arrange
      const data = { ...en, caseSubscriptions, courtSubscriptions, hasCaseSubscriptions: true, hasCourtSubscriptions: true, csrfToken: "token" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($('input[name="confirm"][value="yes"]').length).toBe(1);
      expect($('input[name="confirm"][value="no"]').length).toBe(1);
      expect($(".govuk-button").text()).toContain(en.continueButton);
    });

    it("should render the form posting to the confirm endpoint with csrf token", () => {
      // Arrange
      const data = { ...en, caseSubscriptions, courtSubscriptions, hasCaseSubscriptions: true, hasCourtSubscriptions: true, csrfToken: "csrf-abc" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($('form[action="/confirm-bulk-unsubscribe"]').attr("method")).toBe("post");
      expect($('input[name="_csrf"]').attr("value")).toBe("csrf-abc");
    });

    it("should not render an error summary when there are no errors", () => {
      // Arrange
      const data = { ...en, caseSubscriptions, courtSubscriptions, hasCaseSubscriptions: true, hasCourtSubscriptions: true, csrfToken: "token" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });
  });

  describe("error state", () => {
    it("should render the error summary when validation fails", () => {
      // Arrange
      const data = {
        ...en,
        caseSubscriptions,
        courtSubscriptions,
        hasCaseSubscriptions: true,
        hasCourtSubscriptions: true,
        csrfToken: "token",
        errors: [{ text: en.errorNoRadioMessage, href: en.errorNoRadioHref }]
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, [en.errorNoRadioMessage]);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading, tables and button", () => {
      // Arrange
      const data = { ...cy, caseSubscriptions, courtSubscriptions, hasCaseSubscriptions: true, hasCourtSubscriptions: true, csrfToken: "token" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.confirmHeading);
      expect($("h2").text()).toContain(cy.tabSubscriptionsByCase);
      expect($("th").text()).toContain(cy.tableHeaderCourtName);
      expect($(".govuk-button").text()).toContain(cy.continueButton);
    });
  });
});
