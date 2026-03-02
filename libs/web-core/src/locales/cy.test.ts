import { describe, expect, it } from "vitest";
import { cy } from "./cy.js";

describe("Welsh Locale", () => {
  it("should export cy object", () => {
    expect(cy).toBeDefined();
    expect(typeof cy).toBe("object");
  });

  it("should have govUk property", () => {
    expect(cy.govUk).toBe("GOV.UK");
  });

  it("should have phase property", () => {
    expect(cy.phase).toBe("beta");
  });

  it("should have navigation object with Welsh text", () => {
    expect(cy.navigation).toBeDefined();
    expect(cy.navigation.signIn).toBe("Mewngofnodi");
  });

  it("should have authenticatedNavigation object with Welsh text", () => {
    expect(cy.authenticatedNavigation).toBeDefined();
    expect(cy.authenticatedNavigation.signOut).toBe("Allgofnodi");
  });

  it("should have footer object with required Welsh properties", () => {
    expect(cy.footer).toBeDefined();
    expect(cy.footer.help).toBe("Gymorth");
    expect(cy.footer.cookies).toBe("Cwcis");
    expect(cy.footer.privacyPolicy).toBe("Preifatrwydd");
    expect(cy.footer.accessibility).toBe("Datganiad hygyrchedd");
    expect(cy.footer.termsAndConditions).toBe("Telerau ac amodau");
    expect(cy.footer.contactUs).toBe("Cysylltwch");
  });

  it("should have contentLicence in footer", () => {
    expect(cy.footer.contentLicence).toBeDefined();
    expect(cy.footer.contentLicence.text).toContain("available under");
    expect(cy.footer.contentLicence.linkText).toContain("Open Government Licence");
  });

  it("should have language switcher pointing to English", () => {
    expect(cy.language).toBeDefined();
    expect(cy.language.switch).toBe("English");
    expect(cy.language.switchAriaLabel).toBe("Newid iaith i Saesneg");
  });

  it("should have feedback section with Welsh text", () => {
    expect(cy.feedback).toBeDefined();
    expect(cy.feedback.part1).toContain("wasanaeth newydd");
    expect(cy.feedback.part2).toBe("adborth");
    expect(cy.feedback.link).toContain("smartsurvey");
  });

  it("should have same structure as English locale", () => {
    const enKeys = ["govUk", "phase", "navigation", "authenticatedNavigation", "footer", "language", "feedback"];
    for (const key of enKeys) {
      expect(cy).toHaveProperty(key);
    }
  });
});
