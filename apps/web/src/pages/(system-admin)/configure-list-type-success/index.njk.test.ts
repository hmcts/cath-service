import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import * as cy from "./cy.js";
import * as en from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/configure-list-type-success/index.njk";

describe("configure-list-type-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the success panel and return link", () => {
      // Arrange
      const data = { t: en };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text()).toContain(en.configureListType.success.title);
      expect($(".govuk-panel__body").text()).toContain(en.configureListType.success.banner);
      expect($("h2").text()).toContain(en.configureListType.success.description);
      expect($('a[href="/system-admin-dashboard"]').text()).toContain(en.configureListType.success.returnLink);
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh success panel and return link", () => {
      // Arrange
      const data = { t: cy };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text()).toContain(cy.configureListType.success.title);
      expect($(".govuk-panel__body").text()).toContain(cy.configureListType.success.banner);
      expect($("h2").text()).toContain(cy.configureListType.success.description);
      expect($('a[href="/system-admin-dashboard"]').text()).toContain(cy.configureListType.success.returnLink);
    });
  });
});
