import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Cookie Management", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("cookie banner journey - display, accept/reject, persistence, and accessibility", async ({ page }) => {
    // STEP 1: Verify cookie banner displays on first visit
    await page.goto("/");
    const cookieBanner = page.locator(".govuk-cookie-banner");
    await expect(cookieBanner).toBeVisible();
    await expect(cookieBanner).toContainText("Cookies on this service");
    await expect(cookieBanner).toContainText("We use some essential cookies to make this service work");

    // Verify banner has proper ARIA attributes for accessibility
    await expect(cookieBanner).toHaveAttribute("role", "region");
    await expect(cookieBanner).toHaveAttribute("aria-label", "Cookies on this service");

    // Verify buttons are present
    const acceptButton = cookieBanner.locator('button:has-text("Accept analytics cookies")');
    const rejectButton = cookieBanner.locator('button:has-text("Reject analytics cookies")');
    const viewCookiesLink = cookieBanner.locator('a:has-text("View cookies")');
    await expect(acceptButton).toBeVisible();
    await expect(rejectButton).toBeVisible();
    await expect(viewCookiesLink).toBeVisible();

    // STEP 2: Test "View cookies" link navigation
    await viewCookiesLink.click();
    await expect(page).toHaveURL("/cookie-preferences");
    await expect(page.locator("h1")).toHaveText("Cookie preferences");

    // Cookie banner should not be visible on the cookies page itself
    await expect(cookieBanner).not.toBeVisible();

    // STEP 3: Go back and test accepting cookies
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator('button:has-text("Accept analytics cookies")').click();
    await page.waitForTimeout(1000);

    // Verify cookie was set with accepted state
    let cookies = await page.context().cookies();
    let cookiePolicy = cookies.find((c) => c.name === "cookie_policy");
    expect(cookiePolicy).toBeDefined();
    let policyValue = decodeURIComponent(cookiePolicy!.value);
    expect(policyValue).toContain('"analytics":"on"');

    // Navigate away and back - banner should stay hidden
    await page.goto("/cookie-preferences");
    await page.goto("/");
    await expect(page.locator(".govuk-cookie-banner")).not.toBeVisible();

    // STEP 4: Clear cookies and test rejecting cookies
    await page.context().clearCookies();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator('button:has-text("Reject analytics cookies")').click();
    await page.waitForTimeout(1000);

    // Verify cookie was set with rejected state
    cookies = await page.context().cookies();
    cookiePolicy = cookies.find((c) => c.name === "cookie_policy");
    expect(cookiePolicy).toBeDefined();
    policyValue = decodeURIComponent(cookiePolicy!.value);
    expect(policyValue).toContain('"analytics":"off"');

    // Banner should stay hidden after navigation
    await page.goto("/cookie-preferences");
    await page.goto("/");
    await expect(page.locator(".govuk-cookie-banner")).not.toBeVisible();

    // STEP 5: Test JavaScript button classes (alternative selectors)
    await page.context().clearCookies();
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const jsAcceptButton = page.locator(".js-cookie-banner-accept");
    await jsAcceptButton.click();
    await page.waitForTimeout(1000);

    cookies = await page.context().cookies();
    cookiePolicy = cookies.find((c) => c.name === "cookie_policy");
    expect(cookiePolicy).toBeDefined();
    policyValue = decodeURIComponent(cookiePolicy!.value);
    expect(policyValue).toMatch(/"analytics":(?:true|"on")/);
  });

  test("cookie preferences page journey - form, save, persistence, Welsh, and accessibility", async ({ page }) => {
    // STEP 1: Navigate to cookie preferences and verify form structure
    await page.goto("/cookie-preferences");
    await expect(page.locator("h1")).toHaveText("Cookie preferences");

    // Verify all sections are visible
    await expect(page.locator("text=Essential cookies")).toBeVisible();
    await expect(page.locator("text=These cookies are necessary for the service to function")).toBeVisible();
    await expect(page.locator('h2:has-text("Analytics cookies")')).toBeVisible();
    await expect(page.locator("text=help us understand how you use the service").first()).toBeVisible();
    await expect(page.locator('h2:has-text("Settings cookies")')).toBeVisible();
    await expect(page.locator("text=remember your settings and preferences").first()).toBeVisible();

    // Verify radio buttons exist
    const analyticsYes = page.locator("#analytics-yes");
    const analyticsNo = page.locator("#analytics-no");
    const preferencesYes = page.locator("#preferences-yes");
    const preferencesNo = page.locator("#preferences-no");
    await expect(analyticsYes).toBeVisible();
    await expect(analyticsNo).toBeVisible();
    await expect(preferencesYes).toBeVisible();
    await expect(preferencesNo).toBeVisible();

    // Verify save button
    const saveButton = page.locator('button:has-text("Save cookie preferences")');
    await expect(saveButton).toBeVisible();

    // STEP 2: Verify form accessibility - check for proper structure
    const form = page.locator("form");
    await expect(form).toBeVisible();

    // Check fieldsets have legends
    const fieldsets = page.locator("fieldset");
    const fieldsetCount = await fieldsets.count();
    for (let i = 0; i < fieldsetCount; i++) {
      const fieldset = fieldsets.nth(i);
      const legend = fieldset.locator("legend");
      await expect(legend).toBeVisible();
    }

    // Check radio buttons have labels
    const radios = page.locator('input[type="radio"]');
    const radioCount = await radios.count();
    for (let i = 0; i < radioCount; i++) {
      const radio = radios.nth(i);
      const id = await radio.getAttribute("id");
      const label = page.locator(`label[for="${id}"]`);
      await expect(label).toBeVisible();
    }

    // STEP 3: Save preferences and verify they persist
    await analyticsYes.check();
    await preferencesNo.check();
    await saveButton.click();
    await page.waitForTimeout(1000);

    // Verify cookie was saved correctly
    const cookies = await page.context().cookies();
    const cookiePolicy = cookies.find((c) => c.name === "cookie_policy");
    expect(cookiePolicy).toBeDefined();

    // Decode cookie value (may be double-encoded)
    let decodedValue = cookiePolicy!.value;
    let policyValue: { analytics: string; preferences: string };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        policyValue = JSON.parse(decodedValue);
        break;
      } catch {
        decodedValue = decodeURIComponent(decodedValue);
      }
    }
    expect(policyValue!.analytics).toBe("on");
    expect(policyValue!.preferences).toBe("off");

    // STEP 4: Verify preferences persist after navigation
    await page.goto("/");
    await page.goto("/cookie-preferences");
    await expect(analyticsYes).toBeChecked();
    await expect(preferencesNo).toBeChecked();
    await expect(analyticsNo).not.toBeChecked();
    await expect(preferencesYes).not.toBeChecked();

    // STEP 5: Test Welsh language support
    await page.goto("/cookie-preferences?lng=cy");
    await expect(page.locator("h1")).toHaveText("Dewisiadau cwcis");
    await expect(page.locator('h2:has-text("Cwcis hanfodol")')).toBeVisible();
    await expect(page.locator('h2:has-text("Cwcis dadansoddi")')).toBeVisible();
    await expect(page.locator('h2:has-text("Cwcis gosodiadau")')).toBeVisible();

    // Verify Welsh button and save preferences
    const welshSaveButton = page.locator('button:has-text("Cadw dewisiadau cwcis")');
    await expect(welshSaveButton).toBeVisible();
    await page.locator("#analytics-yes").check();
    await welshSaveButton.click();
    await page.waitForTimeout(1000);

    // Verify cookie was saved in Welsh mode
    const welshCookies = await page.context().cookies();
    const welshCookiePolicy = welshCookies.find((c) => c.name === "cookie_policy");
    expect(welshCookiePolicy).toBeDefined();

    // STEP 6: Run accessibility scan
    await page.goto("/cookie-preferences");
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
