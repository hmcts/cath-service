import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("admin can configure list type @nightly", async ({ page }) => {
  // Step 1: Navigate to System Admin dashboard
  await page.goto("/system-admin-dashboard");

  // Step 2: Click "Configure List Type" tile
  await page.getByRole("link", { name: "Configure List Type" }).click();
  await expect(page).toHaveURL("/configure-list-type/enter-details");
  await expect(page.getByRole("heading", { name: "Enter list type details" })).toBeVisible();

  // Step 3: Test validation - try to submit empty form
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Enter a value for name")).toBeVisible();
  await expect(page.getByText("Enter a value for friendly name")).toBeVisible();

  // Step 4: Test Welsh translation
  await page.getByRole("link", { name: "Cymraeg" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nodwch fanylion y math o restr");

  // Switch back to English
  await page.getByRole("link", { name: "English" }).click();

  // Step 5: Test accessibility on enter details page
  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityResults.violations).toEqual([]);

  // Step 6: Fill in list type details
  const uniqueName = `TEST_LIST_TYPE_${Date.now()}`;
  await page.getByLabel("Name").fill(uniqueName);
  await page.getByLabel("Friendly name").fill("Test List Type");
  await page.getByLabel("Welsh friendly name").fill("Math Rhestr Prawf");
  await page.getByLabel("Shortened friendly name").fill("Test List");
  await page.getByLabel("URL").fill("/test-list");
  await page.getByLabel("Default sensitivity").selectOption("Public");
  await page.getByLabel("CFT_IDAM").check();
  await page.getByLabel("Yes", { exact: true }).check();

  // Step 7: Continue to sub-jurisdictions page
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/configure-list-type/select-sub-jurisdictions");
  await expect(page.getByRole("heading", { name: "Select sub-jurisdictions" })).toBeVisible();

  // Step 8: Test validation - try to continue without selecting any
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Select at least one sub-jurisdiction")).toBeVisible();

  // Step 9: Select at least one sub-jurisdiction
  const firstCheckbox = page.getByRole("checkbox").first();
  await firstCheckbox.check();

  // Step 10: Test accessibility on sub-jurisdictions page
  const subJurisdictionsResults = await new AxeBuilder({ page }).analyze();
  expect(subJurisdictionsResults.violations).toEqual([]);

  // Step 11: Continue to preview page
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/configure-list-type/preview");
  await expect(page.getByRole("heading", { name: "Check list type details" })).toBeVisible();

  // Step 12: Verify all details are displayed
  await expect(page.getByText(uniqueName)).toBeVisible();
  await expect(page.getByText("Test List Type")).toBeVisible();
  await expect(page.getByText("Math Rhestr Prawf")).toBeVisible();
  await expect(page.getByText("Test List")).toBeVisible();

  // Step 13: Test accessibility on preview page
  const previewResults = await new AxeBuilder({ page }).analyze();
  expect(previewResults.violations).toEqual([]);

  // Step 14: Confirm and submit
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL("/configure-list-type/success");
  await expect(page.getByRole("heading", { name: "List type saved" })).toBeVisible();
  await expect(page.getByText("List type saved successfully")).toBeVisible();

  // Step 15: Test accessibility on success page
  const successResults = await new AxeBuilder({ page }).analyze();
  expect(successResults.violations).toEqual([]);

  // Step 16: Test keyboard navigation - return to dashboard
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/system-admin-dashboard");
});

test("admin can edit existing list type @nightly", async ({ page }) => {
  // Step 1: Navigate to System Admin dashboard
  await page.goto("/system-admin-dashboard");

  // Step 2: Click "Configure List Type" tile
  await page.getByRole("link", { name: "Configure List Type" }).click();

  // Step 3: Navigate with edit query parameter (simulating edit flow)
  await page.goto("/configure-list-type/enter-details?id=1");

  // Step 4: Verify form is pre-populated
  await expect(page.getByLabel("Name")).toHaveValue("CIVIL_DAILY_CAUSE_LIST");

  // Step 5: Update a field
  await page.getByLabel("Friendly name").fill("Updated Civil Daily Cause List");

  // Step 6: Continue through the flow
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 7: Verify sub-jurisdictions page
  await expect(page).toHaveURL(/configure-list-type\/select-sub-jurisdictions/);

  // Step 8: At least one checkbox should already be checked
  const checkedCheckboxes = await page.getByRole("checkbox", { checked: true }).count();
  expect(checkedCheckboxes).toBeGreaterThan(0);

  // Step 9: Continue to preview
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/configure-list-type\/preview/);

  // Step 10: Verify updated value in preview
  await expect(page.getByText("Updated Civil Daily Cause List")).toBeVisible();

  // Step 11: Confirm changes
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL(/configure-list-type\/success/);
  await expect(page.getByRole("heading", { name: "List type saved" })).toBeVisible();
});
