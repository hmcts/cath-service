import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("verified user can subscribe to list types @nightly", async ({ page }) => {
  // Arrange - Sign in as verified user
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("verified.media@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Navigate to subscription management
  await page.goto("/subscription-management");
  await expect(page.getByRole("heading", { name: "Your email subscriptions" })).toBeVisible();

  // Act - Start subscription process
  await page.getByRole("link", { name: "Add email subscription" }).click();

  // Page 2: Select subscription method
  await expect(page.getByRole("heading", { name: "How do you want to add an email subscription?" })).toBeVisible();

  // Test validation error
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("There is a problem")).toBeVisible();
  await expect(page.getByText("Select how you want to add an email subscription")).toBeVisible();

  // Select court option (which leads to location search, but we'll skip to list types directly)
  await page.getByLabel("By court or tribunal name").check();

  // Test Welsh translation
  await page.goto("/subscription-add-method?lng=cy");
  await expect(page.getByRole("heading", { name: "Sut ydych chi eisiau ychwanegu tanysgrifiad e-bost?" })).toBeVisible();

  // Test accessibility on Page 2
  const page2Results = await new AxeBuilder({ page }).analyze();
  expect(page2Results.violations).toEqual([]);

  // Continue to location search (we'll navigate directly to list types for this test)
  await page.goto("/subscription-list-types");

  // Page 5: Select list types
  await expect(page.getByRole("heading", { name: "Select list types" })).toBeVisible();
  await expect(page.getByText(/Choose the lists you will receive/)).toBeVisible();

  // Test validation error - no list types selected
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("There is a problem")).toBeVisible();
  await expect(page.getByText("Please select a list type to continue")).toBeVisible();

  // Select list types
  await page.getByLabel("Civil Daily Cause List").check();
  await page.getByLabel("Family Daily Cause List").check();

  // Test Welsh translation on Page 5
  await page.goto("/subscription-list-types?lng=cy");
  await expect(page.getByRole("heading", { name: "Dewis Mathau o Restri" })).toBeVisible();

  // Re-select checkboxes in Welsh view
  await page.getByLabel(/Civil Daily Cause List/i).first().check();
  await page.getByLabel(/Family Daily Cause List/i).first().check();

  // Test accessibility on Page 5
  const page5Results = await new AxeBuilder({ page }).analyze();
  expect(page5Results.violations).toEqual([]);

  // Continue to language selection
  await page.getByRole("button", { name: "Parhau" }).click();

  // Page 6: Select list language
  await expect(page.getByRole("heading", { name: /Pa fersiwn o'r rhestr ydych chi am ei derbyn/ })).toBeVisible();

  // Switch back to English
  await page.goto("/subscription-list-language?lng=en");
  await expect(page.getByRole("heading", { name: "What version of the list type do you want to receive?" })).toBeVisible();

  // Test validation error - no language selected
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("There is a problem")).toBeVisible();
  await expect(page.getByText("Please select version of the list type to continue")).toBeVisible();

  // Select language
  await page.getByLabel("English").check();

  // Test keyboard navigation
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const continueButton = page.getByRole("button", { name: "Continue" });
  await expect(continueButton).toBeFocused();

  // Test accessibility on Page 6
  const page6Results = await new AxeBuilder({ page }).analyze();
  expect(page6Results.violations).toEqual([]);

  // Continue to confirmation
  await continueButton.click();

  // Page 7: Confirm subscriptions
  await expect(page.getByRole("heading", { name: "Confirm your email subscriptions" })).toBeVisible();
  await expect(page.getByText("Civil Daily Cause List")).toBeVisible();
  await expect(page.getByText("Family Daily Cause List")).toBeVisible();
  await expect(page.getByText("English")).toBeVisible();

  // Test Welsh on confirmation page
  await page.goto("/subscription-confirm?lng=cy");
  await expect(page.getByRole("heading", { name: "Cadarnhewch eich tanysgrifiadau e-bost" })).toBeVisible();
  await expect(page.getByText("Saesneg")).toBeVisible();

  // Switch back to English and confirm
  await page.goto("/subscription-confirm?lng=en");

  // Test accessibility on Page 7
  const page7Results = await new AxeBuilder({ page }).analyze();
  expect(page7Results.violations).toEqual([]);

  // Confirm subscriptions
  await page.getByRole("button", { name: "Confirm subscriptions" }).click();

  // Page 8: Subscription confirmed
  await expect(page.getByRole("heading", { name: "Subscription confirmation" })).toBeVisible();

  // Test accessibility on Page 8
  const page8Results = await new AxeBuilder({ page }).analyze();
  expect(page8Results.violations).toEqual([]);

  // Verify navigation links
  await expect(page.getByRole("link", { name: /Add another subscription/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Manage your current email subscriptions/i })).toBeVisible();

  // Navigate to subscription management to verify subscriptions were created
  await page.getByRole("link", { name: /Manage your current email subscriptions/i }).click();
  await expect(page.getByRole("heading", { name: "Your email subscriptions" })).toBeVisible();

  // Verify list type subscriptions section exists
  await expect(page.getByText("List type subscriptions")).toBeVisible();
  await expect(page.getByText("Civil Daily Cause List")).toBeVisible();
  await expect(page.getByText("Family Daily Cause List")).toBeVisible();
  await expect(page.getByText("English")).toBeVisible();

  // Test remove functionality
  const removeButtons = page.getByRole("button", { name: /Remove/i });
  const removeCount = await removeButtons.count();
  if (removeCount > 0) {
    await removeButtons.first().click();
    // Should redirect back to subscription management
    await expect(page.getByRole("heading", { name: "Your email subscriptions" })).toBeVisible();
  }
});

test("prevents duplicate list type subscriptions @nightly", async ({ page }) => {
  // Arrange - Sign in as verified user
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("verified.media@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Navigate directly to list types selection
  await page.goto("/subscription-list-types");

  // Select a list type
  await page.getByLabel("Civil Daily Cause List").check();
  await page.getByRole("button", { name: "Continue" }).click();

  // Select language
  await page.getByLabel("English").check();
  await page.getByRole("button", { name: "Continue" }).click();

  // Confirm first subscription
  await page.getByRole("button", { name: "Confirm subscriptions" }).click();
  await expect(page.getByRole("heading", { name: "Subscription confirmation" })).toBeVisible();

  // Try to create duplicate subscription
  await page.goto("/subscription-list-types");
  await page.getByLabel("Civil Daily Cause List").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("English").check();
  await page.getByRole("button", { name: "Continue" }).click();

  // Should show error on confirmation
  await page.getByRole("button", { name: "Confirm subscriptions" }).click();

  // Should either show error message or redirect
  // Check if we're still on confirm page with error, or redirected to management
  const url = page.url();
  const hasError = await page.getByText(/already subscribed/i).isVisible().catch(() => false);
  const onManagementPage = url.includes("/subscription-management");

  expect(hasError || onManagementPage).toBeTruthy();
});

test("validates all fields across journey @nightly", async ({ page }) => {
  // Sign in
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("verified.media@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Page 2: Validation
  await page.goto("/subscription-add-method");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("There is a problem")).toBeVisible();
  await expect(page.getByRole("link", { name: "Select how you want to add an email subscription" })).toBeVisible();

  // Click error link should focus field
  await page.getByRole("link", { name: "Select how you want to add an email subscription" }).click();

  // Page 5: Validation
  await page.goto("/subscription-list-types");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("There is a problem")).toBeVisible();
  await expect(page.getByRole("link", { name: "Please select a list type to continue" })).toBeVisible();

  // Page 6: Validation
  await page.goto("/subscription-list-language");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("There is a problem")).toBeVisible();
  await expect(page.getByRole("link", { name: /Please select version/i })).toBeVisible();
});
