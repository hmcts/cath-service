import { expect, test } from "@playwright/test";
import { axeCheck } from "../../utils/axe-helper.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";
import { getTestPrefix } from "../../utils/test-prefix.js";
import { createTestThirdPartyUser, deleteTestThirdPartyUser, getTestThirdPartyUser } from "../../utils/test-support-api.js";

test.describe("Third party subscriber status", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
  });

  test("system admin can change a third party subscriber's status @nightly", async ({ page }) => {
    const subscriber = await createTestThirdPartyUser({ name: `${getTestPrefix()}Status Corp` });
    const manageUrl = `/third-party-subscribers/${subscriber.id}/manage`;
    const statusUrl = `/third-party-subscribers/${subscriber.id}/status`;
    const statusRow = page.locator(".govuk-summary-list__row").filter({ has: page.locator(".govuk-summary-list__key", { hasText: /^\s*Status\s*$/ }) });

    try {
      // A new subscriber defaults to Pending
      await page.goto(manageUrl);
      await expect(statusRow.locator(".govuk-summary-list__value")).toHaveText("Pending");

      // Change link opens the status page with the current status pre-selected
      await page.getByRole("link", { name: "Change Status" }).click();
      await page.waitForURL(`**${statusUrl}`);
      await expect(page).toHaveTitle(/Manage User Status/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage User Status");
      const statusSelect = page.getByLabel("Status", { exact: true });
      await expect(statusSelect).toHaveValue("PENDING");
      await expect(page.getByRole("radio")).toHaveCount(0);
      expect((await axeCheck(page).analyze()).violations).toEqual([]);

      // Cancel returns to the manage page without saving
      await statusSelect.selectOption("SUSPENDED");
      await page.getByRole("button", { name: "Cancel" }).click();
      await page.waitForURL(`**${manageUrl}`);
      await expect(statusRow.locator(".govuk-summary-list__value")).toHaveText("Pending");

      // Welsh
      await page.getByRole("link", { name: "Change Status" }).click();
      await page.waitForURL(`**${statusUrl}`);
      await page.getByRole("link", { name: "Cymraeg" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rheoli Statws Defnyddiwr");
      await expect(page.getByLabel("Statws", { exact: true })).toHaveValue("PENDING");
      await expect(page.getByRole("button", { name: "Cadarnhau" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Canslo" })).toHaveAttribute("href", `${manageUrl}?lng=cy`);
      expect((await axeCheck(page).analyze()).violations).toEqual([]);
      await page.getByRole("link", { name: "English" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage User Status");

      // Confirm Active using the keyboard
      await page.getByLabel("Status", { exact: true }).selectOption("ACTIVE");
      await page.getByRole("button", { name: "Confirm" }).focus();
      await page.keyboard.press("Enter");
      await page.waitForURL(`**${statusUrl}/success`);
      await expect(page.locator(".govuk-panel__title")).toHaveText("Third Party Account Status Updated");
      await expect(page.locator(".govuk-panel__body")).toHaveText("Third party account status has been successfully updated.");
      await expect(page.getByText("To further update third party account, you can go to:")).toBeVisible();
      expect((await axeCheck(page).analyze()).violations).toEqual([]);

      // Success link goes to the subscriber list
      await page.getByRole("link", { name: "Manage third party subscriber" }).click();
      await page.waitForURL("**/third-party-subscribers");

      // The new status is saved and shown on the manage page
      expect((await getTestThirdPartyUser(subscriber.id)).status).toBe("ACTIVE");
      await page.goto(manageUrl);
      await expect(statusRow.locator(".govuk-summary-list__value")).toHaveText("Active");
    } finally {
      await deleteTestThirdPartyUser(subscriber.id);
    }
  });
});
