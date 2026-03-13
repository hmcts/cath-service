import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Crime IDAM", () => {
  test("valid user can sign in via Crime IDAM @nightly", async ({ page }) => {
    await page.goto("/sign-in");

    // Select Common Platform option
    await page.getByRole("radio", { name: /with a common platform account/i }).check();
    await page.getByRole("button", { name: /continue/i }).click();

    // Should redirect to Crime IDAM login
    await expect(page).toHaveURL(/login\.sit\.cjscp\.org\.uk/);

    // Perform Crime IDAM login
    const emailInput = page.locator('input[name="IDToken1"], input[type="text"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 10000 });
    await emailInput.fill(process.env.CRIME_IDAM_VALID_TEST_ACCOUNT!);

    const passwordInput = page.locator('input[name="IDToken2"], input[type="password"]').first();
    await passwordInput.fill(process.env.CRIME_IDAM_VALID_TEST_ACCOUNT_PASSWORD!);

    await page.locator('input[type="submit"], button[type="submit"]').first().click();

    // Should redirect to account-home
    await expect(page).toHaveURL(/\/account-home/, { timeout: 30000 });

    // Test Welsh toggle while authenticated
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await expect(page).toHaveURL(/lng=cy/);

    // Accessibility check
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("crime-rejected page displays correct content and supports Welsh @nightly", async ({ page }) => {
    // English
    await page.goto("/crime-rejected");

    await expect(page.getByRole("heading", { name: /you cannot access this service/i })).toBeVisible();
    await expect(page.getByText(/your account type is not authorized/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /return to sign in page/i })).toHaveAttribute("href", "/sign-in");

    // Accessibility check
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Welsh
    await page.goto("/crime-rejected?lng=cy");

    await expect(page.getByRole("heading", { name: /ni allwch gael mynediad/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /yn ôl i'r dudalen fewngofnodi/i })).toHaveAttribute("href", "/sign-in");
  });

  test("callback handles missing code and invalid state gracefully", async ({ page }) => {
    // Missing code
    await page.goto("/crime-login/return");
    await expect(page).toHaveURL(/\/sign-in\?error=no_code/);

    // Invalid state (no session state set)
    await page.goto("/crime-login/return?code=some-code&state=wrong-state");
    await expect(page).toHaveURL(/\/sign-in\?error=invalid_state/);
  });

  test("language parameter is preserved through Crime IDAM redirect", async ({ page }) => {
    await page.goto("/sign-in?lng=cy");

    await expect(page.getByRole("heading", { name: /sut hoffech chi fewngofnodi/i })).toBeVisible();

    await page.getByRole("radio", { name: /gyda chyfrif common platform/i }).check();
    await page.getByRole("button", { name: /parhau/i }).click();

    // Language parameter should be passed to Crime IDAM
    await expect(page).toHaveURL(/ui_locales=cy/);
  });
});
