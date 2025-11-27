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
      expect(en.errorFullNameRequired).toBe("There is a problem - Full name field must be populated");
      expect(en.errorEmailInvalid).toBe("There is a problem - Email address field must be populated");
      expect(en.errorEmployerRequired).toBe("There is a problem - Your employers name will be needed to support your application for an account");
      expect(en.errorFileRequired).toBe("There is a problem - We will need ID evidence to support your application for an account");
      expect(en.errorFileSize).toBe("Your file must be smaller than 2MB");
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
      expect(cy.errorFullNameRequired).toBe("Nodwch eich enw llawn");
      expect(cy.errorEmailInvalid).toBe("Nodwch gyfeiriad e-bost yn y fformat cywir, e.e. name@example.com");
      expect(cy.errorEmployerRequired).toBe("Nodwch enw eich cyflogwr");
      expect(cy.errorFileRequired).toBe("Dewiswch ffeil yn fformat .jpg, .pdf neu .png");
      expect(cy.errorFileSize).toBe("Rhaid i'ch ffeil fod yn llai na 2MB");
      expect(cy.errorTermsRequired).toBe("Dewiswch y blwch i gytuno i'r telerau ac amodau");
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
        "errorFullNameRequired",
        "errorEmailInvalid",
        "errorEmployerRequired",
        "errorFileRequired",
        "errorFileSize",
        "errorTermsRequired"
      ];

      for (const key of requiredKeys) {
        expect(en).toHaveProperty(key);
        expect(cy).toHaveProperty(key);
      }
    });
  });
});
