import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Page Structure", () => {
  test("page structure displays correctly with header, beta banner, and footer", async ({ page }) => {
    await page.goto("/");

    // GOV.UK header link
    const govukLink = page.locator(".govuk-header__link--homepage");
    await expect(govukLink).toBeVisible();
    await expect(govukLink).toHaveText("GOV.UK");
    await expect(govukLink).toHaveAttribute("href", "https://www.gov.uk");

    // Service navigation with service name
    const serviceNameLink = page.locator(".govuk-service-navigation__service-name a");
    await expect(serviceNameLink).toBeVisible();
    await expect(serviceNameLink).toHaveText("Court and tribunal hearings");
    await expect(serviceNameLink).toHaveAttribute("href", "/");

    // Sign in link in service navigation
    const signInLink = page.locator('.govuk-service-navigation__link[href="/sign-in"]');
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveText("Sign in");

    // Beta banner with feedback link
    const phaseBanner = page.locator(".govuk-phase-banner");
    await expect(phaseBanner).toBeVisible();
    const betaTag = phaseBanner.locator(".govuk-phase-banner__content__tag");
    await expect(betaTag).toHaveText("beta");
    const feedbackLink = phaseBanner.locator('a[href*="smartsurvey.co.uk"]');
    await expect(feedbackLink).toBeVisible();
    await expect(feedbackLink).toContainText("feedback");

    // Welsh toggle in service navigation
    const languageToggle = page.locator('.govuk-service-navigation a:has-text("Cymraeg")');
    await expect(languageToggle).toBeVisible();
    await expect(languageToggle).toHaveText("Cymraeg");

    // Footer with all required links
    const footer = page.locator(".govuk-footer");
    await expect(footer).toBeVisible();

    // Verify 8 footer meta links
    const footerMetaLinks = page.locator(".govuk-footer__meta .govuk-footer__inline-list-item");
    await expect(footerMetaLinks).toHaveCount(8);

    // Links that should open in same tab
    const sameTabLinks = [
      { text: "Help", href: "https://www.gov.uk/help" },
      { text: "Privacy policy", href: "https://www.gov.uk/help/privacy-notice" },
      { text: "Contact us", href: "https://www.gov.uk/contact" },
      { text: "Terms and conditions", href: "https://www.gov.uk/help/terms-conditions" },
      { text: "Welsh", href: "https://www.gov.uk/cymraeg" },
      { text: "Government Digital Service", href: "https://www.gov.uk/government/organisations/government-digital-service" }
    ];

    for (const link of sameTabLinks) {
      const footerLink = page.locator(`.govuk-footer__link[href="${link.href}"]`).first();
      await expect(footerLink).toBeVisible();
      const targetAttr = await footerLink.getAttribute("target");
      expect(targetAttr).not.toBe("_blank");
    }

    // Cookie policy and accessibility statement should open in new tab
    const cookiePolicyLink = page.locator('.govuk-footer__link[href="/cookie-policy"]').first();
    await expect(cookiePolicyLink).toBeVisible();
    await expect(cookiePolicyLink).toHaveAttribute("target", "_blank");
    await expect(cookiePolicyLink).toHaveAttribute("rel", "noopener noreferrer");

    const accessibilityLink = page.locator('.govuk-footer__link[href="/accessibility-statement"]').first();
    await expect(accessibilityLink).toBeVisible();
    await expect(accessibilityLink).toHaveAttribute("target", "_blank");
    await expect(accessibilityLink).toHaveAttribute("rel", "noopener noreferrer");

    // Crown copyright link
    const copyrightLink = page.locator(".govuk-footer__copyright-logo");
    await expect(copyrightLink).toBeVisible();
    await expect(copyrightLink).toHaveAttribute(
      "href",
      "https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/"
    );

    // Open Government Licence text
    const oglText = page.locator(".govuk-footer__meta-item--grow");
    await expect(oglText).toContainText("All content is available under the");
    await expect(oglText).toContainText("Open Government Licence v3.0");
    await expect(oglText).toContainText("Contains public sector information licensed under the Open Government Licence v3.0");

    // Keyboard navigation - verify key elements can receive focus
    const keyElements = [
      { locator: govukLink, name: "GOV.UK header" },
      { locator: serviceNameLink, name: "Service name" },
      { locator: signInLink, name: "Sign in link" },
      { locator: languageToggle, name: "Welsh toggle" }
    ];

    for (const { locator, name } of keyElements) {
      await locator.focus();
      await expect(locator, `${name} should be visible when focused`).toBeVisible();
      const box = await locator.boundingBox();
      expect(box, `${name} should have a bounding box for focus states`).toBeTruthy();
    }

    // Accessibility check
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["link-name", "target-size"]) // Known GOV.UK Design System footer issues
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("page structure displays correctly in Welsh @nightly", async ({ page }) => {
    await page.goto("/");

    // Verify English content first
    const serviceNameLink = page.locator(".govuk-service-navigation__service-name a");
    await expect(serviceNameLink).toHaveText("Court and tribunal hearings");

    // Switch to Welsh via service navigation toggle
    const languageToggle = page.locator('.govuk-service-navigation a:has-text("Cymraeg")');
    await expect(languageToggle).toBeVisible();
    await languageToggle.click();

    // Verify Welsh URL and content
    await expect(page).toHaveURL(/.*\?lng=cy/);
    await expect(serviceNameLink).toHaveText("Gwrandawiadau llys a thribiwnlys");

    // Verify Sign in link is in Welsh
    const signInLink = page.locator('.govuk-service-navigation__link[href="/sign-in"]');
    await expect(signInLink).toHaveText("Mewngofnodi");

    // Verify English toggle is available
    const englishToggle = page.locator('.govuk-service-navigation a:has-text("English")');
    await expect(englishToggle).toBeVisible();

    // Verify footer links are in Welsh
    const cookiesLink = page.locator('.govuk-footer__link[href="/cookie-policy"]');
    await expect(cookiesLink).toHaveText("Cwcis");

    // Accessibility check in Welsh
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["link-name", "target-size"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Switch back to English
    await englishToggle.click();
    await expect(page).toHaveURL(/.*\?lng=en/);
    await expect(serviceNameLink).toHaveText("Court and tribunal hearings");
    await expect(languageToggle).toBeVisible();
  });

  test("404 error page displays service navigation and footer", async ({ page }) => {
    // Navigate to non-existent page
    const response = await page.goto("/non-existent-page");
    expect(response?.status()).toBe(404);

    // Verify service navigation is present
    const serviceNameLink = page.locator(".govuk-service-navigation__service-name a");
    await expect(serviceNameLink).toBeVisible();
    await expect(serviceNameLink).toHaveText("Court and tribunal hearings");

    // Verify Sign in link is present
    const signInLink = page.locator('.govuk-service-navigation__link[href="/sign-in"]');
    await expect(signInLink).toBeVisible();

    // Verify footer is present
    const footer = page.locator(".govuk-footer");
    await expect(footer).toBeVisible();

    // Accessibility check on 404 page
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["link-name", "target-size"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
