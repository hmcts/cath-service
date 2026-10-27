import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { axeCheck } from "../../utils/axe-helper.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";
import { prefixName } from "../../utils/test-prefix.js";
import { createTestThirdPartyUser, deleteTestThirdPartyUser } from "../../utils/test-support-api.js";

test.describe("Third party subscriber status", () => {
  test("admin can change a third party subscriber status", async ({ page }) => {
    const subscriber = await createTestThirdPartyUser({ name: prefixName("Status Test Corp") });
    const manageUrl = `/third-party-subscribers/${subscriber.id}/manage`;
    const statusUrl = `/third-party-subscribers/${subscriber.id}/status`;

    try {
      await authenticateSystemAdmin(page);

      // A new subscriber defaults to Pending
      await page.goto(manageUrl);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage subscriber");
      await expect(statusRowValue(page)).toHaveText("Pending");

      const manageResults = await axeCheck(page).analyze();
      expect(manageResults.violations).toEqual([]);

      // Change link opens the status page with the current status pre-selected
      await page.getByRole("link", { name: "Change Status" }).click();
      await page.waitForURL(`**${statusUrl}`);
      await expect(page).toHaveTitle(/Manage subscriber status/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage subscriber status");
      await expect(page.getByRole("radio", { name: "Pending" })).toBeChecked();
      await expect(page.getByRole("radio", { name: "Active" })).not.toBeChecked();
      await expect(page.getByRole("radio", { name: "Suspended" })).not.toBeChecked();

      const statusResults = await axeCheck(page).analyze();
      expect(statusResults.violations).toEqual([]);

      // Welsh
      await page.getByRole("link", { name: "Cymraeg" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rheoli statws tanysgrifwr");
      await expect(page.getByRole("group", { name: "Statws" })).toBeVisible();
      await expect(page.getByRole("radio", { name: "Yn yr arfaeth" })).toBeChecked();
      await expect(page.getByRole("radio", { name: "Gweithredol" })).toBeVisible();
      await expect(page.getByRole("radio", { name: "Wedi'i atal" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Cadarnhau" })).toBeVisible();
      await page.getByRole("link", { name: "English" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage subscriber status");

      // Cancel returns to the Manage page without saving
      await page.getByRole("radio", { name: "Suspended" }).check();
      await page.getByRole("button", { name: "Cancel" }).click();
      await page.waitForURL(`**${manageUrl}`);
      await expect(statusRowValue(page)).toHaveText("Pending");

      // Confirm saves the new status
      await page.getByRole("link", { name: "Change Status" }).click();
      await page.waitForURL(`**${statusUrl}`);
      // Select Active with the keyboard
      await page.getByRole("radio", { name: "Active" }).focus();
      await page.keyboard.press("Space");
      await expect(page.getByRole("radio", { name: "Active" })).toBeChecked();
      await page.getByRole("button", { name: "Confirm" }).click();

      await page.waitForURL(`**${statusUrl}/success`);
      const panel = page.locator(".govuk-panel--confirmation");
      await expect(panel).toContainText("Third party account status updated");
      await expect(panel).toContainText("Third party account status has been successfully updated.");
      await expect(page.getByText("To further update third party account, you can go to:")).toBeVisible();

      const successResults = await axeCheck(page).analyze();
      expect(successResults.violations).toEqual([]);

      await page.getByRole("link", { name: "Cymraeg" }).click();
      await expect(panel).toContainText("Statws cyfrif trydydd parti wedi'i ddiweddaru");
      await expect(page.getByRole("link", { name: "Rheoli tanysgrifwyr trydydd parti" })).toBeVisible();
      await page.getByRole("link", { name: "English" }).click();

      // The list link leads back to the subscriber, now Active
      await page.getByRole("link", { name: "Manage third party subscribers" }).click();
      await page.waitForURL("**/third-party-subscribers");
      await page.getByRole("row", { name: subscriber.name }).getByRole("link", { name: "Manage" }).click();
      await page.waitForURL(`**${manageUrl}`);
      await expect(statusRowValue(page)).toHaveText("Active");
    } finally {
      await deleteTestThirdPartyUser(subscriber.id);
    }
  });
});

async function authenticateSystemAdmin(page: Page) {
  const email = process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL;
  const password = process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Missing required environment variables: SSO_TEST_SYSTEM_ADMIN_EMAIL, SSO_TEST_SYSTEM_ADMIN_PASSWORD");
  }

  await page.goto("/system-admin-dashboard");
  if (page.url().includes("login.microsoftonline.com")) {
    await loginWithSSO(page, email, password);
  }
  await page.waitForURL("**/system-admin-dashboard");
}

function statusRowValue(page: Page) {
  return page
    .locator(".govuk-summary-list__row")
    .filter({ has: page.locator(".govuk-summary-list__key", { hasText: "Status" }) })
    .locator(".govuk-summary-list__value");
}
