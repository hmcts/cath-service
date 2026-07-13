import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/subscription-confirmed/index.njk";

describe("subscription-confirmed template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the confirmation panel title for a single subscription", () => {
      // Arrange
      const data = { ...en, locations: ["Location 456"], isPlural: false, panelTitle: en.panelTitle };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text()).toContain(en.panelTitle);
    });

    it("should render the plural panel title for multiple subscriptions", () => {
      // Arrange
      const data = {
        ...en,
        locations: ["Location 456", "Location 789"],
        isPlural: true,
        panelTitle: en.panelTitlePlural
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text()).toContain(en.panelTitlePlural);
    });

    it("should render the continue text and account link", () => {
      // Arrange
      const data = { ...en, locations: ["Location 456"], isPlural: false, panelTitle: en.panelTitle };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("body").text()).toContain(en.continueText);
      expect($('a[href="/account-home"]').text()).toBe(en.yourAccountLink);
    });

    it("should render the four next-step links with correct hrefs", () => {
      // Arrange
      const data = { ...en, locations: ["Location 456"], isPlural: false, panelTitle: en.panelTitle };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($('a[href="/add-email-subscription"]').text()).toBe(en.addNewSubscriptionLink);
      expect($('a[href="/subscription-management"]').text()).toBe(en.manageSubscriptionsLink);
      expect($('a[href="/search"]').text()).toBe(en.findCourtLink);
      expect($('a[href="/subscription-configure-list"]').text()).toBe(en.selectListTypeLink);
    });

    it("should render without an error summary", () => {
      // Arrange
      const data = { ...en, locations: ["Location 456"], isPlural: false, panelTitle: en.panelTitle };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh panel title and next-step links", () => {
      // Arrange
      const data = {
        ...cy,
        locations: ["Lleoliad 456", "Lleoliad 789"],
        isPlural: true,
        panelTitle: cy.panelTitlePlural
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text()).toContain(cy.panelTitlePlural);
      expect($('a[href="/account-home"]').text()).toBe(cy.yourAccountLink);
      expect($('a[href="/add-email-subscription"]').text()).toBe(cy.addNewSubscriptionLink);
      expect($('a[href="/subscription-configure-list"]').text()).toBe(cy.selectListTypeLink);
    });
  });
});
