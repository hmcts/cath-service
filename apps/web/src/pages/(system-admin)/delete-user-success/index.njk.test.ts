import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/delete-user-success/index.njk";

describe("delete-user-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the confirmation panel, success message and return link", () => {
      // Arrange
      const data = { ...en, lng: "" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel--confirmation .govuk-panel__title").text()).toContain(en.panelTitle);
      expect($("p.govuk-body").first().text()).toContain(en.successMessage);
      const link = $('a[href="/find-users"]');
      expect(link).toHaveLength(1);
      expect(link.text()).toContain(en.returnLink);
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh content and preserve the language query on the return link", () => {
      // Arrange
      const data = { ...cy, lng: "cy" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel--confirmation .govuk-panel__title").text()).toContain(cy.panelTitle);
      expect($("p.govuk-body").first().text()).toContain(cy.successMessage);
      const link = $('a[href="/find-users?lng=cy"]');
      expect(link).toHaveLength(1);
      expect(link.text()).toContain(cy.returnLink);
    });
  });
});
