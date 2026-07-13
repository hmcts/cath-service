import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/add-region-success/index.njk";

describe("add-region-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the success panel and next-step links", () => {
      // Arrange
      const data = { ...en, regionSuccess: { name: "London" }, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text()).toContain(en.successBannerTitle);
      expect($("h2").text()).toContain(en.nextStepsTitle);
      expect($('a[href="/add-region"]').text()).toContain(en.addAnotherText);
      expect($('a[href="/add-jurisdiction"]').text()).toContain(en.addJurisdictionText);
      expect($('a[href="/reference-data-upload"]').text()).toContain(en.backToUploadText);
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh text and append the language query to links", () => {
      // Arrange
      const data = { ...cy, regionSuccess: { name: "Llundain" }, locale: "cy" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text()).toContain(cy.successBannerTitle);
      expect($("h2").text()).toContain(cy.nextStepsTitle);
      expect($('a[href="/add-region?lng=cy"]').text()).toContain(cy.addAnotherText);
      expect($('a[href="/add-jurisdiction?lng=cy"]').text()).toContain(cy.addJurisdictionText);
      expect($('a[href="/reference-data-upload?lng=cy"]').text()).toContain(cy.backToUploadText);
    });
  });
});
