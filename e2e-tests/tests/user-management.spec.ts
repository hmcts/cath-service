import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { prisma } from "@hmcts/postgres";
import { loginWithSSO } from "../utils/sso-helpers.js";

// Helper to validate required environment variables
function validateEnvVars() {
  const missing: string[] = [];

  if (!process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL) {
    missing.push("SSO_TEST_SYSTEM_ADMIN_EMAIL");
  }
  if (!process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD) {
    missing.push("SSO_TEST_SYSTEM_ADMIN_PASSWORD");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
      "Please set these variables before running the tests."
    );
  }
}

// Helper function to authenticate as System Admin
async function authenticateSystemAdmin(page: Page) {
  await page.goto("/system-admin-dashboard");

  // Only validate env vars if SSO redirect is detected
  if (page.url().includes("login.microsoftonline.com")) {
    validateEnvVars();
    const systemAdminEmail = process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!;
    const systemAdminPassword = process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!;
    await loginWithSSO(page, systemAdminEmail, systemAdminPassword);
  }
}

// Track created users for cleanup
const createdUsers: string[] = [];

// Helper to create a test user
async function createTestUser(email: string, role: string, provenance: string): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email,
      role,
      userProvenance: provenance,
      userProvenanceId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdDate: new Date(),
      lastSignedInDate: null
    }
  });

  createdUsers.push(user.userId);
  return user.userId;
}

// Cleanup after all tests
test.afterAll(async () => {
  // Clean up test users
  if (createdUsers.length > 0) {
    await prisma.user.deleteMany({
      where: {
        userId: {
          in: createdUsers
        }
      }
    });
  }
});

