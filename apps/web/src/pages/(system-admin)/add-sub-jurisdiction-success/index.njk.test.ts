import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/add-sub-jurisdiction-success/index.njk";

describe("add-sub-jurisdiction-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([
      path.join(__dirname, "../../"), // pages directory
      path.join(__dirname, "../../../../../../libs/web-core/src/views") // layouts
    ]);
  });

  describe("English content", () => {
    it("should render the success panel with the banner title", () => {
      // Arrange
      const data = { ...en, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const panel = $(".govuk-panel");
      expect(panel).toHaveLength(1);
      expect($(".govuk-panel__title").text().trim()).toBe(en.successBannerTitle);
    });

    it("should render the next steps heading", () => {
      // Arrange
      const data = { ...en, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h2.govuk-heading-m").text().trim()).toBe(en.nextStepsTitle);
    });

    it("should render the three navigation links without a language query", () => {
      // Arrange
      const data = { ...en, locale: "en" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const links = $(".govuk-list a");
      expect(links).toHaveLength(3);

      const addAnother = $('a[href="/add-sub-jurisdiction"]');
      expect(addAnother).toHaveLength(1);
      expect(addAnother.text().trim()).toBe(en.addAnotherText);

      const addJurisdiction = $('a[href="/add-jurisdiction"]');
      expect(addJurisdiction).toHaveLength(1);
      expect(addJurisdiction.text().trim()).toBe(en.addJurisdictionText);

      const backToUpload = $('a[href="/reference-data-upload"]');
      expect(backToUpload).toHaveLength(1);
      expect(backToUpload.text().trim()).toBe(en.backToUploadText);
    });
  });

  describe("Welsh content", () => {
    it("should render the Welsh success panel and heading", () => {
      // Arrange
      const data = { ...cy, locale: "cy" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text().trim()).toBe(cy.successBannerTitle);
      expect($("h2.govuk-heading-m").text().trim()).toBe(cy.nextStepsTitle);
    });

    it("should append the lng=cy query parameter to all navigation links", () => {
      // Arrange
      const data = { ...cy, locale: "cy" };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const addAnother = $('a[href="/add-sub-jurisdiction?lng=cy"]');
      expect(addAnother).toHaveLength(1);
      expect(addAnother.text().trim()).toBe(cy.addAnotherText);

      const addJurisdiction = $('a[href="/add-jurisdiction?lng=cy"]');
      expect(addJurisdiction).toHaveLength(1);
      expect(addJurisdiction.text().trim()).toBe(cy.addJurisdictionText);

      const backToUpload = $('a[href="/reference-data-upload?lng=cy"]');
      expect(backToUpload).toHaveLength(1);
      expect(backToUpload.text().trim()).toBe(cy.backToUploadText);
    });
  });
});
