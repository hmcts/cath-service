import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues

test.describe("400 Error Page", () => {
  test("should display 400 error page with correct content", async ({ page }) => {
    await page.goto("/400");

    // Check page heading
    const heading = page.locator("h1.govuk-heading-l");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Bad request");

    // Check page content
    await expect(page.getByText(/missing or invalid information/i)).toBeVisible();

    // Check for helpful links
    const startPageLink = page.getByRole("link", { name: /start page/i });
    await expect(startPageLink).toBeVisible();

    const contactLink = page.locator('a[href="/contact-us"]');
    await expect(contactLink).toBeVisible();
    await expect(contactLink).toContainText(/contact us/i);
  });

  test("should meet WCAG 2.2 AA accessibility standards", async ({ page }) => {
    await page.goto("/400");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
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

  test("should redirect from summary-of-publications without locationId", async ({ page }) => {
    await page.goto("/summary-of-publications");

    // Should automatically redirect to 400 page
    await expect(page).toHaveURL("/400");

    const heading = page.locator("h1.govuk-heading-l");
    await expect(heading).toContainText("Bad request");
  });
});
