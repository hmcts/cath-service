import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(verified)/account-home/index.njk";

describe("account-home template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("English content", () => {
    it("should render the page heading", () => {
      // Arrange
      const data = { title: en.title, sections: en.sections };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text().trim()).toBe(en.title);
    });

    it("should render the three tiles with headings and descriptions", () => {
      // Arrange
      const data = { title: en.title, sections: en.sections };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const tileHeadings = $(".verified-tile-heading")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(tileHeadings).toEqual([en.sections.courtHearings.title, en.sections.sjpCases.title, en.sections.emailSubscriptions.title]);

      const body = $("body").text();
      expect(body).toContain(en.sections.courtHearings.description);
      expect(body).toContain(en.sections.sjpCases.description);
      expect(body).toContain(en.sections.emailSubscriptions.description);
    });

    it("should link each tile to the correct destination", () => {
      // Arrange
      const data = { title: en.title, sections: en.sections };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($('a[href="/search"]').length).toBe(1);
      expect($('a[href="/summary-of-publications?locationId=9"]').length).toBe(1);
      expect($('a[href="/subscription-management"]').length).toBe(1);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading and tile headings", () => {
      // Arrange
      const data = { title: cy.title, sections: cy.sections };

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text().trim()).toBe(cy.title);
      const tileHeadings = $(".verified-tile-heading")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(tileHeadings).toEqual([cy.sections.courtHearings.title, cy.sections.sjpCases.title, cy.sections.emailSubscriptions.title]);
    });
  });
});
