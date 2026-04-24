import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithCftIdam } from "../../utils/cft-idam-helpers.js";

test.describe("Account Home", () => {
  test("verified user can view account home and navigate to all sections with Welsh and accessibility", async ({ page }) => {
    // STEP 1: Authenticate via CFT IDAM
    await page.goto("/sign-in");
    const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    await page.getByRole("button", { name: /continue/i }).click();
    await loginWithCftIdam(page, process.env.CFT_VALID_TEST_ACCOUNT!, process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!);
    await expect(page).toHaveURL(/\/account-home/);

    // STEP 2: Verify page title and main heading
    await expect(page).toHaveTitle(/Dashboard - Your account/i);
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("Your account");

    // STEP 3: Verify three account section tiles exist
    const sectionBoxes = page.locator(".verified-tile");
    await expect(sectionBoxes).toHaveCount(3);

    // STEP 4: Verify Court and Tribunal Hearings section
    const courtSection = sectionBoxes.nth(0);
    await expect(courtSection.locator("h2")).toHaveText("Court and tribunal hearings");
    await expect(courtSection.locator("p.verified-tile-description")).toHaveText("View time, location, type of hearings and more.");
    await expect(courtSection).toHaveAttribute("href", "/search");

    // STEP 5: Verify Single Justice Procedure Cases section
    const sjpSection = sectionBoxes.nth(1);
    await expect(sjpSection.locator("h2")).toHaveText("Single Justice Procedure cases");
    await expect(sjpSection.locator("p.verified-tile-description")).toContainText("Cases ready to be decided by a magistrate");
    await expect(sjpSection).toHaveAttribute("href", "/summary-of-publications?locationId=9");

    // STEP 6: Verify Email Subscriptions section
    const emailSection = sectionBoxes.nth(2);
    await expect(emailSection.locator("h2")).toHaveText("Email subscriptions");
    await expect(emailSection.locator("p.verified-tile-description")).toContainText("Get emails about hearings");
    await expect(emailSection).toHaveAttribute("href", "/subscription-management");

    // STEP 7: Test accessibility
    let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 8: Test Welsh content
    await page.goto("/account-home?lng=cy");
    await expect(page.locator("h1")).toHaveText("Eich cyfrif");
    await expect(sectionBoxes.nth(0).locator("h2")).toHaveText("Gwrandawiadau llys a thribiwnlys");
    await expect(sectionBoxes.nth(1).locator("h2")).toHaveText("Achosion Gweithdrefn Ynad Unigol");
    await expect(sectionBoxes.nth(2).locator("h2")).toHaveText("Tanysgrifiadau e-bost");

    // Welsh descriptions
    await expect(sectionBoxes.nth(0).locator("p.verified-tile-description")).toHaveText("Gweld amser, lleoliad, math o wrandawiadau a mwy.");
    await expect(sectionBoxes.nth(2).locator("p.verified-tile-description")).toContainText("Cael e-byst am wrandawiadau");

    // STEP 9: Test navigation to Court and Tribunal Hearings
    await page.goto("/account-home");
    await courtSection.click();
    await expect(page).toHaveURL("/search");

    // STEP 10: Test navigation to SJP Cases
    await page.goto("/account-home");
    await sjpSection.click();
    await expect(page).toHaveURL("/summary-of-publications?locationId=9");

    // STEP 11: Test navigation to Email Subscriptions
    await page.goto("/account-home");
    await emailSection.click();
    await expect(page).toHaveURL("/subscription-management");

    // STEP 12: Test keyboard accessibility
    await page.goto("/account-home");
    const firstBox = page.locator(".verified-tile").first();

    // Tab to first box
    let attempts = 0;
    while (attempts < 20) {
      await page.keyboard.press("Tab");
      const isFocused = await firstBox.evaluate((el) => document.activeElement === el);
      if (isFocused) break;
      attempts++;
    }
    await expect(firstBox).toBeFocused();

    // Navigate with Enter key
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/search");
  });
});
