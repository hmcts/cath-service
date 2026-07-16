import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestEnvironment, render } from "@hmcts/test-support";
import { accessibilityStatementCy as cy, accessibilityStatementEn as en } from "@hmcts/web-core";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "(core)/accessibility-statement/index.njk";

describe("accessibility-statement template", () => {
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

  describe("Template rendering", () => {
    it("should render the English heading and section headings", () => {
      const data = { ...en, en, cy, locale: "en" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.title);
      const headingText = $("h2, h3, h4")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headingText).toContain(en.sections.howAccessible.heading);
      expect(headingText).toContain(en.sections.feedback.heading);
      expect(headingText).toContain(en.sections.compliance.heading);
    });

    it("should render the accessibility feature bullet list in English", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      const bulletText = $("ul.govuk-list--bullet li")
        .map((_, el) => $(el).text().trim())
        .get();
      for (const feature of en.sections.intro.features) {
        expect(bulletText).toContain(feature);
      }
    });

    it("should render the English intro, feedback and compliance content", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      const bodyText = $("body").text();
      expect(bodyText).toContain(en.sections.intro.content);
      expect(bodyText).toContain(en.sections.intro.commitment);
      expect(bodyText).toContain(en.sections.feedback.textRelay);
      expect(bodyText).toContain(en.sections.feedback.audioLoops);
      expect(bodyText).toContain(en.sections.compliance.content);

      const subHeadingText = $("h4")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(subHeadingText).toContain(en.sections.feedback.contact.name);
      expect(bodyText).toContain(en.sections.feedback.contact.phone);
      expect(bodyText).toContain(en.sections.feedback.contact.email);
    });

    it("should render external links with their hrefs", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($(`a[href="${en.sections.intro.abilityNetUrl}"]`).text()).toContain(en.sections.intro.abilityNetLink);
      expect($(`a[href="${en.sections.enforcement.eassUrl}"]`).text()).toContain(en.sections.enforcement.eassLinkText);
      expect($(`a[href="${en.sections.compliance.wcagUrl}"]`).text()).toContain(en.sections.compliance.wcagLinkText);
    });

    it("should render the back to top link", () => {
      const data = { ...en };

      const { $ } = render(env, TEMPLATE, data);

      expect($("p.back-to-top-link a").text()).toContain(en.backToTop);
    });

    it("should render Welsh heading and content", () => {
      const data = { ...cy, en, cy, locale: "cy" };

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.title);
      expect($("p.back-to-top-link a").text()).toContain(cy.backToTop);
      const bulletText = $("ul.govuk-list--bullet li")
        .map((_, el) => $(el).text().trim())
        .get();
      for (const feature of cy.sections.intro.features) {
        expect(bulletText).toContain(feature);
      }
    });

    it("should render the Welsh intro, feedback and compliance content", () => {
      const data = { ...cy };

      const { $ } = render(env, TEMPLATE, data);

      const bodyText = $("body").text();
      expect(bodyText).toContain(cy.sections.intro.content);
      expect(bodyText).toContain(cy.sections.intro.commitment);
      expect(bodyText).toContain(cy.sections.feedback.textRelay);
      expect(bodyText).toContain(cy.sections.feedback.audioLoops);
      expect(bodyText).toContain(cy.sections.compliance.content);

      const headingText = $("h3, h4")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(headingText).toContain(cy.sections.compliance.heading);
      expect(headingText).toContain(cy.sections.feedback.contact.name);
      expect(bodyText).toContain(cy.sections.feedback.contact.phone);
      expect(bodyText).toContain(cy.sections.feedback.contact.email);
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have same section keys in English and Welsh", () => {
      expect(Object.keys(en.sections).sort()).toEqual(Object.keys(cy.sections).sort());
    });

    it("should have same number of accessibility features", () => {
      expect(en.sections.intro.features).toHaveLength(cy.sections.intro.features.length);
    });
  });
});
