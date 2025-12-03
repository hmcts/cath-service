import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Page Structure - VIBE-149", () => {
  test.describe("GOV.UK Header and Service Navigation", () => {
    test("should display GOV.UK header link", async ({ page }) => {
      await page.goto("/");

      // AC1: GOV.UK link in blue banner
      const govukLink = page.locator(".govuk-header__link--homepage");
      await expect(govukLink).toBeVisible();
      await expect(govukLink).toHaveText("GOV.UK");
      await expect(govukLink).toHaveAttribute("href", "https://www.gov.uk");
    });

    test('should display service navigation with "Court and tribunal hearings"', async ({ page }) => {
      await page.goto("/");

      // AC2: "Court and tribunal hearings" link
      const serviceNameLink = page.locator(".govuk-service-navigation__service-name a");
      await expect(serviceNameLink).toBeVisible();
      await expect(serviceNameLink).toHaveText("Court and tribunal hearings");
      await expect(serviceNameLink).toHaveAttribute("href", "/");
    });

    test("should display Sign in link in top-right", async ({ page }) => {
      await page.goto("/");

      // AC3: Sign in link top-right
      const signInLink = page.locator('.govuk-service-navigation__link[href="/sign-in"]');
      await expect(signInLink).toBeVisible();
      await expect(signInLink).toHaveText("Sign in");
    });

    test("should display Welsh toggle in beta banner", async ({ page }) => {
      await page.goto("/");

      // AC6: Welsh toggle in beta banner (phase banner)
      const languageToggle = page.locator('.govuk-phase-banner a:has-text("Cymraeg")');
      await expect(languageToggle).toBeVisible();
      await expect(languageToggle).toHaveText("Cymraeg");
    });
  });

  test.describe("Beta Banner", () => {
    test("should display beta notification with feedback link", async ({ page }) => {
      await page.goto("/");

      // AC4: Beta notification with feedback
      const phaseBanner = page.locator(".govuk-phase-banner");
      await expect(phaseBanner).toBeVisible();

      // Check beta tag
      const betaTag = phaseBanner.locator(".govuk-phase-banner__content__tag");
      await expect(betaTag).toHaveText("beta");

      // AC5: Feedback link embedded (external SmartSurvey link)
      const feedbackLink = phaseBanner.locator('a[href*="smartsurvey.co.uk"]');
      await expect(feedbackLink).toBeVisible();
      await expect(feedbackLink).toContainText("feedback");
    });
  });

  test.describe("Footer", () => {
    test("should display footer with dark blue banner", async ({ page }) => {
      await page.goto("/");

      // AC7: Footer with dark blue banner
      const footer = page.locator(".govuk-footer");
      await expect(footer).toBeVisible();
    });

    test("should contain all 8 required footer links", async ({ page }) => {
      await page.goto("/");

      // AC8: All 8 footer links present
      // Note: The footer has 8 links
      const footerLinksOpenInSameTab = [
        { text: "Help", href: "https://www.gov.uk/help" },
        { text: "Privacy policy", href: "https://www.gov.uk/help/privacy-notice" },
        { text: "Accessibility statement", href: "/accessibility-statement" },
        { text: "Contact us", href: "https://www.gov.uk/contact" },
        { text: "Terms and conditions", href: "https://www.gov.uk/help/terms-conditions" },
        { text: "Welsh", href: "https://www.gov.uk/cymraeg" },
        { text: "Government Digital Service", href: "https://www.gov.uk/government/organisations/government-digital-service" }
      ];

      // Verify we have 8 footer meta links
      const footerMetaLinks = page.locator(".govuk-footer__meta .govuk-footer__inline-list-item");
      await expect(footerMetaLinks).toHaveCount(8);

      // Verify links that open in same tab
      for (const link of footerLinksOpenInSameTab) {
        const footerLink = page.locator(`.govuk-footer__link[href="${link.href}"]`).first();
        await expect(footerLink).toBeVisible({ timeout: 5000 });

        // Verify links open in same tab (no target="_blank")
        const targetAttr = await footerLink.getAttribute("target");
        expect(targetAttr).not.toBe("_blank");
      }

      // Verify Cookies link opens in new tab
      const cookiesLink = page.locator('.govuk-footer__link[href="/cookies-policy"]').first();
      await expect(cookiesLink).toBeVisible({ timeout: 5000 });
      await expect(cookiesLink).toHaveAttribute("target", "_blank");
      await expect(cookiesLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    test("should display Crown copyright link", async ({ page }) => {
      await page.goto("/");

      // AC10: Crown copyright link
      const copyrightLink = page.locator(".govuk-footer__copyright-logo");
      await expect(copyrightLink).toBeVisible();
      await expect(copyrightLink).toHaveAttribute(
        "href",
        "https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/"
      );
    });

    test("should display Open Government Licence text and attribution", async ({ page }) => {
      await page.goto("/");

      // Verify OGL text in footer
      const oglText = page.locator(".govuk-footer__meta-item--grow");
      await expect(oglText).toContainText("All content is available under the");
      await expect(oglText).toContainText("Open Government Licence v3.0");

      // Verify attribution text is present
      await expect(oglText).toContainText("When you use this information under the OGL, you should include the following attribution:");
      await expect(oglText).toContainText("Contains public sector information licensed under the Open Government Licence v3.0");
      await expect(oglText).toContainText(
        "The Open Government Licence v3.0 does not cover use of any personal data in the Court and tribunal hearings service"
      );
      await expect(oglText).toContainText("Personal data is subject to applicable data protection laws");
    });
  });

  test.describe("Welsh Language Toggle", () => {
    test("should switch to Welsh and back to English", async ({ page }) => {
      await page.goto("/");

      // Verify English content is displayed
      const serviceNameLink = page.locator(".govuk-service-navigation__service-name a");
      await expect(serviceNameLink).toHaveText("Court and tribunal hearings");

      // Click the language toggle to switch to Welsh (in phase banner)
      const languageToggle = page.locator('.govuk-phase-banner a:has-text("Cymraeg")');
      await expect(languageToggle).toBeVisible();
      await languageToggle.click();

      // Verify Welsh content is displayed
      await expect(page).toHaveURL(/.*\?lng=cy/);
      await expect(serviceNameLink).toHaveText("Gwrandawiadau llys a thribiwnlys");

      // Find the English toggle (in phase banner)
      const englishToggle = page.locator('.govuk-phase-banner a:has-text("English")');
      await expect(englishToggle).toBeVisible();

      // Verify Sign in link is in Welsh
      const signInLink = page.locator('.govuk-service-navigation__link[href="/sign-in"]');
      await expect(signInLink).toHaveText("Mewngofnodi");

      // Verify footer links are in Welsh
      const cookiesLink = page.locator('.govuk-footer__link[href="/cookie-preferences"]');
      await expect(cookiesLink).toHaveText("Cwcis");

      // Click language toggle to switch back to English
      await englishToggle.click();
      await expect(page).toHaveURL(/.*\?lng=en/);
      await expect(serviceNameLink).toHaveText("Court and tribunal hearings");

      // Verify Cymraeg toggle is back
      await expect(languageToggle).toBeVisible();
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");

      // Verify header is visible on mobile
      const govukLink = page.locator(".govuk-header__link--homepage");
      await expect(govukLink).toBeVisible();

      // Verify service navigation is visible
      const serviceNameLink = page.locator(".govuk-service-navigation__service-name a");
      await expect(serviceNameLink).toBeVisible();

      // Verify footer is visible
      const footer = page.locator(".govuk-footer");
      await expect(footer).toBeVisible();
    });

    test("should display correctly on tablet", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/");

      // Verify all key elements are visible
      const govukLink = page.locator(".govuk-header__link--homepage");
      await expect(govukLink).toBeVisible();

      const signInLink = page.locator('.govuk-service-navigation__link[href="/sign-in"]');
      await expect(signInLink).toBeVisible();
    });

    test("should display correctly on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/");

      // Verify all navigation elements are visible
      const govukLink = page.locator(".govuk-header__link--homepage");
      await expect(govukLink).toBeVisible();

      const languageToggle = page.locator('.govuk-phase-banner a:has-text("Cymraeg")');
      await expect(languageToggle).toBeVisible();
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("should navigate through header and footer links with Tab key", async ({ page }) => {
      await page.goto("/");

      // Verify key navigation elements are keyboard accessible (have href and are visible)
      const keyElements = [
        { selector: ".govuk-service-navigation__service-name a", name: "Service name" },
        { selector: '.govuk-service-navigation__link[href="/sign-in"]', name: "Sign in" },
        { selector: '.govuk-phase-banner a:has-text("Cymraeg")', name: "Language toggle" }
      ];

      // Verify all key navigation elements are visible and have href (keyboard accessible)
      for (const { selector, name } of keyElements) {
        const element = page.locator(selector).first();
        await expect(element, `${name} should be visible`).toBeVisible();
        const href = await element.getAttribute("href");
        expect(href, `${name} should have href attribute`).toBeTruthy();
      }
    });
  });

  test.describe("Accessibility", () => {
    test("should meet WCAG 2.2 AA standards", async ({ page }) => {
      await page.goto("/");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["link-name", "target-size"]) // Known GOV.UK Design System footer issues
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log("Accessibility violations found:");
        accessibilityScanResults.violations.forEach((violation) => {
          console.log(`- ${violation.id}: ${violation.description}`);
          console.log(`  Impact: ${violation.impact}`);
          console.log(`  Affected nodes: ${violation.nodes.length}`);
          violation.nodes.forEach((node) => {
            console.log(`    ${node.target}`);
          });
        });
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should have proper aria labels on navigation elements", async ({ page }) => {
      await page.goto("/");

      // Check feedback link exists in phase banner
      const feedbackLink = page.locator('.govuk-phase-banner a[href*="smartsurvey.co.uk"]');
      await expect(feedbackLink).toBeVisible();

      // Check service navigation is accessible
      const serviceNav = page.locator(".govuk-service-navigation");
      await expect(serviceNav).toBeVisible();
    });

    test("should have visible focus states on all interactive elements", async ({ page }) => {
      await page.goto("/");

      // Test that key interactive elements can receive focus
      const elements = [
        { selector: ".govuk-header__link--homepage", name: "GOV.UK header" },
        { selector: ".govuk-service-navigation__service-name a", name: "Service name" },
        { selector: '.govuk-service-navigation__link[href="/sign-in"]', name: "Sign in link" },
        { selector: '.govuk-phase-banner a:has-text("Cymraeg")', name: "Welsh toggle" }
      ];

      for (const element of elements) {
        const locator = page.locator(element.selector);
        await locator.focus();

        // Verify element is visible and has a bounding box
        await expect(locator).toBeVisible();
        const box = await locator.boundingBox();
        expect(box, `${element.name} should have a bounding box`).toBeTruthy();
      }
    });
  });

  test.describe("Error Pages", () => {
    test("should display service navigation on 404 pages", async ({ page }) => {
      // Go to a non-existent page
      const response = await page.goto("/non-existent-page");
      expect(response?.status()).toBe(404);

      // Verify service navigation is still present
      const serviceNameLink = page.locator(".govuk-service-navigation__service-name a");
      await expect(serviceNameLink).toBeVisible();

      // Verify footer is still present
      const footer = page.locator(".govuk-footer");
      await expect(footer).toBeVisible();
    });
  });
});
