import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(system-admin)/location-metadata-success/index.njk";

describe("location-metadata-success template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the success panel with the created page title", () => {
      // Arrange
      const data = {
        ...en,
        pageTitle: en.pageTitleCreated
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const panel = $(".govuk-panel");
      expect(panel).toHaveLength(1);
      expect($(".govuk-panel__title").text().trim()).toBe(en.pageTitleCreated);
    });

    it("should render the next steps heading and search link without a language query", () => {
      // Arrange
      const data = {
        ...en,
        pageTitle: en.pageTitleUpdated
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("p.govuk-body.govuk-\\!-font-weight-bold").text().trim()).toBe(en.nextStepsTitle);

      const searchLink = $('a[href="/location-metadata-search"]');
      expect(searchLink).toHaveLength(1);
      expect(searchLink.text().trim()).toBe(en.searchLocationMetadataLink);
    });

    it("should render the deleted page title in the panel", () => {
      // Arrange
      const data = {
        ...en,
        pageTitle: en.pageTitleDeleted
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text().trim()).toBe(en.pageTitleDeleted);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh panel title, heading and a Welsh search link", () => {
      // Arrange
      const data = {
        ...cy,
        pageTitle: cy.pageTitleCreated,
        lng: "cy"
      };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($(".govuk-panel__title").text().trim()).toBe(cy.pageTitleCreated);
      expect($("p.govuk-body.govuk-\\!-font-weight-bold").text().trim()).toBe(cy.nextStepsTitle);

      const searchLink = $('a[href="/location-metadata-search?lng=cy"]');
      expect(searchLink).toHaveLength(1);
      expect(searchLink.text().trim()).toBe(cy.searchLocationMetadataLink);
    });
  });
});
