import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("index.njk error template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Template content", () => {
    const templatePath = path.join(__dirname, "index.njk");
    const templateContent = readFileSync(templatePath, "utf-8");

    it("should extend base template", () => {
      expect(templateContent).toContain('{% extends "layouts/base-template.njk" %}');
    });

    it("should use page_content block", () => {
      expect(templateContent).toContain("{% block page_content %}");
      expect(templateContent).toContain("{% endblock %}");
    });

    it("should have grid row structure", () => {
      expect(templateContent).toContain('<div class="govuk-grid-row">');
    });

    it("should have two-thirds column layout", () => {
      expect(templateContent).toContain('<div class="govuk-grid-column-two-thirds">');
    });

    it("should display errorTitle variable", () => {
      expect(templateContent).toContain("{{ errorTitle }}");
    });

    it("should display errorMessage variable", () => {
      expect(templateContent).toContain("{{ errorMessage }}");
    });

    it("should have large heading with errorTitle", () => {
      expect(templateContent).toContain('<h1 class="govuk-heading-l">{{ errorTitle }}</h1>');
    });

    it("should have body paragraph with errorMessage", () => {
      expect(templateContent).toContain('<p class="govuk-body">{{ errorMessage }}</p>');
    });

    it("should use GOV.UK Design System classes", () => {
      expect(templateContent).toContain("govuk-heading-l");
      expect(templateContent).toContain("govuk-body");
      expect(templateContent).toContain("govuk-grid-row");
      expect(templateContent).toContain("govuk-grid-column-two-thirds");
    });
  });
});
