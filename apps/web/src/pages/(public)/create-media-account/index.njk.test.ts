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

const TEMPLATE = "(public)/create-media-account/index.njk";

const buildData = (content: typeof en, overrides: Record<string, unknown> = {}) => ({
  ...content,
  errors: undefined,
  data: {},
  locale: "en",
  ...overrides
});

describe("create-media-account template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
    });
  });

  describe("Rendering", () => {
    let env: nunjucks.Environment;

    beforeEach(() => {
      env = createTestEnvironment([path.join(__dirname, "../../"), path.join(__dirname, "../../../../../../libs/web-core/src/views")]);
    });

    describe("English content", () => {
      it("should render the page heading and opening text", () => {
        // Arrange
        const data = buildData(en);

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        expect($("h1").text()).toContain(en.title);
        const bodyText = $(".govuk-body").text();
        expect(bodyText).toContain(en.openingText1);
        expect(bodyText).toContain(en.openingText2);
        expect(bodyText).toContain(en.openingText3);
      });

      it("should render the form fields with labels and hints", () => {
        // Arrange
        const data = buildData(en);

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        expect($('label[for="fullName"]').text()).toContain(en.fullNameLabel);
        expect($('label[for="email"]').text()).toContain(en.emailLabel);
        expect($('label[for="employer"]').text()).toContain(en.employerLabel);
        expect($('label[for="idProof"]').text()).toContain(en.uploadLabel);
        expect($("#idProof-hint").text()).toContain(en.uploadHint);
        expect($('input[name="email"]').attr("type")).toBe("email");
        expect($('input[name="idProof"]').attr("type")).toBe("file");
        expect($('input[name="termsAccepted"]').attr("type")).toBe("checkbox");
      });

      it("should render the continue button and back to top link", () => {
        // Arrange
        const data = buildData(en);

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        expect($("button").text()).toContain(en.continueButton);
        const backToTop = $('a[href="#top"]');
        expect(backToTop.text()).toContain(en.backToTop);
      });

      it("should pre-fill values from submitted data", () => {
        // Arrange
        const data = buildData(en, {
          data: { name: "Jane Reporter", email: "jane@news.example", employer: "News Co", termsAccepted: true }
        });

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        expect($('input[name="fullName"]').attr("value")).toBe("Jane Reporter");
        expect($('input[name="email"]').attr("value")).toBe("jane@news.example");
        expect($('input[name="employer"]').attr("value")).toBe("News Co");
        expect($('input[name="termsAccepted"]').attr("checked")).toBeDefined();
      });

      it("should not render an error summary when there are no errors", () => {
        // Arrange
        const data = buildData(en);

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        assertNoErrors($);
      });

      it("should render the error summary with field errors", () => {
        // Arrange
        const errors = [
          { text: en.errorFullNameBlank, href: "#fullName" },
          { text: en.errorEmailBlank, href: "#email" },
          { text: en.errorFileBlank, href: "#idProof" }
        ];
        const data = buildData(en, { errors });

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        assertErrorSummary($, [en.errorFullNameBlank, en.errorEmailBlank, en.errorFileBlank]);
        expect($(".govuk-error-summary").text()).toContain(en.errorSummaryTitle);
        expect($("#idProof-error").text()).toContain(en.errorFileBlank);
      });
    });

    describe("Welsh content", () => {
      it("should render Welsh heading, labels and button", () => {
        // Arrange
        const data = buildData(cy, { locale: "cy" });

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        expect($("h1").text()).toContain(cy.title);
        expect($('label[for="fullName"]').text()).toContain(cy.fullNameLabel);
        expect($('label[for="email"]').text()).toContain(cy.emailLabel);
        expect($("button").text()).toContain(cy.continueButton);
        expect($('a[href="#top"]').text()).toContain(cy.backToTop);
      });

      it("should render the Welsh error summary", () => {
        // Arrange
        const errors = [{ text: cy.errorFullNameBlank, href: "#fullName" }];
        const data = buildData(cy, { locale: "cy", errors });

        // Act
        const { $ } = render(env, TEMPLATE, data);

        // Assert
        assertErrorSummary($, [cy.errorFullNameBlank]);
        expect($(".govuk-error-summary").text()).toContain(cy.errorSummaryTitle);
      });
    });
  });

  describe("Locale consistency", () => {
    it("should have same keys in English and Welsh", () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(cy).sort());
    });

    it("should have all required keys", () => {
      const requiredKeys = [
        "title",
        "openingText1",
        "openingText2",
        "openingText3",
        "fullNameLabel",
        "emailLabel",
        "emailHint",
        "employerLabel",
        "uploadLabel",
        "uploadHint",
        "termsText",
        "termsCheckboxLabel",
        "continueButton",
        "backToTop",
        "errorSummaryTitle",
        "errorFullNameBlank",
        "errorFullNameWhiteSpace",
        "errorFullNameDoubleWhiteSpace",
        "errorFullNameWithoutWhiteSpace",
        "errorEmailBlank",
        "errorEmailStartWithWhiteSpace",
        "errorEmailDoubleWhiteSpace",
        "errorEmailInvalid",
        "errorEmployerBlank",
        "errorEmployerWhiteSpace",
        "errorEmployerDoubleWhiteSpace",
        "errorFileBlank",
        "errorFileSize",
        "errorFileType",
        "errorTermsRequired"
      ];

      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });
});
