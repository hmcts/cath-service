import { expect, type Page, test } from "@playwright/test";
import { axeCheck } from "../../utils/axe-helper.js";
import { generateTestId } from "../../utils/dynamic-test-data.js";
import { switchLanguage } from "../../utils/language-helpers.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";
import { prefixName } from "../../utils/test-prefix.js";
import { createOrGetListType } from "../../utils/test-support-api.js";

// Real list types are read-only: the edit and delete journeys act on a prefixed list type each test creates,
// which global-teardown deletes (TEST_* names would be neither cleaned up nor reconciled by the deploy seed)
async function createOwnListType(): Promise<{ id: number; friendlyName: string }> {
  const testId = generateTestId();
  const friendlyName = prefixName(`Manage List Types Test List ${testId}`);
  const listType = await createOrGetListType({
    name: prefixName(`LIST_${testId}`),
    friendlyName,
    // URL is required by the edit form's validation
    url: `/manage-list-types-test-${testId.toLowerCase()}`,
    provenance: "CFT_IDAM"
  });
  return { id: listType.id, friendlyName };
}

// The list shows each list type by its friendly name
async function openOwnListType(page: Page, listType: { id: number; friendlyName: string }) {
  const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: listType.friendlyName, exact: true }) });
  await expect(row).toHaveCount(1);
  await row.getByRole("link", { name: "Manage" }).click();
  await page.waitForURL(`**/manage-list-type?id=${listType.id}`);
}

test.describe("Manage List Types", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
  });

  test("admin can add a new list type @nightly", async ({ page }) => {
    // Navigate to manage list types from dashboard
    await page.getByRole("link", { name: "Manage List Types" }).click();
    await page.waitForURL("**/manage-list-types");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Manage list types");

    // Verify Add new list type button exists
    await expect(page.getByRole("button", { name: "Add new list type" })).toBeVisible();

    // Accessibility check on list page
    const listPageResults = await axeCheck(page).analyze();
    expect(listPageResults.violations).toEqual([]);

    // Navigate to add new list type
    await page.getByRole("button", { name: "Add new list type" }).click();
    await page.waitForURL("**/add-list-type");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Enter list type details");

    // Test validation - empty form submission
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert").getByRole("link", { name: "Enter a value for name" })).toBeVisible();
    await expect(page.getByRole("alert").getByRole("link", { name: "Enter a value for friendly name" })).toBeVisible();

    // Accessibility check on add form with errors
    const addFormErrorResults = await axeCheck(page).analyze();
    expect(addFormErrorResults.violations).toEqual([]);

    // Test Welsh translation
    await switchLanguage(page, "cy");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Switch back to English and fill the form
    await switchLanguage(page, "en");

    const uniqueName = prefixName(`LIST_${generateTestId()}`);
    await page.getByLabel("Name", { exact: true }).fill(uniqueName);
    await page.getByLabel("Friendly name", { exact: true }).fill("Test List Type");
    await page.getByLabel("Welsh friendly name").fill("Math Rhestr Prawf");
    await page.getByLabel("Shortened friendly name").fill("Test List");
    await page.getByLabel("URL").fill("/test-list");
    await page.getByLabel("Default sensitivity").selectOption("Public");
    await page.getByLabel("CFT_IDAM").check();
    await page.getByLabel("Yes", { exact: true }).check();

    // Continue to sub-jurisdictions page
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/configure-list-type-select-sub-jurisdictions");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Select sub-jurisdictions");

    // Accessibility check on sub-jurisdictions page
    const subJurisdictionsResults = await axeCheck(page).analyze();
    expect(subJurisdictionsResults.violations).toEqual([]);

    // Select at least one sub-jurisdiction
    await page.getByRole("checkbox").first().check();

    // Continue to preview page
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/configure-list-type-preview");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Check list type details");

    // Verify details shown in summary
    await expect(page.getByText(uniqueName)).toBeVisible();
    await expect(page.getByText("Test List Type")).toBeVisible();

    // Verify change details link points to add-list-type
    const changeLink = page.getByRole("link", { name: "Change" }).first();
    const changeLinkHref = await changeLink.getAttribute("href");
    expect(changeLinkHref).toContain("/add-list-type");

    // Accessibility check on preview page
    const previewResults = await axeCheck(page).analyze();
    expect(previewResults.violations).toEqual([]);

    // Confirm to create
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL("**/configure-list-type-success");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("List type updated");

    // Accessibility check on success page
    const successResults = await axeCheck(page).analyze();
    expect(successResults.violations).toEqual([]);

    // Verify return link goes to manage-list-types
    const returnLink = page.getByRole("link", { name: "Return to System Admin dashboard" });
    await expect(returnLink).toBeVisible();
  });

  test("admin can edit an existing list type @nightly", async ({ page }) => {
    const listType = await createOwnListType();

    // Navigate to manage list types
    await page.goto("/manage-list-types");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Manage list types");

    // Open this test's own list type, never a real one
    await openOwnListType(page, listType);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Accessibility check on detail page
    const detailPageResults = await axeCheck(page).analyze();
    expect(detailPageResults.violations).toEqual([]);

    // Verify Edit button is present
    const editButton = page.getByRole("button", { name: "Edit list type" });
    await expect(editButton).toBeVisible();

    // Navigate to edit form
    await editButton.click();
    await page.waitForURL(/.*edit-list-type\?id=.*/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Edit list type");

    // Accessibility check on edit form
    const editFormResults = await axeCheck(page).analyze();
    expect(editFormResults.violations).toEqual([]);

    // Test Welsh translation on edit form
    await switchLanguage(page, "cy");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await switchLanguage(page, "en");

    // Change the friendly name
    const friendlyNameInput = page.getByLabel("Friendly name", { exact: true });
    await friendlyNameInput.clear();
    await friendlyNameInput.fill(prefixName("Updated Test List Type"));

    // Continue to sub-jurisdictions
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/configure-list-type-select-sub-jurisdictions");

    // Proceed to preview (at least one sub-jurisdiction is required, and the seeded list type has none)
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/configure-list-type-preview");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Check list type details");

    // Verify change details link points to edit-list-type
    const changeLink = page.getByRole("link", { name: "Change" }).first();
    const changeLinkHref = await changeLink.getAttribute("href");
    expect(changeLinkHref).toContain("/edit-list-type");

    // Confirm update
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL("**/configure-list-type-success");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("List type updated");
  });

  test("admin can delete a list type @nightly", async ({ page }) => {
    const listType = await createOwnListType();

    // Navigate to manage list types
    await page.goto("/manage-list-types");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Manage list types");

    // Open this test's own list type, never a real one
    await openOwnListType(page, listType);

    // Click Delete button
    const deleteButton = page.getByRole("button", { name: "Delete list type" });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    await page.waitForURL(/.*delete-list-type\?id=.*/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Are you sure you want to delete this list type?");

    // Accessibility check on delete confirmation page
    const deletePageResults = await axeCheck(page).analyze();
    expect(deletePageResults.violations).toEqual([]);

    // Test Welsh translation
    await switchLanguage(page, "cy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ydych chi'n siŵr eich bod am ddileu'r math hwn o restr?");
    await switchLanguage(page, "en");

    // Test validation - no selection
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Please select an option");

    // Accessibility check with errors
    const deletePageErrorResults = await axeCheck(page).analyze();
    expect(deletePageErrorResults.violations).toEqual([]);

    // Select No - should redirect back to detail page
    await page.getByLabel("No", { exact: true }).check();
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL(`**/manage-list-type?id=${listType.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