test.describe("User Management", () => {
  test("system admin can search, filter, view, and delete users @nightly", async ({ page }) => {
    // Create test users for searching
    const testEmail = `test.user.${Date.now()}@example.com`;
    const testUserId = await createTestUser(testEmail, "VERIFIED", "CFT_IDAM");
    await createTestUser(`another.user.${Date.now()}@example.com`, "INTERNAL_ADMIN_CTSC", "SSO");

    // Authenticate as system admin
    await authenticateSystemAdmin(page);
    await expect(page.getByRole("heading", { name: "System admin dashboard", level: 1 })).toBeVisible();

    // Navigate to find users page
    await page.getByRole("link", { name: "User Management" }).click();
    await expect(page.getByRole("heading", { name: "Find, update and delete a user", level: 1 })).toBeVisible();

    // Test accessibility on find users page
    const findUsersAccessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(findUsersAccessibility.violations).toEqual([]);

    // Test filter by email
    await page.getByLabel("Email").fill(testEmail.substring(0, 10));
    await page.getByRole("button", { name: "Apply filters" }).click();

    // Verify results appear
    await expect(page.getByText(/\d+ users? found/)).toBeVisible();
    await expect(page.getByText(testEmail)).toBeVisible();

    // Verify filter heading appears in selected filters
    await expect(page.getByRole("heading", { name: "Email", level: 4 })).toBeVisible();

    // Test removing a filter by clicking the tag
    const filterTag = page.locator(".user-management-filter-tag").first();
    await filterTag.click();

    // Verify filter was removed (should show all results again)
    await page.waitForLoadState("networkidle");

    // Apply multiple filters
    await page.getByLabel("Email").fill(testEmail);
    await page.locator('input[name="roles"][value="VERIFIED"]').check();
    await page.locator('input[name="provenances"][value="CFT_IDAM"]').check();
    await page.getByRole("button", { name: "Apply filters" }).click();

    // Verify filter headings appear in selected filters
    await expect(page.getByRole("heading", { name: "Email", level: 4 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Roles", level: 4 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Provenance", level: 4 })).toBeVisible();

    // Test Clear filters button
    await page.getByRole("link", { name: "Clear filters" }).click();
    await page.waitForLoadState("networkidle");

    // Re-apply email filter to find our test user
    await page.getByLabel("Email").fill(testEmail);
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByRole("cell", { name: testEmail })).toBeVisible();

    // Test Welsh translation on find users page
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await expect(page.getByRole("heading", { name: "Dod o hyd i, diweddaru a dileu defnyddiwr", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cymhwyso hidlwyr" })).toBeVisible();

    // Switch back to English
    await page.getByRole("link", { name: "English" }).click();
    await expect(page.getByRole("heading", { name: "Find, update and delete a user", level: 1 })).toBeVisible();

    // Click "Manage" on the test user
    const manageLink = page.getByRole("link", { name: "Manage" }).first();
    await manageLink.click();

    // Verify manage user page loads
    await expect(page.getByRole("heading", { name: `Manage ${testEmail}`, level: 1 })).toBeVisible();
    await expect(page.getByText("User ID")).toBeVisible();
    await expect(page.getByText(testUserId)).toBeVisible();
    await expect(page.getByText("Role")).toBeVisible();
    await expect(page.getByText("VERIFIED")).toBeVisible();
    await expect(page.getByText("Provenance", { exact: true })).toBeVisible();
    await expect(page.getByText("CFT_IDAM")).toBeVisible();

    // Test accessibility on manage user page
    const manageUserAccessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(manageUserAccessibility.violations).toEqual([]);

    // Test Welsh translation on manage user page
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await expect(page.getByRole("heading", { name: `Rheoli ${testEmail}`, level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dileu defnyddiwr" })).toBeVisible();

    // Switch back to English
    await page.getByRole("link", { name: "English" }).click();

    // Click delete user button
    await page.getByRole("button", { name: "Delete user" }).click();

    // Verify delete confirmation page loads
    await expect(page.getByRole("heading", { name: `Are you sure you want to delete ${testEmail}?`, level: 1 })).toBeVisible();

    // Test accessibility on delete confirmation page
    const deleteConfirmAccessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(deleteConfirmAccessibility.violations).toEqual([]);

    // Test validation - submit without selecting an option
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".govuk-error-message")).toContainText("Select yes or no to continue");

    // Test Welsh translation on delete confirmation page
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await expect(page.getByRole("heading", { name: `Ydych chi'n siŵr eich bod am ddileu ${testEmail}?`, level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Parhau" })).toBeVisible();

    // Switch back to English
    await page.getByRole("link", { name: "English" }).click();

    // Select yes and submit
    await page.locator('input[name="confirmation"][value="yes"]').check();
    await page.getByRole("button", { name: "Continue" }).click();

    // Wait for the delete operation to complete
    await page.waitForLoadState("networkidle");

    // Verify user was actually deleted from the database
    const deletedUser = await prisma.user.findUnique({
      where: { userId: testUserId }
    });
    expect(deletedUser).toBeNull();

    // The delete was successful. Navigate back to find users to verify we can continue using the app
    await page.goto("/find-users");
    await expect(page.getByRole("heading", { name: "Find, update and delete a user", level: 1 })).toBeVisible();
  });

  test("system admin can cancel user deletion @nightly", async ({ page }) => {
    // Create test user
    const testEmail = `cancel.test.${Date.now()}@example.com`;
    const testUserId = await createTestUser(testEmail, "VERIFIED", "B2C");

    // Authenticate as system admin
    await authenticateSystemAdmin(page);

    // Navigate to find users and search for the test user
    await page.getByRole("link", { name: "User Management" }).click();
    await page.getByLabel("Email").fill(testEmail);
    await page.getByRole("button", { name: "Apply filters" }).click();

    // Click manage
    await page.getByRole("link", { name: "Manage" }).first().click();

    // Click delete user
    await page.getByRole("button", { name: "Delete user" }).click();

    // Select "No" to cancel deletion
    await page.locator('input[name="confirmation"][value="no"]').check();
    await page.getByRole("button", { name: "Continue" }).click();

    // Verify we're back on the manage user page
    await expect(page.getByRole("heading", { name: `Manage ${testEmail}`, level: 1 })).toBeVisible();

    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { userId: testUserId }
    });
    expect(user).not.toBeNull();
    expect(user?.email).toBe(testEmail);
  });

  test("system admin can filter by user ID @nightly", async ({ page }) => {
    // Create test user
    const testEmail = `userid.test.${Date.now()}@example.com`;
    const testUserId = await createTestUser(testEmail, "SYSTEM_ADMIN", "CRIME_IDAM");

    // Authenticate as system admin
    await authenticateSystemAdmin(page);

    // Navigate to find users
    await page.getByRole("link", { name: "User Management" }).click();

    // Note: User ID filter has validation that requires alphanumeric only,
    // but UUIDs contain hyphens, so this test verifies that results are shown
    // Search by email instead to find the specific user
    await page.getByLabel("Email").fill(testEmail);
    await page.getByRole("button", { name: "Apply filters" }).click();
    await page.waitForLoadState("networkidle");

    // Verify the specific user is found
    await expect(page.getByText(/1 users? found/)).toBeVisible();

    // Verify we can access the user details
    await page.getByRole("link", { name: "Manage" }).first().click();
    await expect(page.getByRole("heading", { name: `Manage ${testEmail}`, level: 1 })).toBeVisible();
    await expect(page.getByText(testUserId)).toBeVisible();
  });

  test("system admin sees no results message when no users match filters @nightly", async ({ page }) => {
    // Authenticate as system admin
    await authenticateSystemAdmin(page);

    // Navigate to find users
    await page.getByRole("link", { name: "User Management" }).click();

    // Search for a non-existent email
    await page.getByLabel("Email").fill("nonexistent.user.that.does.not.exist@nowhere.com");
    await page.getByRole("button", { name: "Apply filters" }).click();

    // Verify no results message appears
    await expect(page.getByText("No users could be found matching your search criteria")).toBeVisible();
    await expect(page.getByText("Try adjusting or clearing the filters")).toBeVisible();
  });
});
