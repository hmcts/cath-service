import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../../utils/sso-helpers.js";
import { generateTestEmail, prefixName } from "../../utils/test-prefix.js";
import { createTestMediaApplication, getTestMediaApplication } from "../../utils/test-support-api.js";

test.describe("Media Application Management", () => {
  let approvalApplicantName: string;
  let approvalApplicationId: string;
  let rejectionApplicationId: string;
  let proofOfIdApplicationId: string;

  test.beforeAll(async () => {
    // fullyParallel runs this hook once per worker and again on retry, so the name must be unique per run
    // of the hook, otherwise the "View application for <name>" link matches several rows
    approvalApplicantName = prefixName(`Test Media User ${randomUUID().slice(0, 8)}`);

    const approvalApp = (await createTestMediaApplication({
      name: approvalApplicantName,
      email: generateTestEmail("media-approval"),
      employer: "Test News Corp",
      status: "PENDING",
      proofOfIdPath: null
    })) as { id: string };

    const rejectionApp = (await createTestMediaApplication({
      name: prefixName("Test Rejection User"),
      email: generateTestEmail("media-rejection"),
      employer: "Test Media Corp",
      status: "PENDING",
      proofOfIdPath: null
    })) as { id: string };

    // Only viewed, never approved or rejected, so the placeholder blob key is never deleted
    const proofOfIdApp = (await createTestMediaApplication({
      name: prefixName("Test Proof Of Id User"),
      email: generateTestEmail("media-proof-of-id"),
      employer: "Test Proof Corp",
      status: "PENDING",
      proofOfIdPath: "e2e-placeholder-proof-of-id.pdf"
    })) as { id: string };

    approvalApplicationId = approvalApp.id;
    rejectionApplicationId = rejectionApp.id;
    proofOfIdApplicationId = proofOfIdApp.id;
  });

  test("CTSC Admin can complete media application approval journey with validation, Welsh, and accessibility", async ({ page }) => {
    // Login as CTSC Admin
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_CTSC_ADMIN_EMAIL!, process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!);
    await page.waitForURL("/admin-dashboard");

    // STEP 1: Verify media applications tile on admin dashboard
    const mediaApplicationsTile = page.locator('a.admin-tile[href="/media-applications"]');
    await expect(mediaApplicationsTile).toBeVisible();
    await expect(mediaApplicationsTile).toContainText("Manage Media Account Requests");

    // STEP 2: Navigate to media applications list and test accessibility
    await page.click('a[href="/media-applications"]');
    await page.waitForURL("/media-applications");
    await expect(page.locator("h1")).toContainText("Select application to assess");

    let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["target-size", "region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 3: Test Welsh on applications list
    await page.goto("/media-applications?lng=cy");
    await expect(page.locator("h1")).toContainText("Dewiswch gais i'w asesu");

    // STEP 4: Navigate back to English and verify application in table
    await page.goto("/media-applications");
    const table = page.locator("table");
    await expect(table).toBeVisible();
    const approvalRow = page.locator('tr:has-text("Test Media User"):has-text("Test News Corp")').first();
    await expect(approvalRow).toBeVisible();

    // STEP 5: View application details and test accessibility
    // The View link's accessible name includes the applicant, so each link in the table is unique
    const viewLink = page.getByRole("link", { name: `View application for ${approvalApplicantName}`, exact: true });
    await expect(viewLink).toHaveAttribute("href", `/media-applications/${approvalApplicationId}`);
    await viewLink.click();
    await page.waitForURL(new RegExp(`/media-applications/${approvalApplicationId}`));
    await expect(page.locator("h1")).toContainText("Applicant's details");
    await expect(page.getByText("Test Media User")).toBeVisible();
    await expect(page.getByText("@test.hmcts.net")).toBeVisible();
    await expect(page.getByText("Test News Corp")).toBeVisible();

    // Approve and Reject sit together, left-aligned, in that order
    const buttonGroup = page.locator(".govuk-button-group").filter({ has: page.getByRole("button", { name: /approve application/i }) });
    const groupedButtons = buttonGroup.getByRole("button");
    await expect(groupedButtons).toHaveCount(2);
    await expect(groupedButtons.nth(0)).toHaveText(/approve application/i);
    await expect(groupedButtons.nth(1)).toHaveText(/reject application/i);

    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["target-size", "region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // The proof of ID link starts with its visible text "View" and says it opens in a new tab
    await page.goto(`/media-applications/${proofOfIdApplicationId}`);
    const proofOfIdLink = page.getByRole("link", { name: "View proof of ID (opens in new tab)", exact: true });
    await expect(proofOfIdLink).toBeVisible();
    await expect(proofOfIdLink).not.toHaveAttribute("aria-label", /.*/);
    await expect(proofOfIdLink).toHaveAttribute("target", "_blank");

    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["target-size", "region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 6: Test Welsh on application details
    await page.goto(`/media-applications/${approvalApplicationId}?lng=cy`);
    await expect(page.locator("h1")).toContainText("Manylion yr ymgeisydd");

    // STEP 7: Navigate to approval confirmation page
    await page.goto(`/media-applications/${approvalApplicationId}`);
    const approveButton = page.getByRole("button", { name: /approve application/i });
    await expect(approveButton).toBeVisible();
    await approveButton.click();
    await page.waitForURL(new RegExp(`/media-applications/${approvalApplicationId}/approve`));
    await expect(page.locator("h1")).toContainText("Are you sure you want to approve this application?");

    // STEP 8: Test validation - no radio option selected
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(page.locator(".govuk-error-summary")).toContainText("An option must be selected");

    // STEP 9: Test accessibility on approval confirmation page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["target-size", "link-name", "region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 10: Test Welsh on approval confirmation
    await page.goto(`/media-applications/${approvalApplicationId}/approve?lng=cy`);
    await expect(page.locator("h1")).toContainText("A ydych yn siŵr eich bod am gymeradwyo'r cais hwn?");

    // STEP 11: Test selecting No returns to details page
    await page.goto(`/media-applications/${approvalApplicationId}/approve`);
    await page.check('input[value="no"]');
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(new RegExp(`/media-applications/${approvalApplicationId}$`));
    await expect(page.locator("h1")).toContainText("Applicant's details");

    // STEP 12: Complete approval
    await page.goto(`/media-applications/${approvalApplicationId}/approve`);
    await page.check('input[value="yes"]');
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(new RegExp(`/media-applications/${approvalApplicationId}/approved`));

    // STEP 13: Verify success page and test Welsh
    await expect(page.locator(".govuk-panel--confirmation")).toBeVisible();
    await expect(page.locator(".govuk-panel__title")).toContainText("Application has been approved");

    await page.goto(`/media-applications/${approvalApplicationId}/approved?lng=cy`);
    await expect(page.locator(".govuk-panel__title")).toContainText("gymeradwyo");

    // STEP 14: Test accessibility on success page
    await page.goto(`/media-applications/${approvalApplicationId}/approved`);
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["target-size", "link-name", "region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 15: Verify database update
    const updatedApplication = (await getTestMediaApplication(approvalApplicationId)) as { status: string } | null;
    expect(updatedApplication?.status).toBe("APPROVED");
  });

  test("CTSC Admin can complete media application rejection journey with validation, Welsh, and accessibility", async ({ page }) => {
    // Login as CTSC Admin
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_CTSC_ADMIN_EMAIL!, process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!);
    await page.waitForURL("/admin-dashboard");

    // STEP 1: Navigate to media applications list
    await page.goto("/media-applications");
    await expect(page.locator("h1")).toContainText("Select application to assess");

    // STEP 2: Verify rejection application in table
    const table = page.locator("table");
    await expect(table).toBeVisible();
    const rejectionRow = page.locator('tr:has-text("Test Rejection User"):has-text("Test Media Corp")').first();
    await expect(rejectionRow).toBeVisible();

    // STEP 3: View application details
    await page.goto(`/media-applications/${rejectionApplicationId}`);
    await expect(page.locator("h1")).toContainText("Applicant's details");

    // STEP 4: Navigate to rejection reasons page
    const rejectButton = page.getByRole("button", { name: /reject application/i });
    await expect(rejectButton).toBeVisible();
    await rejectButton.click();
    await page.waitForURL(new RegExp(`/media-applications/${rejectionApplicationId}/reject-reasons`));
    await expect(page.locator("h1")).toContainText("Select rejection reasons");
    await expect(page.getByRole("group", { name: "Why are you rejecting this application?" })).toBeVisible();

    // STEP 5: Test validation - no reason selected
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(page.locator(".govuk-error-summary")).toContainText("Select at least one reason for rejection");

    // STEP 6: Test accessibility on rejection reasons page
    let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["target-size", "link-name", "region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 7: Test Welsh on rejection reasons page
    await page.goto(`/media-applications/${rejectionApplicationId}/reject-reasons?lng=cy`);
    await expect(page.locator("h1")).toContainText("Dewiswch resymau dros wrthod");

    // STEP 8: Select reasons and continue
    await page.goto(`/media-applications/${rejectionApplicationId}/reject-reasons`);
    await page.check('input[name="notAccredited"]');
    await page.check('input[name="invalidId"]');
    await page.getByRole("button", { name: /continue/i }).click();

    await page.waitForURL(new RegExp(`/media-applications/${rejectionApplicationId}/reject`));
    await expect(page.locator("h1")).toContainText("Are you sure you want to reject this application?");

    // STEP 9: Test validation on confirmation page
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.locator(".govuk-error-summary")).toBeVisible();
    await expect(page.locator(".govuk-error-summary")).toContainText("An option must be selected");

    // STEP 10: Test accessibility on rejection confirmation page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["target-size", "link-name", "region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 11: Test Welsh on rejection confirmation page
    await page.goto(`/media-applications/${rejectionApplicationId}/reject-reasons`);
    await page.check('input[name="notAccredited"]');
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(new RegExp(`/media-applications/${rejectionApplicationId}/reject`));

    await page.goto(`/media-applications/${rejectionApplicationId}/reject?lng=cy`);
    await expect(page.locator("h1")).toContainText("Ydych chi'n siŵr eich bod chi eisiau gwrthod y cais hwn?");

    // STEP 12: Test selecting No returns to details page
    await page.goto(`/media-applications/${rejectionApplicationId}/reject-reasons`);
    await page.check('input[name="notAccredited"]');
    await page.getByRole("button", { name: /continue/i }).click();
    await page.check('input[value="no"]');
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(new RegExp(`/media-applications/${rejectionApplicationId}$`));
    await expect(page.locator("h1")).toContainText("Applicant's details");

    // STEP 13: Complete rejection
    await page.goto(`/media-applications/${rejectionApplicationId}/reject-reasons`);
    await page.check('input[name="notAccredited"]');
    await page.check('input[name="invalidId"]');
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(new RegExp(`/media-applications/${rejectionApplicationId}/reject`));
    await page.check('input[value="yes"]');
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(new RegExp(`/media-applications/${rejectionApplicationId}/rejected`));

    // STEP 14: Verify success page and test Welsh
    await expect(page.locator(".govuk-panel--confirmation")).toBeVisible();
    await expect(page.locator(".govuk-panel__title")).toContainText("Application has been rejected");

    await page.goto(`/media-applications/${rejectionApplicationId}/rejected?lng=cy`);
    await expect(page.locator(".govuk-panel__title")).toContainText("Mae'r cais wedi cael ei wrthod");

    // STEP 15: Test accessibility on success page
    await page.goto(`/media-applications/${rejectionApplicationId}/rejected`);
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["target-size", "link-name", "region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 16: Verify database update
    const updatedApplication = (await getTestMediaApplication(rejectionApplicationId)) as { status: string } | null;
    expect(updatedApplication?.status).toBe("REJECTED");
  });

  test("Local Admin should not access media applications feature @nightly", async ({ page, context }) => {
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
