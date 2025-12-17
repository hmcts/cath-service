import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("create-media-account template", () => {
  describe("Template file", () => {
    it("should exist", () => {
      const templatePath = path.join(__dirname, "index.njk");
      expect(existsSync(templatePath)).toBe(true);
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
