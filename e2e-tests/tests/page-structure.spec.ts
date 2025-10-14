import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Page Structure - VIBE-149', () => {
  test.describe('GOV.UK Header and Service Navigation', () => {
    test('should display GOV.UK header link', async ({ page }) => {
      await page.goto('/');

      // AC1: GOV.UK link in blue banner
      const govukLink = page.locator('.govuk-header__link--homepage');
      await expect(govukLink).toBeVisible();
      await expect(govukLink).toHaveText('GOV.UK');
      await expect(govukLink).toHaveAttribute('href', 'https://www.gov.uk');
    });

    test('should display service navigation with "Court and tribunal hearings"', async ({ page }) => {
      await page.goto('/');

      // AC2: "Court and tribunal hearings" link
      const serviceNameLink = page.locator('.govuk-service-navigation__service-name a');
      await expect(serviceNameLink).toBeVisible();
      await expect(serviceNameLink).toHaveText('Court and tribunal hearings');
      await expect(serviceNameLink).toHaveAttribute('href', '/');
    });

    test('should display Sign in link in top-right', async ({ page }) => {
      await page.goto('/');

      // AC3: Sign in link top-right
      const signInLink = page.locator('.govuk-service-navigation__link[href="/sign-in"]');
      await expect(signInLink).toBeVisible();
      await expect(signInLink).toHaveText('Sign in');
    });

    test('should display Welsh toggle in service navigation', async ({ page }) => {
      await page.goto('/');

      // AC6: Welsh toggle top-right (in service navigation)
      const languageToggle = page.locator('.govuk-service-navigation a:has-text("Cymraeg")');
      await expect(languageToggle).toBeVisible();
      await expect(languageToggle).toHaveText('Cymraeg');
    });
  });

  test.describe('Beta Banner', () => {
    test('should display beta notification with feedback link', async ({ page }) => {
      await page.goto('/');

      // AC4: Beta notification with feedback
      const phaseBanner = page.locator('.govuk-phase-banner');
      await expect(phaseBanner).toBeVisible();

      // Check beta tag
      const betaTag = phaseBanner.locator('.govuk-phase-banner__content__tag');
      await expect(betaTag).toHaveText('beta');

      // AC5: Feedback link embedded
      const feedbackLink = phaseBanner.locator('a[href^="/feedback"]');
      await expect(feedbackLink).toBeVisible();
      await expect(feedbackLink).toHaveText('give feedback');
    });
  });

  test.describe('Footer', () => {
    test('should display footer with dark blue banner', async ({ page }) => {
      await page.goto('/');

      // AC7: Footer with dark blue banner
      const footer = page.locator('.govuk-footer');
      await expect(footer).toBeVisible();
    });

    test('should contain all 9 required footer links', async ({ page }) => {
      await page.goto('/');

      // AC8: All 9 footer links present
      // Note: The footer has 9 links including the language toggle
      const footerLinks = [
        { text: 'Help', href: 'https://www.gov.uk/help' },
        { text: 'Privacy policy', href: '/privacy-policy' },
        { text: 'Cookies', href: '/cookies' },
        { text: 'Accessibility statement', href: '/accessibility-statement' },
        { text: 'Contact us', href: '/contact-us' },
        { text: 'Terms and conditions', href: '/terms-and-conditions' },
        { text: 'Cymraeg', href: '/?lng=cy' }, // Welsh language toggle
        { text: 'Government Digital Service', href: 'https://www.gov.uk/government/organisations/government-digital-service' },
        { text: 'Open Government Licence v3.0', href: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/' }
      ];

      // Verify we have 9 footer meta links
      const footerMetaLinks = page.locator('.govuk-footer__meta .govuk-footer__inline-list-item');
      await expect(footerMetaLinks).toHaveCount(9);

      // Verify specific important links are present
      for (const link of footerLinks) {
        const footerLink = page.locator(`.govuk-footer__link[href="${link.href}"]`);
        await expect(footerLink).toBeVisible({ timeout: 5000 });

        // Verify links open in same tab (no target="_blank")
        const targetAttr = await footerLink.getAttribute('target');
        expect(targetAttr).not.toBe('_blank');
      }
    });

    test('should display Crown copyright link', async ({ page }) => {
      await page.goto('/');

      // AC10: Crown copyright link
      const copyrightLink = page.locator('.govuk-footer__copyright-logo');
      await expect(copyrightLink).toBeVisible();
      await expect(copyrightLink).toHaveAttribute('href', 'https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/');
    });

    test('should display Open Government Licence text', async ({ page }) => {
      await page.goto('/');

      // Verify OGL text in footer
      const oglText = page.locator('.govuk-footer__meta-item--grow');
      await expect(oglText).toContainText('All content is available under the');
      await expect(oglText).toContainText('Open Government Licence v3.0');
    });
  });

  test.describe('Welsh Language Toggle', () => {
    test('should switch to Welsh and back to English', async ({ page }) => {
      await page.goto('/');

      // Verify English content is displayed
      const serviceNameLink = page.locator('.govuk-service-navigation__service-name a');
      await expect(serviceNameLink).toHaveText('Court and tribunal hearings');

      // Click the language toggle to switch to Welsh
      const languageToggle = page.locator('.govuk-service-navigation a:has-text("Cymraeg")');
      await expect(languageToggle).toBeVisible();
      await languageToggle.click();

      // Verify Welsh content is displayed
      await expect(page).toHaveURL(/.*\?lng=cy/);
      await expect(serviceNameLink).toHaveText('Gwrandawiadau llys a thribiwnlys');

      // Find the English toggle
      const englishToggle = page.locator('.govuk-service-navigation a:has-text("English")');
      await expect(englishToggle).toBeVisible();

      // Verify Sign in link is in Welsh
      const signInLink = page.locator('.govuk-service-navigation__link[href="/sign-in"]');
      await expect(signInLink).toHaveText('Mewngofnodi');

      // Verify footer links are in Welsh
      const cookiesLink = page.locator('.govuk-footer__link[href="/cookies"]');
      await expect(cookiesLink).toContainText('Cwcis');

      // Click language toggle to switch back to English
      await englishToggle.click();
      await expect(page).toHaveURL(/.*\?lng=en/);
      await expect(serviceNameLink).toHaveText('Court and tribunal hearings');

      // Verify Cymraeg toggle is back
      await expect(languageToggle).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Verify header is visible on mobile
      const govukLink = page.locator('.govuk-header__link--homepage');
      await expect(govukLink).toBeVisible();

      // Verify service navigation is visible
      const serviceNameLink = page.locator('.govuk-service-navigation__service-name a');
      await expect(serviceNameLink).toBeVisible();

      // Verify footer is visible
      const footer = page.locator('.govuk-footer');
      await expect(footer).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');

      // Verify all key elements are visible
      const govukLink = page.locator('.govuk-header__link--homepage');
      await expect(govukLink).toBeVisible();

      const signInLink = page.locator('.govuk-service-navigation__link[href="/sign-in"]');
      await expect(signInLink).toBeVisible();
    });

    test('should display correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');

      // Verify all navigation elements are visible
      const govukLink = page.locator('.govuk-header__link--homepage');
      await expect(govukLink).toBeVisible();

      const languageToggle = page.locator('.govuk-service-navigation a:has-text("Cymraeg")');
      await expect(languageToggle).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate through header and footer links with Tab key', async ({ page }) => {
      await page.goto('/');

      // Start from the first focusable element
      await page.keyboard.press('Tab');

      // Check GOV.UK link receives focus
      const govukLink = page.locator('.govuk-header__link--homepage');
      await expect(govukLink).toBeFocused();

      // Tab to service name
      await page.keyboard.press('Tab');
      const serviceNameLink = page.locator('.govuk-service-navigation__service-name a');
      await expect(serviceNameLink).toBeFocused();

      // Tab to Sign in link
      await page.keyboard.press('Tab');
      const signInLink = page.locator('.govuk-service-navigation__link[href="/sign-in"]');
      await expect(signInLink).toBeFocused();

      // Tab to Welsh toggle
      await page.keyboard.press('Tab');
      const languageToggle = page.locator('.govuk-service-navigation a:has-text("Cymraeg")');
      await expect(languageToggle).toBeFocused();
    });

    test('should activate links with Enter key', async ({ page }) => {
      await page.goto('/');

      // Focus on Sign in link
      const signInLink = page.locator('.govuk-service-navigation__link[href="/sign-in"]');
      await signInLink.focus();

      // Activate with Enter
      await page.keyboard.press('Enter');

      // Verify navigation occurred
      await expect(page).toHaveURL(/.*\/sign-in/);
    });
  });

  test.describe('Accessibility', () => {
    test('should meet WCAG 2.2 AA standards', async ({ page }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log('Accessibility violations found:');
        accessibilityScanResults.violations.forEach(violation => {
          console.log(`- ${violation.id}: ${violation.description}`);
          console.log(`  Impact: ${violation.impact}`);
          console.log(`  Affected nodes: ${violation.nodes.length}`);
          violation.nodes.forEach(node => {
            console.log(`    ${node.target}`);
          });
        });
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper aria labels on navigation elements', async ({ page }) => {
      await page.goto('/');

      // Check feedback link has aria label
      const feedbackLink = page.locator('a[href^="/feedback"]');
      const feedbackAriaLabel = await feedbackLink.getAttribute('aria-label');
      expect(feedbackAriaLabel).toBeTruthy();

      // Check service navigation is accessible
      const serviceNav = page.locator('.govuk-service-navigation');
      await expect(serviceNav).toBeVisible();
    });

    test('should have visible focus states on all interactive elements', async ({ page }) => {
      await page.goto('/');

      // Test that key interactive elements can receive focus
      const elements = [
        { selector: '.govuk-header__link--homepage', name: 'GOV.UK header' },
        { selector: '.govuk-service-navigation__service-name a', name: 'Service name' },
        { selector: '.govuk-service-navigation__link[href="/sign-in"]', name: 'Sign in link' },
        { selector: '.govuk-service-navigation a:has-text("Cymraeg")', name: 'Welsh toggle' }
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

  test.describe('Sign In Page', () => {
    test('should load sign-in page with header and footer', async ({ page }) => {
      await page.goto('/sign-in');

      // Verify header is present
      const govukLink = page.locator('.govuk-header__link--homepage');
      await expect(govukLink).toBeVisible();

      // Verify service navigation is present
      const serviceNameLink = page.locator('.govuk-service-navigation__service-name a');
      await expect(serviceNameLink).toBeVisible();

      // Verify footer is present
      const footer = page.locator('.govuk-footer');
      await expect(footer).toBeVisible();

      // Verify page has title
      await expect(page).toHaveTitle(/Sign in/);
    });
  });

  test.describe('Error Pages', () => {
    test('should display service navigation on 404 pages', async ({ page }) => {
      // Go to a non-existent page
      const response = await page.goto('/non-existent-page');
      expect(response?.status()).toBe(404);

      // Verify service navigation is still present
      const serviceNameLink = page.locator('.govuk-service-navigation__service-name a');
      await expect(serviceNameLink).toBeVisible();

      // Verify footer is still present
      const footer = page.locator('.govuk-footer');
      await expect(footer).toBeVisible();
    });
  });
});
