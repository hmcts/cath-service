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

const allFieldErrors = (content: typeof en) => [
  { text: content.errorFullNameBlank, href: "#fullName" },
  { text: content.errorFullNameWhiteSpace, href: "#fullName" },
  { text: content.errorFullNameDoubleWhiteSpace, href: "#fullName" },
  { text: content.errorFullNameWithoutWhiteSpace, href: "#fullName" },
  { text: content.errorEmailBlank, href: "#email" },
  { text: content.errorEmailStartWithWhiteSpace, href: "#email" },
  { text: content.errorEmailDoubleWhiteSpace, href: "#email" },
  { text: content.errorEmailInvalid, href: "#email" },
  { text: content.errorEmployerBlank, href: "#employer" },
  { text: content.errorEmployerWhiteSpace, href: "#employer" },
  { text: content.errorEmployerDoubleWhiteSpace, href: "#employer" },
  { text: content.errorFileBlank, href: "#idProof" },
  { text: content.errorFileSize, href: "#idProof" },
  { text: content.errorFileType, href: "#idProof" },
  { text: content.errorTermsRequired, href: "#termsAccepted" }
];

describe("create-media-account template", () => {
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

  describe("English content", () => {
    it("should render the page heading and opening text", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(en.title);
      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(en.openingText1);
      expect(bodyText).toContain(en.openingText2);
      expect(bodyText).toContain(en.openingText3);
    });

    it("should render the form fields with labels and hints", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($('label[for="fullName"]').text()).toContain(en.fullNameLabel);
      expect($('label[for="email"]').text()).toContain(en.emailLabel);
      expect($("#email-hint").text()).toContain(en.emailHint);
      expect($('label[for="employer"]').text()).toContain(en.employerLabel);
      expect($('label[for="idProof"]').text()).toContain(en.uploadLabel);
      expect($("#idProof-hint").text()).toContain(en.uploadHint);
      expect($('input[name="email"]').attr("type")).toBe("email");
      expect($('input[name="idProof"]').attr("type")).toBe("file");
      expect($('input[name="termsAccepted"]').attr("type")).toBe("checkbox");
    });

    it("should render the terms and conditions heading and paragraphs before the checkbox", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      const heading = $("h2.govuk-heading-m");
      expect(heading.text()).toContain(en.termsHeading);

      const paragraphs = $("form p.govuk-body");
      const paragraphTexts = paragraphs.map((_, el) => $(el).text()).get();
      expect(paragraphTexts).toContain(en.termsText1);
      expect(paragraphTexts).toContain(en.termsText2);
      expect(paragraphTexts).toContain(en.termsText3);

      // Terms content sits after the ID upload field and before the consent checkbox
      const headingIndex = $("*").index(heading);
      const uploadIndex = $("*").index($("#idProof"));
      const checkboxIndex = $("*").index($('input[name="termsAccepted"]'));
      expect(headingIndex).toBeGreaterThan(uploadIndex);
      expect(headingIndex).toBeLessThan(checkboxIndex);

      expect($('label[for="termsAccepted"]').text()).toContain(en.termsCheckboxLabel);
    });

    it("should not render a hint on the terms checkbox", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("#termsAccepted-hint")).toHaveLength(0);
    });

    it("should render every field validation message in the error summary", () => {
      const data = buildData(en, { errors: allFieldErrors(en) });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [
        en.errorFullNameWhiteSpace,
        en.errorFullNameDoubleWhiteSpace,
        en.errorFullNameWithoutWhiteSpace,
        en.errorEmailStartWithWhiteSpace,
        en.errorEmailDoubleWhiteSpace,
        en.errorEmailInvalid,
        en.errorEmployerBlank,
        en.errorEmployerWhiteSpace,
        en.errorEmployerDoubleWhiteSpace,
        en.errorFileSize,
        en.errorFileType,
        en.errorTermsRequired
      ]);
    });

    it("should render the continue button and back to top link", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      expect($("button").text()).toContain(en.continueButton);
      const backToTop = $('a[href="#top"]');
      expect(backToTop.text()).toContain(en.backToTop);
    });

    it("should pre-fill values from submitted data", () => {
      const data = buildData(en, {
        data: { name: "Jane Reporter", email: "jane@news.example", employer: "News Co", termsAccepted: true }
      });

      const { $ } = render(env, TEMPLATE, data);

      expect($('input[name="fullName"]').attr("value")).toBe("Jane Reporter");
      expect($('input[name="email"]').attr("value")).toBe("jane@news.example");
      expect($('input[name="employer"]').attr("value")).toBe("News Co");
      expect($('input[name="termsAccepted"]').attr("checked")).toBeDefined();
    });

    it("should not render an error summary when there are no errors", () => {
      const data = buildData(en);

      const { $ } = render(env, TEMPLATE, data);

      assertNoErrors($);
    });

    it("should render the error summary with field errors", () => {
      const errors = [
        { text: en.errorFullNameBlank, href: "#fullName" },
        { text: en.errorEmailBlank, href: "#email" },
        { text: en.errorFileBlank, href: "#idProof" }
      ];
      const data = buildData(en, { errors });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [en.errorFullNameBlank, en.errorEmailBlank, en.errorFileBlank]);
      expect($(".govuk-error-summary").text()).toContain(en.errorSummaryTitle);
      expect($("#idProof-error").text()).toContain(en.errorFileBlank);
    });
  });

  describe("Welsh content", () => {
    it("should render Welsh heading, labels and button", () => {
      const data = buildData(cy, { locale: "cy" });

      const { $ } = render(env, TEMPLATE, data);

      expect($("h1").text()).toContain(cy.title);
      expect($('label[for="fullName"]').text()).toContain(cy.fullNameLabel);
      expect($('label[for="email"]').text()).toContain(cy.emailLabel);
      expect($("button").text()).toContain(cy.continueButton);
      expect($('a[href="#top"]').text()).toContain(cy.backToTop);
    });

    it("should render the Welsh opening text, hints and terms content", () => {
      const data = buildData(cy, { locale: "cy" });

      const { $ } = render(env, TEMPLATE, data);

      const bodyText = $(".govuk-body").text();
      expect(bodyText).toContain(cy.openingText1);
      expect(bodyText).toContain(cy.openingText2);
      expect(bodyText).toContain(cy.openingText3);
      expect($('label[for="employer"]').text()).toContain(cy.employerLabel);
      expect($('label[for="idProof"]').text()).toContain(cy.uploadLabel);
      expect($("#idProof-hint").text()).toContain(cy.uploadHint);
      expect($("#email-hint").text()).toContain(cy.emailHint);
      expect($("h2.govuk-heading-m").text()).toContain(cy.termsHeading);
      expect(bodyText).toContain(cy.termsText1);
      expect(bodyText).toContain(cy.termsText2);
      expect(bodyText).toContain(cy.termsText3);
      expect($('label[for="termsAccepted"]').text()).toContain(cy.termsCheckboxLabel);
      // No English terms content leaks into the Welsh render
      expect(bodyText).not.toContain(en.termsText2);
    });

    it("should render the Welsh error summary", () => {
      const errors = [{ text: cy.errorFullNameBlank, href: "#fullName" }];
      const data = buildData(cy, { locale: "cy", errors });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [cy.errorFullNameBlank]);
      expect($(".govuk-error-summary").text()).toContain(cy.errorSummaryTitle);
    });

    it("should render every Welsh field validation message in the error summary", () => {
      const data = buildData(cy, { locale: "cy", errors: allFieldErrors(cy) });

      const { $ } = render(env, TEMPLATE, data);

      assertErrorSummary($, [
        cy.errorFullNameBlank,
        cy.errorFullNameWhiteSpace,
        cy.errorFullNameDoubleWhiteSpace,
        cy.errorFullNameWithoutWhiteSpace,
        cy.errorEmailBlank,
        cy.errorEmailStartWithWhiteSpace,
        cy.errorEmailDoubleWhiteSpace,
        cy.errorEmailInvalid,
        cy.errorEmployerBlank,
        cy.errorEmployerWhiteSpace,
        cy.errorEmployerDoubleWhiteSpace,
        cy.errorFileBlank,
        cy.errorFileSize,
        cy.errorFileType,
        cy.errorTermsRequired
      ]);
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
        "termsHeading",
        "termsText1",
        "termsText2",
        "termsText3",
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
