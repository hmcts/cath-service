import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sjpPublicListCy as cy, sjpPublicListEn as en } from "@hmcts/sjp-public-list";
import { assertErrorSummary, assertNoErrors, createTestEnvironment, render } from "@hmcts/test-support";
import type nunjucks from "nunjucks";
import { beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = "list-download-disclaimer.njk";
const ARTEFACT_ID = "12345678-1234-1234-1234-123456789abc";

function renderDisclaimer(overrides: Record<string, unknown> = {}, locale: typeof en | typeof cy = en) {
  const t = locale === cy ? cy.disclaimer : en.disclaimer;
  return render(env, TEMPLATE, { en, cy, t, artefactId: ARTEFACT_ID, locale: locale === cy ? "cy" : "en", errors: null, ...overrides });
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

      expect($("h1.govuk-heading-l").text().trim()).toBe(en.disclaimer.pageTitle);
    });

    it("should render the disclaimer and responsibility text", () => {
      const { $ } = renderDisclaimer();

      const bodyText = $("p.govuk-body")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(bodyText).toContain(en.disclaimer.disclaimerText);
      expect(bodyText).toContain(en.disclaimer.responsibility);
    });

    it("should render the agreement checkbox with its label", () => {
      const { $ } = renderDisclaimer();

      const checkbox = $("input[name='agreed']");
      expect(checkbox).toHaveLength(1);
      expect(checkbox.attr("value")).toBe("yes");
      expect($(".govuk-checkboxes__label").text().trim()).toBe(en.disclaimer.checkboxLabel);
    });

    it("should render the continue button", () => {
      const { $ } = renderDisclaimer();

      expect($("button.govuk-button").text().trim()).toBe(en.disclaimer.continueButton);
    });

    it("should post the form with the artefactId in a hidden field", () => {
      const { $ } = renderDisclaimer();

      const form = $("form");
      expect(form.attr("method")).toBe("post");
      const hidden = $("input[name='artefactId']");
      expect(hidden.attr("type")).toBe("hidden");
      expect(hidden.attr("value")).toBe(ARTEFACT_ID);
    });
  });

  describe("Error handling", () => {
    it("should not render an error summary when there are no errors", () => {
      const { $ } = renderDisclaimer();

      assertNoErrors($);
      expect($(".govuk-error-message")).toHaveLength(0);
    });

    it("should render the error summary and inline checkbox error when errors are present", () => {
      const { $ } = renderDisclaimer({ errors: [{ text: en.disclaimer.errorCheckbox, href: "#agreed" }] });

      assertErrorSummary($, [en.disclaimer.errorCheckbox]);
      expect($(".govuk-error-message").text()).toContain(en.disclaimer.errorCheckbox);
    });
  });

  describe("Welsh rendering", () => {
    it("should render the Welsh heading, body text, checkbox label and button", () => {
      const { $ } = renderDisclaimer({}, cy);

      expect($("h1.govuk-heading-l").text().trim()).toBe(cy.disclaimer.pageTitle);
      const bodyText = $("p.govuk-body")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(bodyText).toContain(cy.disclaimer.disclaimerText);
      expect(bodyText).toContain(cy.disclaimer.responsibility);
      expect($(".govuk-checkboxes__label").text().trim()).toBe(cy.disclaimer.checkboxLabel);
      expect($("button.govuk-button").text().trim()).toBe(cy.disclaimer.continueButton);
    });

    it("should render the Welsh error summary and inline error when errors are present", () => {
      const { $ } = renderDisclaimer({ errors: [{ text: cy.disclaimer.errorCheckbox, href: "#agreed" }] }, cy);

      assertErrorSummary($, [cy.disclaimer.errorCheckbox]);
      expect($(".govuk-error-message").text()).toContain(cy.disclaimer.errorCheckbox);
    });
  });
});
