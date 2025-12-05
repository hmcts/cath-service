import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { en } from "./en.js";
import { cy } from "./cy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("400 error page template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "400.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Template content", () => {
    const templatePath = path.join(__dirname, "400.njk");
    const templateContent = readFileSync(templatePath, "utf-8");

    it("should extend base template", () => {
      expect(templateContent).toContain('{% extends "layouts/base-template.njk" %}');
    });

    it("should set page title from locale", () => {
      expect(templateContent).toContain("{% set title = t.title %}");
    });

    it("should have main heading from locale", () => {
      expect(templateContent).toContain('<h1 class="govuk-heading-l">{{ t.heading }}</h1>');
    });

    it("should use locale variables for content", () => {
      expect(templateContent).toContain("{{ t.description }}");
      expect(templateContent).toContain("{{ t.youCan }}");
      expect(templateContent).toContain("{{ t.checkAddress }}");
      expect(templateContent).toContain("{{ t.contactLink }}");
    });

    it("should have bullet list structure", () => {
      expect(templateContent).toContain('<ul class="govuk-list govuk-list--bullet">');
    });

    it("should have contact us link", () => {
      expect(templateContent).toContain('<a href="/contact-us" class="govuk-link">');
    });

    it("should use GOV.UK Design System classes", () => {
      expect(templateContent).toContain("govuk-heading-l");
      expect(templateContent).toContain("govuk-body");
      expect(templateContent).toContain("govuk-list");
      expect(templateContent).toContain("govuk-link");
    });
  });

  describe("English translations", () => {
    it("should have all required English text", () => {
      expect(en.error400.title).toBe("Bad request");
      expect(en.error400.heading).toBe("Bad request");
      expect(en.error400.description).toContain("missing or invalid information");
      expect(en.error400.checkAddress).toContain("check the web address");
      expect(en.error400.contactLink).toBe("contact us");
    });
  });

  describe("Welsh translations", () => {
    it("should have all required Welsh text", () => {
      expect(cy.error400.title).toBe("Cais gwael");
      expect(cy.error400.heading).toBe("Cais gwael");
      expect(cy.error400.description).toContain("gwybodaeth");
      expect(cy.error400.contactLink).toBe("cysylltwch â ni");
    });
  });
});
