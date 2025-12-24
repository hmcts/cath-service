import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../utils/sso-helpers.js";

test.describe("Media Application Management", () => {
  let approvalApplicationId: string;
  let rejectionApplicationId: string;

  test.beforeAll(async () => {
    const { prisma } = await import("@hmcts/postgres");

    const approvalApp = await prisma.mediaApplication.create({
      data: {
        name: "Test Media User",
        email: "test-media@example.com",
        employer: "Test News Corp",
        status: "PENDING",
        proofOfIdPath: null
      }
    });

    const rejectionApp = await prisma.mediaApplication.create({
      data: {
        name: "Test Rejection User",
        email: "test-rejection@example.com",
        employer: "Test Media Corp",
        status: "PENDING",
        proofOfIdPath: null
      }
    });

    approvalApplicationId = approvalApp.id;
    rejectionApplicationId = rejectionApp.id;
  });

  test.afterAll(async () => {
    const { prisma } = await import("@hmcts/postgres");

    if (approvalApplicationId) {
      await prisma.mediaApplication
        .delete({
          where: { id: approvalApplicationId }
        })
        .catch(() => {
          // Ignore if already deleted
        });
    }

    if (rejectionApplicationId) {
      await prisma.mediaApplication
        .delete({
          where: { id: rejectionApplicationId }
        })
        .catch(() => {
          // Ignore if already deleted
        });
    }
  });

  test.describe("CTSC Admin Workflows", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_CTSC_ADMIN_EMAIL!, process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!);
      await page.waitForURL("/admin-dashboard");
    });

    test("should complete media application approval journey", async ({ page }) => {
      // Verify media applications tile on admin dashboard
      const mediaApplicationsTile = page.locator('a.admin-tile[href="/media-applications"]');
      await expect(mediaApplicationsTile).toBeVisible();
      await expect(mediaApplicationsTile).toContainText("Manage Media Account Requests");

      // Navigate to media applications list
      await page.click('a[href="/media-applications"]');
      await page.waitForURL("/media-applications");
      await expect(page.locator("h1")).toContainText("Select application to assess");

      // Verify pending applications table
      const table = page.locator("table");
      await expect(table).toBeVisible();
      const approvalRow = page.locator('tr:has-text("Test Media User"):has-text("Test News Corp")').first();
      await expect(approvalRow).toBeVisible();

      // View application details
      const viewLink = page.locator(`a[href*="/media-applications/${approvalApplicationId}"]`).first();
      await viewLink.click();
      await page.waitForURL(new RegExp(`/media-applications/${approvalApplicationId}`));
      await expect(page.locator("h1")).toContainText("Applicant's details");
      await expect(page.getByText("Test Media User")).toBeVisible();
      await expect(page.getByText("test-media@example.com")).toBeVisible();
      await expect(page.getByText("Test News Corp")).toBeVisible();

      // Navigate to approval confirmation page
      const approveButton = page.getByRole("button", { name: /approve application/i });
      await expect(approveButton).toBeVisible();
      await approveButton.click();
      await page.waitForURL(new RegExp(`/media-applications/${approvalApplicationId}/approve`));
      await expect(page.locator("h1")).toContainText("Are you sure you want to approve this application?");

      // Test validation error when no radio option selected
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page.locator(".govuk-error-summary")).toBeVisible();
      await expect(page.locator(".govuk-error-summary")).toContainText("An option must be selected");

      // Test selecting No returns to details page
      await page.check('input[value="no"]');
      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(new RegExp(`/media-applications/${approvalApplicationId}$`));
      await expect(page.locator("h1")).toContainText("Applicant's details");

      // Complete approval
      await page.goto(`/media-applications/${approvalApplicationId}/approve`);
      await page.check('input[value="yes"]');
      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(new RegExp(`/media-applications/${approvalApplicationId}/approved`));

      // Test Welsh on success page
      await page.goto(`/media-applications/${approvalApplicationId}/approved?lng=cy`);
      await expect(page.locator(".govuk-panel__title")).toContainText("gymeradwyo");

      // Test accessibility on success page
      await page.goto(`/media-applications/${approvalApplicationId}/approved`);
      const approvalAccessibility = await new AxeBuilder({ page }).disableRules(["target-size", "link-name", "region"]).analyze();
      expect(approvalAccessibility.violations).toEqual([]);

      // Verify success confirmation
      await expect(page.locator(".govuk-panel--confirmation")).toBeVisible();
      await expect(page.locator(".govuk-panel__title")).toContainText("Application has been approved");

      // Verify database update
      const { prisma } = await import("@hmcts/postgres");
      const updatedApplication = await prisma.mediaApplication.findUnique({
        where: { id: approvalApplicationId }
      });
      expect(updatedApplication?.status).toBe("APPROVED");

      // Verify approved application is not in pending list
      const testApp = await prisma.mediaApplication.create({
        data: {
          name: "Test User For Approval",
          email: "approval-test@example.com",
          employer: "Test News Corp",
          status: "PENDING"
        }
      });

      await page.goto(`/media-applications/${testApp.id}/approve`);
      await page.check('input[value="yes"]');
      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(new RegExp(`/media-applications/${testApp.id}/approved`));

      await page.goto("/media-applications");
      const row = page.locator('tr:has-text("Test User For Approval")');
      await expect(row).not.toBeVisible();

      await prisma.mediaApplication.delete({ where: { id: testApp.id } });
    });

    test("should complete media application rejection journey", async ({ page }) => {
      // Navigate to media applications list
      await page.goto("/media-applications");
      await expect(page.locator("h1")).toContainText("Select application to assess");

      // Verify rejection application in table
      const table = page.locator("table");
      await expect(table).toBeVisible();
      const rejectionRow = page.locator('tr:has-text("Test Rejection User"):has-text("Test Media Corp")').first();
      await expect(rejectionRow).toBeVisible();

      // View application details
      await page.goto(`/media-applications/${rejectionApplicationId}`);
      await expect(page.locator("h1")).toContainText("Applicant's details");

      // Navigate to rejection reasons page
      const rejectButton = page.getByRole("button", { name: /reject application/i });
      await expect(rejectButton).toBeVisible();
      await rejectButton.click();
      await page.waitForURL(new RegExp(`/media-applications/${rejectionApplicationId}/reject-reasons`));
      await expect(page.locator("h1")).toContainText("Why are you rejecting this application?");

      // Test validation error when no reason selected
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page.locator(".govuk-error-summary")).toBeVisible();
      await expect(page.locator(".govuk-error-summary")).toContainText("An option must be selected");

      // Select reasons and continue
      await page.check('input[name="notAccredited"]');
      await page.check('input[name="invalidId"]');
      await page.getByRole("button", { name: /continue/i }).click();

      await page.waitForURL(new RegExp(`/media-applications/${rejectionApplicationId}/reject`));
      await expect(page.locator("h1")).toContainText("Are you sure you want to reject this application?");

      // Test validation error on confirmation page when no radio option selected
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page.locator(".govuk-error-summary")).toBeVisible();
      await expect(page.locator(".govuk-error-summary")).toContainText("An option must be selected");

      // Test selecting No returns to details page
      await page.check('input[value="no"]');
      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(new RegExp(`/media-applications/${rejectionApplicationId}$`));
      await expect(page.locator("h1")).toContainText("Applicant's details");

      // Complete rejection
      await page.goto(`/media-applications/${rejectionApplicationId}/reject-reasons`);
      await page.check('input[name="notAccredited"]');
      await page.check('input[name="invalidId"]');
      await page.getByRole("button", { name: /continue/i }).click();

      await page.waitForURL(new RegExp(`/media-applications/${rejectionApplicationId}/reject`));
      await page.check('input[value="yes"]');
      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(new RegExp(`/media-applications/${rejectionApplicationId}/rejected`));

      // Test Welsh on success page
      await page.goto(`/media-applications/${rejectionApplicationId}/rejected?lng=cy`);
      await expect(page.locator(".govuk-panel__title")).toContainText("Mae'r cais wedi'i wrthod");

      // Test accessibility on success page
      await page.goto(`/media-applications/${rejectionApplicationId}/rejected`);
      const rejectionAccessibility = await new AxeBuilder({ page }).disableRules(["target-size", "link-name", "region"]).analyze();
      expect(rejectionAccessibility.violations).toEqual([]);

      // Verify success confirmation
      await expect(page.locator(".govuk-panel--confirmation")).toBeVisible();
      await expect(page.locator(".govuk-panel__title")).toContainText("Application has been rejected");

      // Verify database update
      const { prisma } = await import("@hmcts/postgres");
      const updatedApplication = await prisma.mediaApplication.findUnique({
        where: { id: rejectionApplicationId }
      });
      expect(updatedApplication?.status).toBe("REJECTED");
    });
  });

  test.describe("Role-Based Access Control", () => {
    test("Local Admin should not access media applications feature", async ({ page, context }) => {
      await context.clearCookies();
      await page.goto("/admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!, process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!);
      await page.waitForURL("/admin-dashboard");

      // Verify media applications tile is not visible
      const mediaApplicationsTile = page.locator('a.admin-tile[href="/media-applications"]');
      await expect(mediaApplicationsTile).not.toBeVisible();

      // Attempt to access media applications list directly
      await page.goto("/media-applications");
      await expect(page.locator("h1")).not.toContainText("Select application to assess");
    });
  });

  test.describe("Accessibility", () => {
    test("all media application pages should pass accessibility checks", async ({ page }) => {
      await page.goto("/admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_CTSC_ADMIN_EMAIL!, process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!);
      await page.waitForURL("/admin-dashboard");

      // Check media applications list page
      await page.goto("/media-applications");
      let scanResults = await new AxeBuilder({ page }).disableRules(["target-size", "link-name", "region"]).analyze();
      expect(scanResults.violations).toEqual([]);

      // Check application details page
      await page.goto(`/media-applications/${approvalApplicationId}`);
      scanResults = await new AxeBuilder({ page }).disableRules(["target-size", "link-name", "region"]).analyze();
      expect(scanResults.violations).toEqual([]);

      // Check approval confirmation page
      await page.goto(`/media-applications/${approvalApplicationId}/approve`);
      scanResults = await new AxeBuilder({ page }).disableRules(["target-size", "link-name", "region"]).analyze();
      expect(scanResults.violations).toEqual([]);

      // Check rejection reasons page
      await page.goto(`/media-applications/${rejectionApplicationId}/reject-reasons`);
      scanResults = await new AxeBuilder({ page }).disableRules(["target-size", "link-name", "region"]).analyze();
      expect(scanResults.violations).toEqual([]);

      // Check rejection confirmation page
      await page.check('input[name="notAccredited"]');
      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(new RegExp(`/media-applications/${rejectionApplicationId}/reject`));
      scanResults = await new AxeBuilder({ page }).disableRules(["target-size", "link-name", "region"]).analyze();
      expect(scanResults.violations).toEqual([]);
    });
  });

  test.describe("Welsh Language Support", () => {
    test("all media application pages should display Welsh content", async ({ page }) => {
      await page.goto("/admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_CTSC_ADMIN_EMAIL!, process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!);
      await page.waitForURL("/admin-dashboard");

      // Check Welsh on applications list
      await page.goto("/media-applications?lng=cy");
      await expect(page.locator("h1")).toContainText("Dewiswch gais i'w asesu");

      // Check Welsh on application details
      await page.goto(`/media-applications/${approvalApplicationId}?lng=cy`);
      await expect(page.locator("h1")).toContainText("Manylion yr ymgeisydd");

      // Check Welsh on approval confirmation
      await page.goto(`/media-applications/${approvalApplicationId}/approve?lng=cy`);
      await expect(page.locator("h1")).toContainText("A ydych yn siŵr eich bod am gymeradwyo'r cais hwn?");

      // Check Welsh on rejection reasons page
      await page.goto(`/media-applications/${rejectionApplicationId}/reject-reasons?lng=cy`);
      await expect(page.locator("h1")).toContainText("Pam ydych chi'n gwrthod y cais hwn?");

      // Check Welsh on rejection confirmation page
      await page.check('input[name="notAccredited"]');
      await page.getByRole("button", { name: /parhau/i }).click();
      await page.waitForURL(new RegExp(`/media-applications/${rejectionApplicationId}/reject`));
      await expect(page.locator("h1")).toContainText("A ydych yn siŵr eich bod am wrthod y cais hwn?");
    });
  });
});
