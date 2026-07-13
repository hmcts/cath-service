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

  describe("English locale", () => {
    it("should have required title", () => {
      expect(en.title).toBe("Create a Court and tribunal hearings account");
    });

    it("should have error summary title", () => {
      expect(en.errorSummaryTitle).toBe("There is a problem");
    });

    it("should have opening text paragraphs", () => {
      expect(en.openingText1).toContain("professional users");
      expect(en.openingText2).toContain("email");
      expect(en.openingText3).toContain("personal information");
    });

    it("should have form field labels", () => {
      expect(en.fullNameLabel).toBe("Full name");
      expect(en.emailLabel).toBe("Email address");
      expect(en.employerLabel).toBe("Employer");
      expect(en.uploadLabel).toBe("Upload a photo of your ID proof");
    });

    it("should have email hint text", () => {
      expect(en.emailHint).toContain("We'll only use this to contact you");
    });

    it("should have upload hint text", () => {
      expect(en.uploadHint).toContain("UK Press Card or work ID");
      expect(en.uploadHint).toContain("jpg, pdf or png");
      expect(en.uploadHint).toContain("2mb");
    });

    it("should have terms and conditions text", () => {
      expect(en.termsText).toContain("legitimate reasons");
      expect(en.termsCheckboxLabel).toBe("Please tick this box to agree to the above terms and conditions");
    });

    it("should have continue button text", () => {
      expect(en.continueButton).toBe("Continue");
    });

    it("should have back to top text", () => {
      expect(en.backToTop).toBe("Back to top");
    });

    it("should have all error messages", () => {
      expect(en.errorFullNameBlank).toBe("There is a problem - Full name field must be populated");
      expect(en.errorFullNameWhiteSpace).toBe("There is a problem - Full name field must not start with a space");
      expect(en.errorFullNameDoubleWhiteSpace).toBe("There is a problem - Full name field must not contain double spaces");
      expect(en.errorFullNameWithoutWhiteSpace).toBe("There is a problem - Your full name will be needed to support your application for an account");
      expect(en.errorEmailBlank).toBe("There is a problem - Email address field must be populated");
      expect(en.errorEmailStartWithWhiteSpace).toBe("There is a problem - Email address field cannot start with a space");
      expect(en.errorEmailDoubleWhiteSpace).toBe("There is a problem - Email address field cannot contain double spaces");
      expect(en.errorEmailInvalid).toBe("There is a problem - Enter an email address in the correct format, like name@example.com");
      expect(en.errorEmployerBlank).toBe("There is a problem - Your employers name will be needed to support your application for an account");
      expect(en.errorEmployerWhiteSpace).toBe("There is a problem - Employer field cannot start with a space");
      expect(en.errorEmployerDoubleWhiteSpace).toBe("There is a problem - Employer field cannot contain double spaces");
      expect(en.errorFileBlank).toBe("There is a problem - We will need ID evidence to support your application for an account");
      expect(en.errorFileSize).toBe("There is a problem - ID evidence needs to be less than 2Mbs");
      expect(en.errorFileType).toBe("There is a problem - ID evidence must be a JPG, PDF or PNG");
      expect(en.errorTermsRequired).toBe("There is a problem - You must check the box to confirm you agree to the terms and conditions.");
    });
  });

  describe("Welsh locale", () => {
    it("should have required title", () => {
      expect(cy.title).toBe("Creu cyfrif gwrandawiadau Llys a Thribiwnlys");
    });

    it("should have error summary title", () => {
      expect(cy.errorSummaryTitle).toBe("Mae yna broblem");
    });

    it("should have opening text paragraphs", () => {
      expect(cy.openingText1).toContain("defnyddwyr proffesiynol");
      expect(cy.openingText2).toContain("e-bost");
      expect(cy.openingText3).toContain("wybodaeth bersonol");
    });

    it("should have form field labels", () => {
      expect(cy.fullNameLabel).toBe("Enw llawn");
      expect(cy.emailLabel).toBe("Cyfeiriad e-bost");
      expect(cy.employerLabel).toBe("Cyflogwr");
      expect(cy.uploadLabel).toBe("Uwchlwytho llun o'ch prawf hunaniaeth");
    });

    it("should have email hint text", () => {
      expect(cy.emailHint).toContain("gysylltu");
    });

    it("should have upload hint text", () => {
      expect(cy.uploadHint).toContain("jpg, pdf neu png");
      expect(cy.uploadHint).toContain("2mb");
    });

    it("should have terms and conditions text", () => {
      expect(cy.termsText).toContain("cyfreithiol");
      expect(cy.termsCheckboxLabel).toContain("telerau ac amodau");
    });

    it("should have continue button text", () => {
      expect(cy.continueButton).toBe("Parhau");
    });

    it("should have back to top text", () => {
      expect(cy.backToTop).toBe("Yn ôl i'r brig");
    });

    it("should have all error messages", () => {
      expect(cy.errorFullNameBlank).toBe("Mae yna broblem - Rhaid llenwi'r maes enw llawn");
      expect(cy.errorFullNameWhiteSpace).toBe("Mae yna broblem - Ni ddylai'r maes enw llawn ddechrau gyda gofod");
      expect(cy.errorFullNameDoubleWhiteSpace).toBe("Mae yna broblem - Ni ddylai'r maes enw llawn gynnwys gofodau dwbl");
      expect(cy.errorFullNameWithoutWhiteSpace).toBe("Mae yna broblem - Bydd angen eich enw llawn i gefnogi eich cais am gyfrif");
      expect(cy.errorEmailBlank).toBe("Mae yna broblem - Rhaid llenwi'r maes cyfeiriad e-bost");
      expect(cy.errorEmailStartWithWhiteSpace).toBe("Mae yna broblem - Ni all y maes cyfeiriad e-bost ddechrau gyda gofod");
      expect(cy.errorEmailDoubleWhiteSpace).toBe("Mae yna broblem - Ni all y maes cyfeiriad e-bost gynnwys gofodau dwbl");
      expect(cy.errorEmailInvalid).toBe("Mae yna broblem - Nodwch gyfeiriad e-bost yn y fformat cywir, fel name@example.com");
      expect(cy.errorEmployerBlank).toBe("Mae yna broblem - Bydd angen enw eich cyflogwr i gefnogi eich cais am gyfrif");
      expect(cy.errorEmployerWhiteSpace).toBe("Mae yna broblem - Ni all y maes cyflogwr ddechrau gyda gofod");
      expect(cy.errorEmployerDoubleWhiteSpace).toBe("Mae yna broblem - Ni all y maes cyflogwr gynnwys gofodau dwbl");
      expect(cy.errorFileBlank).toBe("Mae yna broblem - Bydd angen tystiolaeth ID i gefnogi eich cais am gyfrif");
      expect(cy.errorFileSize).toBe("Mae yna broblem - Rhaid i'r dystiolaeth ID fod yn llai na 2Mbs");
      expect(cy.errorFileType).toBe("Mae yna broblem - Rhaid i'r dystiolaeth ID fod yn JPG, PDF neu PNG");
      expect(cy.errorTermsRequired).toBe("Mae yna broblem - Rhaid ichi dicio'r blwch i gadarnhau eich bod yn cytuno i'r telerau ac amodau");
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
