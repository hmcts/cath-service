import { describe, expect, it } from "vitest";
import { en } from "./en.js";

describe("English Locale", () => {
  it("should export en object", () => {
    expect(en).toBeDefined();
    expect(typeof en).toBe("object");
  });

  it("should have govUk property", () => {
    expect(en.govUk).toBe("GOV.UK");
  });

  it("should have phase property", () => {
    expect(en.phase).toBe("beta");
  });

  it("should have navigation object", () => {
    expect(en.navigation).toBeDefined();
    expect(en.navigation.signIn).toBe("Sign in");
  });

  it("should have authenticatedNavigation object", () => {
    expect(en.authenticatedNavigation).toBeDefined();
    expect(en.authenticatedNavigation.signOut).toBe("Sign out");
  });

  it("should have footer object with required properties", () => {
    expect(en.footer).toBeDefined();
    expect(en.footer.help).toBe("Help");
    expect(en.footer.cookies).toBe("Cookies");
    expect(en.footer.privacyPolicy).toBe("Privacy");
    expect(en.footer.accessibility).toBe("Accessibility statement");
    expect(en.footer.termsAndConditions).toBe("Terms and conditions");
    expect(en.footer.contactUs).toBe("Contact");
    expect(en.footer.language).toBe("Welsh");
  });

  it("should have contentLicence in footer", () => {
    expect(en.footer.contentLicence).toBeDefined();
    expect(en.footer.contentLicence.text).toContain("available under");
    expect(en.footer.contentLicence.linkText).toContain("Open Government Licence");
  });

  it("should have language switcher", () => {
    expect(en.language).toBeDefined();
    expect(en.language.switch).toBe("Cymraeg");
    expect(en.language.switchAriaLabel).toBe("Change language to Welsh");
  });

  it("should have feedback section", () => {
    expect(en.feedback).toBeDefined();
    expect(en.feedback.part1).toContain("new service");
    expect(en.feedback.part2).toBe("feedback");
    expect(en.feedback.link).toContain("smartsurvey");
  });
});
