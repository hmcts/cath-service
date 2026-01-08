import AxeBuilder from "@axe-core/playwright";
import { prisma } from "@hmcts/postgres";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../utils/sso-helpers.js";

test("admin can create, edit, and delete list type", async ({ page }) => {
  const uniqueName = `TEST_LIST_TYPE_${Date.now()}`;
  let listTypeId: number;

  // PART 1: CREATE LIST TYPE
  // Step 1: Navigate to System Admin dashboard and authenticate
  await page.goto("/system-admin-dashboard");
  if (page.url().includes("login.microsoftonline.com")) {
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
  }

  // Step 2: Click "Configure List Type" tile
  await page.getByRole("link", { name: "Configure List Type" }).click();
  await expect(page).toHaveURL("/configure-list-type-enter-details");
  await expect(page.getByRole("heading", { name: "Enter list type details" })).toBeVisible();

  // Step 3: Test validation - try to submit empty form
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#name-error")).toContainText("Enter a value for name");
  await expect(page.locator("#friendlyName-error")).toContainText("Enter a value for friendly name");

  // Step 4: Test Welsh translation
  await page.getByRole("link", { name: "Cymraeg" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Rhowch fanylion math o restr");

  // Switch back to English
  await page.getByRole("link", { name: "English" }).click();

  // Step 5: Test accessibility on enter details page
  const accessibilityResults = await new AxeBuilder({ page })
    .disableRules(['region']) // Disable region rule - GOV.UK skip links, phase banner, and back links intentionally outside landmarks
    .analyze();
  expect(accessibilityResults.violations).toEqual([]);

  // Step 5a: Test keyboard navigation - tab through form fields
  await page.getByLabel("Name", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Friendly name", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Welsh friendly name")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Shortened friendly name")).toBeFocused();

  // Step 6: Fill in list type details
  await page.getByLabel("Name", { exact: true }).fill(uniqueName);
  await page.getByLabel("Friendly name", { exact: true }).fill("Test List Type");
  await page.getByLabel("Welsh friendly name").fill("Math Rhestr Prawf");
  await page.getByLabel("Shortened friendly name").fill("Test List");
  await page.getByLabel("URL").fill("/test-list");
  await page.getByLabel("Default sensitivity").selectOption("Public");
  await page.getByLabel("CFT_IDAM").check();
  await page.getByLabel("Yes", { exact: true }).check();

  // Step 7: Continue to sub-jurisdictions page
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/configure-list-type-select-sub-jurisdictions");
  await expect(page.getByRole("heading", { name: "Select sub-jurisdictions" })).toBeVisible();

  // Step 8: Test validation - try to continue without selecting any
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#subJurisdictions-error")).toContainText("Select at least one sub-jurisdiction");

  // Step 9: Select at least one sub-jurisdiction
  const firstCheckbox = page.getByRole("checkbox").first();
  await firstCheckbox.check();

  // Step 10: Test accessibility on sub-jurisdictions page
  const subJurisdictionsResults = await new AxeBuilder({ page })
    .disableRules(['region'])
    .analyze();
  expect(subJurisdictionsResults.violations).toEqual([]);

  // Step 10a: Test keyboard navigation - navigate checkboxes with keyboard
  const secondCheckbox = page.getByRole("checkbox").nth(1);
  await secondCheckbox.focus();
  await page.keyboard.press("Space");
  await expect(secondCheckbox).toBeChecked();

  // Step 11: Continue to preview page
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/configure-list-type-preview");
  await expect(page.getByRole("heading", { name: "Check list type details" })).toBeVisible();

  // Step 12: Verify all details are displayed
  await expect(page.getByText(uniqueName)).toBeVisible();
  await expect(page.getByText("Test List Type")).toBeVisible();
  await expect(page.getByText("Math Rhestr Prawf")).toBeVisible();
  await expect(page.getByText("Test List", { exact: true })).toBeVisible();

  // Step 13: Test accessibility on preview page
  const previewResults = await new AxeBuilder({ page })
    .disableRules(['region'])
    .analyze();
  expect(previewResults.violations).toEqual([]);

  // Step 13a: Test keyboard navigation - focus and press Enter to submit
  await page.getByRole("button", { name: "Confirm" }).focus();
  await expect(page.getByRole("button", { name: "Confirm" })).toBeFocused();
  await page.keyboard.press("Enter");

  // Step 14: Verify submission success
  await expect(page).toHaveURL("/configure-list-type-success");
  await expect(page.getByRole("heading", { name: "List type saved" })).toBeVisible();
  await expect(page.getByText("List type saved successfully")).toBeVisible();

  // Step 15: Test accessibility on success page
  const createSuccessResults = await new AxeBuilder({ page })
    .disableRules(['region'])
    .analyze();
  expect(createSuccessResults.violations).toEqual([]);

  // Step 16: Get the created list type ID from the database
  const createdListType = await prisma.listType.findUnique({
    where: { name: uniqueName }
  });
  expect(createdListType).toBeTruthy();
  listTypeId = createdListType!.id;

  // Step 17: Return to dashboard
  await page.getByRole("link", { name: "Return to System Admin dashboard" }).click();
  await expect(page).toHaveURL("/system-admin-dashboard");

  // PART 2: EDIT LIST TYPE
  // Step 18: Navigate to edit the newly created list type
  await page.goto(`/configure-list-type-enter-details?id=${listTypeId}`);

  // Step 19: Verify form is pre-populated with created values
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(uniqueName);
  await expect(page.getByLabel("Friendly name", { exact: true })).toHaveValue("Test List Type");

  // Step 20: Update a field
  await page.getByLabel("Friendly name", { exact: true }).fill("Updated Test List Type");

  // Step 21: Continue through the flow
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 22: Verify sub-jurisdictions page
  await expect(page).toHaveURL(/configure-list-type-select-sub-jurisdictions/);

  // Step 23: At least one checkbox should already be checked
  const checkedCheckboxes = await page.getByRole("checkbox", { checked: true }).count();
  expect(checkedCheckboxes).toBeGreaterThan(0);

  // Step 24: Continue to preview
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/configure-list-type-preview/);

  // Step 25: Verify updated value in preview
  await expect(page.getByText("Updated Test List Type")).toBeVisible();

  // Step 26: Confirm changes
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL(/configure-list-type-success/);
  await expect(page.getByRole("heading", { name: "List type saved" })).toBeVisible();

  // PART 3: DELETE LIST TYPE
  // Step 27: Navigate to view list types page
  await page.goto("/view-list-types");
  await expect(page.getByRole("heading", { name: "List types" })).toBeVisible();

  // Step 28: Click delete link for the created list type
  await page.locator(`a[href="/delete-list-type?id=${listTypeId}"]`).click();
  await expect(page).toHaveURL(`/delete-list-type?id=${listTypeId}`);
  await expect(page.getByRole("heading", { name: "Are you sure you want to delete this list type?" })).toBeVisible();

  // Step 29: Test validation - try to continue without selecting an option
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Please select an option")).toBeVisible();

  // Step 30: Test Welsh translation
  await page.getByRole("link", { name: "Cymraeg" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ydych chi'n siŵr eich bod am ddileu'r math hwn o restr?");

  // Switch back to English
  await page.getByRole("link", { name: "English" }).click();

  // Step 31: Test accessibility on delete page
  const deletePageResults = await new AxeBuilder({ page })
    .disableRules(['region'])
    .analyze();
  expect(deletePageResults.violations).toEqual([]);

  // Step 31a: Test keyboard navigation - navigate radio buttons with arrow keys
  await page.getByLabel("Yes, delete this list type").focus();
  await expect(page.getByLabel("Yes, delete this list type")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("No, do not delete")).toBeFocused();

  // Step 32: Select "No" option with Space key and verify redirect
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL("/view-list-types");

  // Step 33: Return to delete page
  await page.locator(`a[href="/delete-list-type?id=${listTypeId}"]`).click();
  await expect(page).toHaveURL(`/delete-list-type?id=${listTypeId}`);

  // Step 34: Select "Yes" option to confirm deletion with keyboard
  await page.getByLabel("Yes, delete this list type").focus();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Yes, delete this list type")).toBeChecked();

  // Step 34a: Tab to Confirm button and press Enter
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Confirm" })).toBeFocused();
  await page.keyboard.press("Enter");

  // Step 35: Verify success page
  await expect(page).toHaveURL("/delete-list-type-success");
  await expect(page.getByRole("heading", { name: "List type deleted" })).toBeVisible();
  await expect(page.getByText("The list type has been deleted successfully")).toBeVisible();

  // Step 36: Test accessibility on success page
  const deleteSuccessResults = await new AxeBuilder({ page })
    .disableRules(['region'])
    .analyze();
  expect(deleteSuccessResults.violations).toEqual([]);

  // Step 37: Return to view list types
  await page.getByRole("link", { name: "View all list types" }).click();
  await expect(page).toHaveURL("/view-list-types");

  // Step 38: Verify the deleted list type is no longer visible
  const listTypeCount = await page.getByText(uniqueName).count();
  expect(listTypeCount).toBe(0);
});

test("admin cannot delete list type with artifacts @nightly", async ({ page }) => {
  // Setup: Create a test artefact for list type ID 2 (Family Daily Cause List)
  let testArtefactId: string | undefined;

  try {
    const testArtefact = await prisma.artefact.create({
      data: {
        locationId: "1",
        listTypeId: 2,
        contentDate: new Date(),
        sensitivity: "Public",
        language: "ENGLISH",
        displayFrom: new Date(),
        displayTo: new Date(Date.now() + 86400000),
        isFlatFile: false,
        provenance: "CFT_IDAM"
      }
    });
    testArtefactId = testArtefact.artefactId;

    // Step 1: Authenticate as System Admin
    await page.goto("/system-admin-dashboard");
    if (page.url().includes("login.microsoftonline.com")) {
      await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    }

    // Step 2: Navigate to delete page for list type that has artifacts
    await page.goto("/delete-list-type?id=2");
    await expect(page.getByRole("heading", { name: "Are you sure you want to delete this list type?" })).toBeVisible();

    // Step 3: Select "Yes" to attempt deletion
    await page.getByLabel("Yes, delete this list type").check();
    await page.getByRole("button", { name: "Confirm" }).click();

    // Step 4: Verify error message is displayed
    await expect(page.getByText("This list type cannot be deleted because it has existing artifacts")).toBeVisible();
    await expect(page).toHaveURL(/\/delete-list-type\?id=2/);

    // Step 5: Test accessibility with error message
    const errorPageResults = await new AxeBuilder({ page })
      .disableRules(['region'])
      .analyze();
    expect(errorPageResults.violations).toEqual([]);

    // Step 6: Select "No" to cancel and return to view list types
    await page.getByLabel("No, do not delete").check();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page).toHaveURL("/view-list-types");
  } finally {
    // Cleanup: Delete the test artefact
    if (testArtefactId) {
      await prisma.artefact.delete({
        where: { artefactId: testArtefactId }
      });
    }
  }
});
