import { expect, type Page, test } from "@playwright/test";
import { axeCheck } from "../utils/axe-helper.js";
import { loginWithSSO } from "../utils/sso-helpers.js";
import { createVerifiedTestUser, loginAsTestUser } from "../utils/verified-user-helpers.js";

// Only the browser clock is faked. The server session is still valid when the client countdown
// ends, so /session-expired-logout signs out through the provider exactly as it does in real use.
const VERIFIED_IDLE = "40:00";
const ADMIN_IDLE = "03:40:00";
const COUNTDOWN = "20:00";
const HEADING = "You're about to be signed out due to inactivity.";

function timeoutDialog(page: Page) {
  return page.getByRole("dialog");
}

// target-size and link-name: known site-wide footer issues (see courts-tribunals-list.spec.ts).
// region: the dialog sits in the top layer outside the page landmarks, as a modal dialog should.
async function expectAccessible(page: Page) {
  const results = await axeCheck(page).disableRules(["target-size", "link-name", "region"]).analyze();
  expect(results.violations).toEqual([]);
}

test.describe("Session timeout warning", () => {
  test("verified user is warned before being signed out, can extend the session and is told why they were signed out @nightly", async ({ page }) => {
    await loginAsTestUser(page, await createVerifiedTestUser({ provenance: "CRIME_IDAM", label: "session-timeout" }));
    await page.clock.install();
    await page.goto("/account-home?lng=en");

    // No warning before 40 minutes of inactivity
    await page.clock.fastForward("39:30");
    await expect(timeoutDialog(page)).toBeHidden();

    // Warning opens with focus on its heading and a 20 minute countdown
    await page.clock.fastForward("00:30");
    const dialog = page.getByRole("dialog", { name: HEADING });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { level: 2 })).toBeFocused();
    await expect(dialog).toContainText(/For your security, you will be signed out in 19 minutes \d+ seconds\./);
    await expect(dialog.locator("[aria-live='polite']")).toContainText("For your security, you will be signed out in");
    await expectAccessible(page);

    // Escape keeps the user signed in rather than silently closing the warning
    const escapeKeepAlive = page.waitForResponse((response) => response.url().endsWith("/session-keep-alive"));
    await page.keyboard.press("Escape");
    expect((await escapeKeepAlive).status()).toBe(204);
    await expect(timeoutDialog(page)).toBeHidden();
    await expect(page).toHaveURL(/\/account-home/);

    // Welsh warning, extended with the Continue button
    await page.goto("/account-home?lng=cy");
    await page.clock.fastForward(VERIFIED_IDLE);
    await expect(timeoutDialog(page)).toBeVisible();
    const continueKeepAlive = page.waitForResponse((response) => response.url().endsWith("/session-keep-alive"));
    await timeoutDialog(page).getByRole("button", { name: "Parhau" }).click();
    expect((await continueKeepAlive).status()).toBe(204);
    await expect(timeoutDialog(page)).toBeHidden();

    // Let the countdown run out
    await page.goto("/account-home?lng=en");
    await page.clock.fastForward(VERIFIED_IDLE);
    await expect(timeoutDialog(page)).toBeVisible();
    await page.clock.fastForward(COUNTDOWN);

    await expect(page).toHaveURL(/\/session-expired\?lng=en&reSignInUrl=CRIME/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("You have been signed out, due to inactivity.");
    await expectAccessible(page);

    // Really signed out
    await page.goto("/account-home");
    await expect(page).not.toHaveURL(/\/account-home/);
  });

  test("system admin is warned before being signed out and can extend the session @nightly", async ({ page }) => {
    // Return straight from the Microsoft logout endpoint to the post-logout page, as Entra ID does
    await page.route(/login\.microsoftonline\.com\/.*\/logout/, async (route) => {
      const postLogout = new URL(route.request().url()).searchParams.get("post_logout_redirect_uri") ?? "/";
      await route.fulfill({ status: 302, headers: { location: postLogout } });
    });

    await page.clock.install();
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
    await page.goto("/system-admin-dashboard");

    await page.clock.fastForward(ADMIN_IDLE);
    const dialog = page.getByRole("dialog", { name: HEADING });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { level: 2 })).toBeFocused();
    await expectAccessible(page);

    // Keyboard: Tab from the heading reaches Continue inside the dialog
    await page.keyboard.press("Tab");
    const continueButton = dialog.getByRole("button", { name: "Continue" });
    await expect(continueButton).toBeFocused();
    const keepAlive = page.waitForResponse((response) => response.url().endsWith("/session-keep-alive"));
    await page.keyboard.press("Enter");
    expect((await keepAlive).status()).toBe(204);
    await expect(timeoutDialog(page)).toBeHidden();

    // Countdown runs out: signed out with the inactivity message and an SSO sign in button
    await page.clock.fastForward(ADMIN_IDLE);
    await expect(timeoutDialog(page)).toBeVisible();
    await page.clock.fastForward(COUNTDOWN);

    await expect(page).toHaveURL(/\/session-expired\?lng=en&reSignInUrl=SSO/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("You have been signed out, due to inactivity.");
    await expect(page.getByRole("button", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });
});
