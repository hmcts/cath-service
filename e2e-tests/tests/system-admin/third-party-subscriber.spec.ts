import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { axeCheck } from "../../utils/axe-helper.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";
import { getTestPrefix } from "../../utils/test-prefix.js";
import { findTestThirdPartyUserByName, getTestThirdPartyUser } from "../../utils/test-support-api.js";

// Dummy values: the journey stops at the summary page, so nothing is written to Key Vault
const OAUTH_CONFIG = {
  destinationUrl: "https://third-party.example.com/publication",
  tokenUrl: "https://login.example.com/oauth2/v2.0/token",
  scope: "api://e2e-third-party/.default",
  clientId: "e2e-client-id",
  clientSecret: "e2e-client-secret"
};

test.describe("Third party subscriber", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
  });

  test("system admin can create, manage and delete a third party subscriber", async ({ page }) => {
    // Validation only allows letters, numbers, spaces, hyphens and apostrophes
    const subscriberName = `${getTestPrefix().replace(/_/g, "-")}Subscriber Corp`;

    // Subscriber list
    await page.goto("/third-party-subscribers");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage third-party subscribers");
    expect((await axeCheck(page).analyze()).violations).toEqual([]);
    await switchLanguage(page, "cy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rheoli tanysgrifwyr trydydd parti");
    await switchLanguage(page, "en");

    // Create: validation, Welsh, summary and change link
    await page.getByRole("button", { name: "Create new subscriber" }).click();
    await page.waitForURL("**/third-party-subscribers/create");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create third party subscriber");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(page.locator(".govuk-error-message")).toContainText("Enter a name");
    await switchLanguage(page, "cy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Creu tanysgrifwr trydydd parti");
    await switchLanguage(page, "en");

    await page.getByLabel("Name").fill(subscriberName);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/third-party-subscribers/create/summary");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create third party subscriber summary");
    await expect(page.locator(".govuk-summary-list")).toContainText(subscriberName);
    expect((await axeCheck(page).analyze()).violations).toEqual([]);

    await page.getByRole("link", { name: `Change ${subscriberName}` }).click();
    await page.waitForURL("**/third-party-subscribers/create");
    await expect(page.getByLabel("Name")).toHaveValue(subscriberName);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/third-party-subscribers/create/summary");
    await page.getByRole("button", { name: "Confirm" }).click();

    await page.waitForURL("**/third-party-subscribers/create/confirmation");
    await expect(page.locator(".govuk-panel--confirmation")).toContainText("Third party subscriber created");
    const subscriberId = (await findTestThirdPartyUserByName(subscriberName))?.id;
    expect(subscriberId).toBeDefined();
    await page.getByRole("link", { name: "Manage third party subscribers" }).click();
    await page.waitForURL("**/third-party-subscribers");
    await expect(page.locator(".govuk-table")).toContainText(subscriberName);

    const manageUrl = `/third-party-subscribers/${subscriberId}/manage`;
    const statusUrl = `/third-party-subscribers/${subscriberId}/status`;
    const statusValue = page
      .locator(".govuk-summary-list__row")
      .filter({ has: page.locator(".govuk-summary-list__key", { hasText: /^\s*Status\s*$/ }) })
      .locator(".govuk-summary-list__value");

    // Manage page: new subscribers default to Pending, Test connection sits above the summary list
    await page.goto(manageUrl);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage subscriber");
    await expect(page.locator(".govuk-summary-list")).toContainText(subscriberName);
    await expect(statusValue).toHaveText("Pending");
    const testButton = page.getByRole("button", { name: "Test connection" });
    await expect(testButton).not.toHaveClass(/govuk-button--(secondary|warning)/);
    const buttonBox = await testButton.boundingBox();
    const summaryBox = await page.locator(".govuk-summary-list").boundingBox();
    expect(buttonBox!.y).toBeLessThan(summaryBox!.y);
    expect((await axeCheck(page).analyze()).violations).toEqual([]);

    // Test connection with no OAuth configuration: red failure box, no outbound call
    await testButton.click();
    const connectionResult = page.locator(".connection-result");
    await expect(connectionResult).toHaveClass(/connection-result--fail/);
    await expect(connectionResult).toContainText("Failed");
    await expect(connectionResult).toContainText("No OAuth configuration found. Please supply valid OAuth configuration to enable connection.");
    expect((await axeCheck(page).analyze()).violations).toEqual([]);

    // Switching language reloads the page, so switch first and then run the test again
    await switchLanguage(page, "cy");
    await page.getByRole("button", { name: "Profi cysylltiad" }).click();
    await expect(connectionResult).toContainText("Methodd");
    await expect(connectionResult).toContainText("Heb ddod o hyd i ffurfweddiad OAuth.");
    expect((await axeCheck(page).analyze()).violations).toEqual([]);
    await switchLanguage(page, "en");

    // Status: pre-selected, cancel does not save
    await page.getByRole("link", { name: "Change Status" }).click();
    await page.waitForURL(`**${statusUrl}`);
    await expect(page).toHaveTitle(/Manage User Status/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage User Status");
    const statusSelect = page.getByLabel("Status", { exact: true });
    await expect(statusSelect).toHaveValue("PENDING");
    await expect(page.getByRole("radio")).toHaveCount(0);
    expect((await axeCheck(page).analyze()).violations).toEqual([]);
    await statusSelect.selectOption("SUSPENDED");
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForURL(`**${manageUrl}`);
    await expect(statusValue).toHaveText("Pending");

    // Status in Welsh
    await page.getByRole("link", { name: "Change Status" }).click();
    await page.waitForURL(`**${statusUrl}`);
    await switchLanguage(page, "cy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rheoli Statws Defnyddiwr");
    await expect(page.getByLabel("Statws", { exact: true })).toHaveValue("PENDING");
    await expect(page.getByRole("button", { name: "Cadarnhau" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Canslo" })).toHaveAttribute("href", `${manageUrl}?lng=cy`);
    expect((await axeCheck(page).analyze()).violations).toEqual([]);
    await switchLanguage(page, "en");
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
    await page.getByRole("link", { name: "Manage third party subscriber" }).click();
    await page.waitForURL("**/third-party-subscribers");
    expect((await getTestThirdPartyUser(subscriberId!)).status).toBe("ACTIVE");
    await page.goto(manageUrl);
    await expect(statusValue).toHaveText("Active");

    // Subscriptions
    await page.getByRole("button", { name: "Manage subscriptions" }).click();
    await page.waitForURL(`**/third-party-subscribers/${subscriberId}/subscriptions/manage**`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage subscriptions");
    await switchLanguage(page, "cy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rheoli tanysgrifiadau");
    await switchLanguage(page, "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage subscriptions");
    expect((await axeCheck(page).analyze()).violations).toEqual([]);

    await subscribeFirstListTypeAsPublic(page);
    // Save is offered on every page, so subscriptions can be saved without paging to the end
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
    await page.getByRole("button", { name: "Save subscriptions" }).click();
    await page.waitForURL(`**/third-party-subscribers/${subscriberId}/subscriptions/success`);
    await expect(page.locator(".govuk-panel--confirmation")).toContainText("Third Party Subscriptions Updated");
    await expect(page.getByRole("link", { name: "Manage third party subscribers" })).toBeVisible();
    const savedSubscriptions = (await getTestThirdPartyUser(subscriberId!)).subscriptions;
    expect(savedSubscriptions).toHaveLength(1);
    expect(savedSubscriptions[0].sensitivity).toBe("PUBLIC");

    // OAuth configuration stops before Confirm: saving writes Key Vault secrets that global teardown cannot remove
    const oauthUrl = `/third-party-subscribers/${subscriberId}/oauth-config`;
    await page.goto(manageUrl);
    await page.getByRole("button", { name: "Manage OAuth configuration" }).click();
    await page.waitForURL(`**${oauthUrl}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Configure OAuth credentials");
    expect((await axeCheck(page).analyze()).violations).toEqual([]);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    for (const message of ["Enter a destination URL", "Enter a token URL", "Enter a scope", "Enter a client ID", "Enter a client secret"]) {
      await expect(page.locator(".govuk-error-summary")).toContainText(message);
    }
    expect((await axeCheck(page).analyze()).violations).toEqual([]);
    await switchLanguage(page, "cy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ffurfweddu cymwysterau OAuth");
    await expect(page.getByRole("button", { name: "Creu" })).toBeVisible();
    await switchLanguage(page, "en");

    await page.getByLabel("Destination URL").fill(OAUTH_CONFIG.destinationUrl);
    await page.getByLabel("Token URL").fill(OAUTH_CONFIG.tokenUrl);
    await page.getByLabel("Scope").fill(OAUTH_CONFIG.scope);
    await page.getByLabel("Client ID").fill(OAUTH_CONFIG.clientId);
    await page.locator("#clientSecret").fill(OAUTH_CONFIG.clientSecret);
    await page.getByRole("button", { name: "Create" }).click();

    await page.waitForURL(`**${oauthUrl}/summary`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your answers");
    const oauthSummary = page.locator(".govuk-summary-list");
    for (const value of [OAUTH_CONFIG.destinationUrl, OAUTH_CONFIG.tokenUrl, OAUTH_CONFIG.scope, OAUTH_CONFIG.clientId]) {
      await expect(oauthSummary).toContainText(value);
    }
    await expect(oauthSummary).not.toContainText(OAUTH_CONFIG.clientSecret);
    expect((await axeCheck(page).analyze()).violations).toEqual([]);

    await page.getByRole("link", { name: "Change Scope" }).click();
    await page.waitForURL(`**${oauthUrl}`);
    await expect(page.getByLabel("Scope")).toHaveValue(OAUTH_CONFIG.scope);
    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForURL(`**${oauthUrl}/summary`);
    await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();

    // Delete: validation, Welsh, No returns to manage page, Yes deletes
    await page.goto(manageUrl);
    await page.getByRole("button", { name: "Delete subscriber" }).click();
    await page.waitForURL(`**/third-party-subscribers/${subscriberId}/delete/confirmation`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Are you sure you want to delete");
    expect((await axeCheck(page).analyze()).violations).toEqual([]);
    await switchLanguage(page, "cy");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ydych chi'n siŵr");
    await switchLanguage(page, "en");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await page.getByRole("radio", { name: "No" }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(`**${manageUrl}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage subscriber");

    await page.getByRole("button", { name: "Delete subscriber" }).click();
    await page.waitForURL(`**/third-party-subscribers/${subscriberId}/delete/confirmation`);
    await page.getByRole("radio", { name: "Yes" }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(`**/third-party-subscribers/${subscriberId}/delete/success`);
    await expect(page.locator(".govuk-panel--confirmation")).toContainText("Third party subscriber deleted");
    await expect(page.getByRole("heading", { name: "What do you want to do next?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
    await page.getByRole("link", { name: "Manage another third party subscriber" }).click();
    await page.waitForURL("**/third-party-subscribers");
    await expect(page.locator("body")).not.toContainText(subscriberName);
  });
});

// Admin pages have no language toggle, so switch with the lng query parameter
async function switchLanguage(page: Page, language: "en" | "cy") {
  const url = new URL(page.url());
  url.searchParams.set("lng", language);
  await page.goto(url.toString());
}

// The radio layout is behind a LaunchDarkly flag; without it each list type has a sensitivity dropdown
async function subscribeFirstListTypeAsPublic(page: Page) {
  const firstPublicRadio = page.locator('input[type="radio"][value="PUBLIC"]').first();
  const firstSensitivitySelect = page.locator("select.govuk-select").first();
  await expect(firstPublicRadio.or(firstSensitivitySelect)).toBeVisible();

  if (await firstPublicRadio.isVisible()) {
    await firstPublicRadio.check();
  } else {
    await firstSensitivitySelect.selectOption("PUBLIC");
  }
}
