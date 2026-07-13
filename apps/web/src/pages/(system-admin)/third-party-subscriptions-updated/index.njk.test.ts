import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/third-party-subscriptions-updated/index.njk";

describe("third-party-subscriptions-updated template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the panel title and success message", () => {
      // Arrange
      const data = { ...en, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text()).toContain(en.pageTitle);
      expect($(".govuk-panel__body").text()).toContain(en.successMessage);
    });

    it("should render the further info text and manage users link", () => {
      // Arrange
      const data = { ...en, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("p.govuk-body").text()).toContain(en.furtherInfoText);
      const link = $('a[href="/manage-third-party-users"]');
      expect(link).toHaveLength(1);
      expect(link.text()).toContain(en.manageThirdPartyUsersLink);
    });

    it("should not render an error summary", () => {
      // Arrange
      const data = { ...en, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh panel title and success message", () => {
      // Arrange
      const data = { ...cy, locale: "cy" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text()).toContain(cy.pageTitle);
      expect($(".govuk-panel__body").text()).toContain(cy.successMessage);
    });

    it("should append the Welsh language query to the manage users link", () => {
      // Arrange
      const data = { ...cy, locale: "cy" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const link = $('a[href="/manage-third-party-users?lng=cy"]');
      expect(link).toHaveLength(1);
      expect(link.text()).toContain(cy.manageThirdPartyUsersLink);
    });
  });
});
