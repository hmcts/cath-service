import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(public)/summary-of-publications/index.njk";

const buildData = (t: typeof en, overrides: Record<string, unknown> = {}) => ({
  en,
  cy,
  title: `${t.titlePrefix} Oxford Combined Court Centre${t.titleSuffix}`,
  noPublicationsMessage: t.noPublicationsMessage,
  selectListMessage: t.selectListMessage,
  publications: [],
  cautionMessage: undefined,
  noListMessage: undefined,
  factLinkText: t.factLinkText,
  factLinkUrl: t.factLinkUrl,
  factAdditionalText: t.factAdditionalText,
  ...overrides
});

describe("summary-of-publications template", () => {
  let env: nunjucks.Environment;

  beforeEach(() => {
    env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
  });

  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("English locale", () => {
    it("should have title prefix", () => {
      expect(en.titlePrefix).toBe("What do you want to view from");
    });

    it("should have title suffix", () => {
      expect(en.titleSuffix).toBe("?");
    });

    it("should have no publications message", () => {
      expect(en.noPublicationsMessage).toBe("Sorry, no lists found for this court");
    });

    it("should have English language label", () => {
      expect(en.languageEnglish).toBe("English (Saesneg)");
    });

    it("should have Welsh language label", () => {
      expect(en.languageWelsh).toBe("Welsh (Cymraeg)");
    });
  });

  describe("Welsh locale", () => {
    it("should have title prefix", () => {
      expect(cy.titlePrefix).toBe("Beth ydych chi eisiau edrych arno gan");
    });

    it("should have title suffix", () => {
      expect(cy.titleSuffix).toBe("?");
    });

    it("should have no publications message", () => {
      expect(cy.noPublicationsMessage).toBe("Mae'n ddrwg gennym, nid ydym wedi dod o hyd i unrhyw restrau i'r llys hwn");
    });

    it("should have English language label", () => {
      expect(cy.languageEnglish).toBe("Saesneg (English)");
    });

    it("should have Welsh language label", () => {
      expect(cy.languageWelsh).toBe("Cymraeg (Welsh)");
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = ["titlePrefix", "titleSuffix", "noPublicationsMessage", "languageEnglish", "languageWelsh"];

      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });

  describe("English rendering", () => {
    it("should render the page title as the heading", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(`${en.titlePrefix} Oxford Combined Court Centre${en.titleSuffix}`);
    });

    it("should render the fact link with url and additional text", () => {
      // Arrange
      const data = buildData(en);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      const link = $(`a[href="${en.factLinkUrl}"]`);
      expect(link.text().trim()).toBe(en.factLinkText);
      expect($("body").text()).toContain(en.factAdditionalText);
    });

    it("should render the no publications message when there are no publications", () => {
      // Arrange
      const data = buildData(en, { publications: [] });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("body").text()).toContain(en.noPublicationsMessage);
      assertNoErrors($);
    });

    it("should not show the no publications message when a noListMessage is present", () => {
      // Arrange
      const data = buildData(en, { noListMessage: "<p>Custom no list message</p>" });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("body").text()).toContain("Custom no list message");
      expect($("body").text()).not.toContain(en.noPublicationsMessage);
    });

    it("should render the caution message when present", () => {
      // Arrange
      const data = buildData(en, { cautionMessage: "<strong>Caution notice</strong>" });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("body").text()).toContain("Caution notice");
    });

    it("should render the select list message and publication links when publications exist", () => {
      // Arrange
      const publications = [
        {
          id: "flat-file-artefact",
          displayName: "SJP Public List 12 July 2026",
          languageLabel: en.languageEnglish,
          isFlatFile: true,
          locationId: "5",
          urlPath: null
        },
        {
          id: "url-artefact",
          displayName: "Civil Daily Cause List 12 July 2026",
          languageLabel: en.languageEnglish,
          isFlatFile: false,
          locationId: "5",
          urlPath: "civil-daily-cause-list"
        },
        {
          id: "fallback-artefact",
          displayName: "Fallback Publication 12 July 2026",
          languageLabel: en.languageWelsh,
          isFlatFile: false,
          locationId: "5",
          urlPath: null
        }
      ];
      const data = buildData(en, { publications });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("body").text()).toContain(en.selectListMessage);
      expect($('a[href="/hearing-lists/5/flat-file-artefact"]')).toHaveLength(1);
      expect($('a[href="/civil-daily-cause-list?artefactId=url-artefact"]')).toHaveLength(1);
      expect($('a[href="/publication/fallback-artefact"]')).toHaveLength(1);
      expect($("ul.govuk-list li")).toHaveLength(3);
      expect($("body").text()).not.toContain(en.noPublicationsMessage);
    });

    it("should render an error summary when an error is present", () => {
      // Arrange
      const data = buildData(en, { error: "Something went wrong" });

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      assertErrorSummary($, ["Something went wrong"]);
    });
  });

  describe("Welsh rendering", () => {
    it("should render Welsh content", () => {
      // Arrange
      const data = buildData(cy);

      // Act
      const { $ } = render(env, TEMPLATE, data);

      // Assert
      expect($("h1").text()).toContain(cy.titlePrefix);
      expect($(`a[href="${cy.factLinkUrl}"]`).text().trim()).toBe(cy.factLinkText);
      expect($("body").text()).toContain(cy.noPublicationsMessage);
    });
  });
});
