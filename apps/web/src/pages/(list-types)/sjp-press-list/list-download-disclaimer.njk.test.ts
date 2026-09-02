import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sjpPressListCy as cy, sjpPressListEn as en } from "@hmcts/sjp-press-list";
import { createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "list-download-disclaimer.njk";
const ARTEFACT_ID = "12345678-1234-1234-1234-123456789abc";

function renderDisclaimer(overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  return render(env, TEMPLATE, {
    en,
    cy,
    t: locale.disclaimer,
    artefactId: ARTEFACT_ID,
    errors: null,
    ...overrides
  });
}

let env: nunjucks.Environment;

beforeEach(() => {
  const webCoreViews = path.resolve(__dirname, "../../../../../../libs/web-core/src/views");
  env = createTestEnvironment([__dirname, webCoreViews]);
});

describe("list-download-disclaimer template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      expect(existsSync(path.join(__dirname, TEMPLATE))).toBe(true);
    });
  });

  describe("Locale consistency", () => {
    it("should have the same disclaimer keys in English and Welsh", () => {
      expect(Object.keys(en.disclaimer).sort()).toEqual(Object.keys(cy.disclaimer).sort());
    });
  });

  describe("Page content", () => {
    it("should render the page title as the heading", () => {
      const { $ } = renderDisclaimer();

      expect($("h1.govuk-heading-l").text()).toContain(en.disclaimer.pageTitle);
    });

    it("should render the disclaimer and responsibility paragraphs", () => {
      const { $ } = renderDisclaimer();

      const bodyText = $("p.govuk-body").text();
      expect(bodyText).toContain(en.disclaimer.disclaimerText);
      expect(bodyText).toContain(en.disclaimer.responsibility);
    });

    it("should render the continue button", () => {
      const { $ } = renderDisclaimer();

      const button = $("button.govuk-button").filter((_, el) => $(el).text().trim() === en.disclaimer.continueButton);
      expect(button).toHaveLength(1);
    });
  });

  describe("Form", () => {
    it("should post to the same page", () => {
      const { $ } = renderDisclaimer();

      const form = $("form");
      expect(form.attr("method")).toBe("post");
      expect(form.attr("novalidate")).toBeDefined();
    });

    it("should carry the artefactId in a hidden input", () => {
      const { $ } = renderDisclaimer();

      const input = $('input[name="artefactId"]');
      expect(input.attr("type")).toBe("hidden");
      expect(input.attr("value")).toBe(ARTEFACT_ID);
    });

    it("should render the agreement checkbox with its label", () => {
      const { $ } = renderDisclaimer();

      const checkbox = $('input[name="agreed"]');
      expect(checkbox).toHaveLength(1);
      expect(checkbox.attr("value")).toBe("yes");
      expect($(`label[for="${checkbox.attr("id")}"]`).text()).toContain(en.disclaimer.checkboxLabel);
    });
  });

  describe("Error handling", () => {
    it("should render the error summary when errors exist", () => {
      const { $ } = renderDisclaimer({
        errors: [{ text: en.disclaimer.errorCheckbox, href: "#agreed" }]
      });

      const summary = $(".govuk-error-summary");
      expect(summary).toHaveLength(1);
      expect(summary.text()).toContain(en.disclaimer.errorTitle);
      expect(summary.text()).toContain(en.disclaimer.errorCheckbox);
    });

    it("should render an inline checkbox error message when errors exist", () => {
      const { $ } = renderDisclaimer({
        errors: [{ text: en.disclaimer.errorCheckbox, href: "#agreed" }]
      });

      expect($(".govuk-error-message").text()).toContain(en.disclaimer.errorCheckbox);
    });

    it("should not render any error messaging when there are no errors", () => {
      const { $ } = renderDisclaimer();

      expect($(".govuk-error-summary")).toHaveLength(0);
      expect($(".govuk-error-message")).toHaveLength(0);
    });
  });

  describe("Welsh rendering", () => {
    it("should render the Welsh heading, paragraphs and button", () => {
      const { $ } = renderDisclaimer({}, cy);

      expect($("h1.govuk-heading-l").text()).toContain(cy.disclaimer.pageTitle);
      const bodyText = $("p.govuk-body").text();
      expect(bodyText).toContain(cy.disclaimer.disclaimerText);
      expect(bodyText).toContain(cy.disclaimer.responsibility);
      const button = $("button.govuk-button").filter((_, el) => $(el).text().trim() === cy.disclaimer.continueButton);
      expect(button).toHaveLength(1);
    });

    it("should render the Welsh error summary when errors exist", () => {
      const { $ } = renderDisclaimer({ errors: [{ text: cy.disclaimer.errorCheckbox, href: "#agreed" }] }, cy);

      const summary = $(".govuk-error-summary");
      expect(summary).toHaveLength(1);
      expect(summary.text()).toContain(cy.disclaimer.errorTitle);
      expect(summary.text()).toContain(cy.disclaimer.errorCheckbox);
    });
  });
});
