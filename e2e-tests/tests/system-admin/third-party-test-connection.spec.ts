import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { axeCheck } from "../../utils/axe-helper.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";
import { getTestPrefix } from "../../utils/test-prefix.js";
import { createTestThirdPartyUser } from "../../utils/test-support-api.js";

const OAUTH_CLIENT_ID_ENV = "CATH_SERVICE_API_CLIENT_ID";
const OAUTH_CLIENT_SECRET_ENV = "CATH_SERVICE_API_CLIENT_SECRET";
const DESTINATION_URL_ENV = "THIRD_PARTY_TEST_CONNECTION_URL";

test.describe("Third party test connection", () => {
  test.skip(!process.env[DESTINATION_URL_ENV], `${DESTINATION_URL_ENV} is not set, so there is no reachable testing-support endpoint to test against`);

  test.beforeEach(async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
  });

  test("system admin can test a third party subscriber connection", async ({ page }) => {
    const oauth = readOauthSettings();
    const subscriber = await createTestThirdPartyUser({ name: `${getTestPrefix()}Test Connection Corp` });
    const manageUrl = `/third-party-subscribers/${subscriber.id}/manage`;

    try {
      // Button sits above the summary list
      await page.goto(manageUrl);
      const testButton = page.getByRole("button", { name: "Test connection" });
      await expect(testButton).toBeVisible();
      await expect(testButton).not.toHaveClass(/govuk-button--(secondary|warning)/);
      const buttonBox = await testButton.boundingBox();
      const summaryBox = await page.locator(".govuk-summary-list").boundingBox();
      expect(buttonBox!.y).toBeLessThan(summaryBox!.y);
      expect((await axeCheck(page).analyze()).violations).toEqual([]);

      // No OAuth configuration saved: red failure box, no outbound call
      await testButton.click();
      const banner = page.locator(".connection-result");
      await expect(banner).toHaveClass(/connection-result--fail/);
      await expect(banner).toContainText("Failed");
      await expect(banner).toContainText("No OAuth configuration found. Please supply valid OAuth configuration to enable connection.");
      await expect(page.getByRole("button", { name: "Test connection" })).toBeVisible();
      expect((await axeCheck(page).analyze()).violations).toEqual([]);

      // Welsh: the language link is a GET, so switch first and then run the test again
      await page.getByRole("link", { name: "Cymraeg" }).click();
      await page.getByRole("button", { name: "Profi cysylltiad" }).click();
      await expect(banner).toContainText("Methodd");
      await expect(banner).toContainText("Heb ddod o hyd i ffurfweddiad OAuth.");
      expect((await axeCheck(page).analyze()).violations).toEqual([]);
      await page.getByRole("link", { name: "English" }).click();

      // Save the OAuth configuration through the UI so the secrets are written as in production
      await page.getByRole("button", { name: "Manage OAuth configuration" }).click();
      await page.waitForURL(`**/third-party-subscribers/${subscriber.id}/oauth-config`);
      await page.getByLabel("Destination URL").fill(oauth.destinationUrl);
      await page.getByLabel("Token URL").fill(oauth.tokenUrl);
      await page.getByLabel("Scope").fill(oauth.scope);
      await page.getByLabel("Client ID").fill(oauth.clientId);
      await page.locator("#clientSecret").fill(oauth.clientSecret);
      await page.getByRole("button", { name: /^(Create|Update)$/ }).click();
      await page.waitForURL(`**/third-party-subscribers/${subscriber.id}/oauth-config/summary`);
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForURL(`**/third-party-subscribers/${subscriber.id}/oauth-config/success`);

      // Configured against the testing-support endpoint: green success box
      await page.goto(manageUrl);
      await page.getByRole("button", { name: "Test connection" }).click();
      await expect(banner).toHaveClass(/connection-result--success/);
      await expect(banner).toContainText("Succeeded");
      await expect(banner).toContainText("Connection to third party succeeded.");
      expect((await axeCheck(page).analyze()).violations).toEqual([]);
    } finally {
      await deleteSubscriberThroughUi(page, subscriber.id);
    }
  });
});

function readOauthSettings() {
  const clientId = process.env[OAUTH_CLIENT_ID_ENV];
  const clientSecret = process.env[OAUTH_CLIENT_SECRET_ENV];
  const tenantId = process.env.AZURE_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error(`${DESTINATION_URL_ENV} is set, so AZURE_TENANT_ID, ${OAUTH_CLIENT_ID_ENV} and ${OAUTH_CLIENT_SECRET_ENV} must be set too`);
  }

  return {
    destinationUrl: process.env[DESTINATION_URL_ENV]!,
    tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    scope: `${clientId}/.default`,
    clientId,
    clientSecret
  };
}

// The delete flow is the only path that removes the Key Vault secrets; prefix-based teardown only removes the database row
async function deleteSubscriberThroughUi(page: Page, subscriberId: string) {
  await page.goto(`/third-party-subscribers/${subscriberId}/delete/confirmation`);
  await page.getByRole("radio", { name: "Yes" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(`**/third-party-subscribers/${subscriberId}/delete/success`);
}
