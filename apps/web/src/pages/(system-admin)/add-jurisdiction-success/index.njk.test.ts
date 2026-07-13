import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/add-jurisdiction-success/index.njk";

describe("add-jurisdiction-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the success panel title", () => {
      // Arrange
      const data = { ...en, jurisdictionSuccess: { name: "Civil" }, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text()).toContain(en.successBannerTitle);
    });

    it("should render the next steps heading", () => {
      // Arrange
      const data = { ...en, jurisdictionSuccess: { name: "Civil" }, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h2").text()).toContain(en.nextStepsTitle);
    });

    it("should render the next steps links with English hrefs", () => {
      // Arrange
      const data = { ...en, jurisdictionSuccess: { name: "Civil" }, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($('a[href="/add-jurisdiction"]').text()).toBe(en.addAnotherText);
      expect($('a[href="/add-sub-jurisdiction"]').text()).toBe(en.addSubJurisdictionText);
      expect($('a[href="/add-region"]').text()).toBe(en.addRegionText);
      expect($('a[href="/reference-data-upload"]').text()).toBe(en.backToUploadText);
    });

    it("should render without an error summary", () => {
      // Arrange
      const data = { ...en, jurisdictionSuccess: { name: "Civil" }, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertNoErrors($);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh panel title and links with lng=cy hrefs", () => {
      // Arrange
      const data = { ...cy, jurisdictionSuccess: { name: "Sifil" }, locale: "cy" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text()).toContain(cy.successBannerTitle);
      expect($("h2").text()).toContain(cy.nextStepsTitle);
      expect($('a[href="/add-jurisdiction?lng=cy"]').text()).toBe(cy.addAnotherText);
      expect($('a[href="/reference-data-upload?lng=cy"]').text()).toBe(cy.backToUploadText);
    });
  });
});
