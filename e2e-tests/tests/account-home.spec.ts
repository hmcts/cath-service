import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithCftIdam } from "../utils/cft-idam-helpers.js";

test.describe("Account Home Page", () => {
  test("user can sign in and view account home page @nightly", async ({ page }) => {
    // Sign in with CFT IDAM
    await page.goto("/sign-in");
    await page.getByRole("radio", { name: /with a myhmcts account/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();
    await loginWithCftIdam(page, process.env.CFT_VALID_TEST_ACCOUNT!, process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!);
    await expect(page).toHaveURL(/\/account-home/);

    // Check page content
    await expect(page).toHaveTitle(/Dashboard - Your account/i);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your account");

    // Check three account sections are present with correct headings and links
    const sectionBoxes = page.locator(".verified-tile");
    await expect(sectionBoxes).toHaveCount(3);

    await expect(sectionBoxes.first().locator("h2")).toHaveText("Court and tribunal hearings");
    await expect(sectionBoxes.first()).toHaveAttribute("href", "/search");

    await expect(sectionBoxes.nth(1).locator("h2")).toHaveText("Single Justice Procedure cases");
    await expect(sectionBoxes.nth(1)).toHaveAttribute("href", "/summary-of-publications?locationId=9");

    await expect(sectionBoxes.nth(2).locator("h2")).toHaveText("Email subscriptions");
    await expect(sectionBoxes.nth(2)).toHaveAttribute("href", "/subscription-management");

    // Accessibility check
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["region"]) // Region/landmark issues are template-level, not page-specific
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Welsh translation
    await page.goto("/account-home?lng=cy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Eich cyfrif");
    await expect(sectionBoxes.first().locator("h2")).toHaveText("Gwrandawiadau llys a thribiwnlys");
    await expect(sectionBoxes.nth(1).locator("h2")).toHaveText("Achosion Gweithdrefn Ynad Unigol");
    await expect(sectionBoxes.nth(2).locator("h2")).toHaveText("Tanysgrifiadau e-bost");

    // Navigate to court hearings section
    await page.goto("/account-home");
    await sectionBoxes.first().click();
    await expect(page).toHaveURL("/search");
  });
});
