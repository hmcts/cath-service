import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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

    it("should set page title", () => {
      expect(templateContent).toContain('{% set title = "Bad request" %}');
    });

    it("should have main heading", () => {
      expect(templateContent).toContain('<h1 class="govuk-heading-l">Bad request</h1>');
    });

    it("should have description text", () => {
      expect(templateContent).toContain("The page you were trying to access has missing or invalid information.");
    });

    it("should have bullet list with guidance", () => {
      expect(templateContent).toContain('<ul class="govuk-list govuk-list--bullet">');
      expect(templateContent).toContain("check the web address is correct");
      expect(templateContent).toContain('go back to the <a href="/" class="govuk-link">start page</a> and try again');
    });

    it("should have contact us link", () => {
      expect(templateContent).toContain('<a href="/contact-us" class="govuk-link">contact us</a>');
    });

    it("should use GOV.UK Design System classes", () => {
      expect(templateContent).toContain("govuk-heading-l");
      expect(templateContent).toContain("govuk-body");
      expect(templateContent).toContain("govuk-list");
      expect(templateContent).toContain("govuk-link");
    });
  });
});
