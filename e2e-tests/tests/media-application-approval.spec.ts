import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../utils/sso-helpers.js";

test.describe("Media Application Approval Workflow", () => {
	let applicationId: string;

	test.beforeAll(async () => {
		// Create a test application in the database
		const { prisma } = await import("@hmcts/postgres");

		const application = await prisma.mediaApplication.create({
			data: {
				name: "Test Media User",
				email: "test-media@example.com",
				employer: "Test News Corp",
				status: "PENDING",
				proofOfIdPath: null,
			},
		});

		applicationId = application.id;
	});

	test.afterAll(async () => {
		// Clean up test data
		const { prisma } = await import("@hmcts/postgres");

		if (applicationId) {
			await prisma.mediaApplication.delete({
				where: { id: applicationId },
			}).catch(() => {
				// Ignore if already deleted
			});
		}
	});

	test.describe("CTSC Admin Access", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/admin-dashboard");
			await loginWithSSO(
				page,
				process.env.SSO_TEST_CTSC_ADMIN_EMAIL!,
				process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!,
			);
			await page.waitForURL("/admin-dashboard");
		});

		test("should display media applications tile on admin dashboard", async ({ page }) => {
			const mediaApplicationsTile = page.locator('a.admin-tile[href="/media-applications"]');
			await expect(mediaApplicationsTile).toBeVisible();
			await expect(mediaApplicationsTile).toContainText("Select application to assess");
		});

		test("should navigate to media applications list", async ({ page }) => {
			await page.click('a[href="/media-applications"]');
			await page.waitForURL("/media-applications");

			await expect(page.locator("h1")).toContainText("Select application to assess");
		});

		test("should display pending applications in table", async ({ page }) => {
			await page.goto("/media-applications");

			// Check for table
			const table = page.locator("table");
			await expect(table).toBeVisible();

			// Check for our test application
			const row = page.locator(`tr:has-text("${applicationId.substring(0, 8)}")`);
			await expect(row).toBeVisible();
		});

		test("should view application details", async ({ page }) => {
			await page.goto("/media-applications");

			// Click on the first application
			const viewLink = page.locator(`a[href*="/media-applications/${applicationId}"]`).first();
			await viewLink.click();

			await page.waitForURL(new RegExp(`/media-applications/${applicationId}`));

			// Verify details are displayed
			await expect(page.locator("h1")).toContainText("Applicant's details");
			await expect(page.getByText("Test Media User")).toBeVisible();
			await expect(page.getByText("test-media@example.com")).toBeVisible();
			await expect(page.getByText("Test News Corp")).toBeVisible();
		});

		test("should navigate to approval confirmation page", async ({ page }) => {
			await page.goto(`/media-applications/${applicationId}`);

			const approveButton = page.getByRole("button", { name: /approve application/i });
			await expect(approveButton).toBeVisible();
			await approveButton.click();

			await page.waitForURL(new RegExp(`/media-applications/${applicationId}/approve`));

			await expect(page.locator("h1")).toContainText("Are you sure you want to approve this application?");
		});

		test("should show validation error when no radio option selected", async ({ page }) => {
			await page.goto(`/media-applications/${applicationId}/approve`);

			await page.getByRole("button", { name: /continue/i }).click();

			await expect(page.locator(".govuk-error-summary")).toBeVisible();
			await expect(page.locator(".govuk-error-summary")).toContainText("Select yes or no before continuing");
		});

		test("should return to details page when selecting No", async ({ page }) => {
			await page.goto(`/media-applications/${applicationId}/approve`);

			await page.check('input[value="no"]');
			await page.getByRole("button", { name: /continue/i }).click();

			await page.waitForURL(new RegExp(`/media-applications/${applicationId}$`));
			await expect(page.locator("h1")).toContainText("Applicant's details");
		});

		test("should complete approval workflow", async ({ page }) => {
			await page.goto(`/media-applications/${applicationId}/approve`);

			// Select Yes
			await page.check('input[value="yes"]');
			await page.getByRole("button", { name: /continue/i }).click();

			// Wait for approval confirmation page
			await page.waitForURL(new RegExp(`/media-applications/${applicationId}/approved`));

			// Verify success panel
			await expect(page.locator(".govuk-panel--confirmation")).toBeVisible();
			await expect(page.locator(".govuk-panel__title")).toContainText("Application has been approved");

			// Verify database update
			const { prisma } = await import("@hmcts/postgres");
			const updatedApplication = await prisma.mediaApplication.findUnique({
				where: { id: applicationId },
			});

			expect(updatedApplication?.status).toBe("APPROVED");
			expect(updatedApplication?.reviewedDate).not.toBeNull();
			expect(updatedApplication?.reviewedBy).not.toBeNull();
		});

		test("should not show approved application in pending list", async ({ page }) => {
			// First approve the application
			await page.goto(`/media-applications/${applicationId}/approve`);
			await page.check('input[value="yes"]');
			await page.getByRole("button", { name: /continue/i }).click();
			await page.waitForURL(new RegExp(`/media-applications/${applicationId}/approved`));

			// Navigate back to applications list
			await page.goto("/media-applications");

			// The approved application should not appear in the pending list
			const row = page.locator(`tr:has-text("${applicationId.substring(0, 8)}")`);
			await expect(row).not.toBeVisible();
		});
	});

	test.describe("Role-Based Access Control", () => {
		test("Local Admin should not see media applications tile", async ({ page, context }) => {
			await context.clearCookies();
			await page.goto("/admin-dashboard");
			await loginWithSSO(
				page,
				process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
				process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!,
			);
			await page.waitForURL("/admin-dashboard");

			const mediaApplicationsTile = page.locator('a.admin-tile[href="/media-applications"]');
			await expect(mediaApplicationsTile).not.toBeVisible();
		});

		test("Local Admin should not access media applications list", async ({ page, context }) => {
			await context.clearCookies();
			await page.goto("/admin-dashboard");
			await loginWithSSO(
				page,
				process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
				process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!,
			);

			// Try to navigate directly
			await page.goto("/media-applications");

			// Should be redirected or shown error
			await expect(page.locator("h1")).not.toContainText("Select application to assess");
		});
	});

	test.describe("Accessibility", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/admin-dashboard");
			await loginWithSSO(
				page,
				process.env.SSO_TEST_CTSC_ADMIN_EMAIL!,
				process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!,
			);
			await page.waitForURL("/admin-dashboard");
		});

		test("media applications list page should pass accessibility checks", async ({ page }) => {
			await page.goto("/media-applications");

			const accessibilityScanResults = await new AxeBuilder({ page })
				.disableRules(["target-size", "link-name", "region"])
				.analyze();

			expect(accessibilityScanResults.violations).toEqual([]);
		});

		test("application details page should pass accessibility checks", async ({ page }) => {
			await page.goto(`/media-applications/${applicationId}`);

			const accessibilityScanResults = await new AxeBuilder({ page })
				.disableRules(["target-size", "link-name", "region"])
				.analyze();

			expect(accessibilityScanResults.violations).toEqual([]);
		});

		test("approval confirmation page should pass accessibility checks", async ({ page }) => {
			await page.goto(`/media-applications/${applicationId}/approve`);

			const accessibilityScanResults = await new AxeBuilder({ page })
				.disableRules(["target-size", "link-name", "region"])
				.analyze();

			expect(accessibilityScanResults.violations).toEqual([]);
		});

		test("approved success page should pass accessibility checks", async ({ page }) => {
			// Create a fresh application for this test
			const { prisma } = await import("@hmcts/postgres");
			const testApp = await prisma.mediaApplication.create({
				data: {
					name: "Test User For Accessibility",
					email: "accessibility-test@example.com",
					employer: "Test Corp",
					status: "PENDING",
				},
			});

			await page.goto(`/media-applications/${testApp.id}/approve`);
			await page.check('input[value="yes"]');
			await page.getByRole("button", { name: /continue/i }).click();
			await page.waitForURL(new RegExp(`/media-applications/${testApp.id}/approved`));

			const accessibilityScanResults = await new AxeBuilder({ page })
				.disableRules(["target-size", "link-name", "region"])
				.analyze();

			expect(accessibilityScanResults.violations).toEqual([]);

			// Cleanup
			await prisma.mediaApplication.delete({ where: { id: testApp.id } });
		});
	});

	test.describe("Welsh Language Support", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/admin-dashboard");
			await loginWithSSO(
				page,
				process.env.SSO_TEST_CTSC_ADMIN_EMAIL!,
				process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!,
			);
			await page.waitForURL("/admin-dashboard");
		});

		test("should display Welsh content on applications list", async ({ page }) => {
			await page.goto("/media-applications?lng=cy");

			await expect(page.locator("h1")).toContainText("Dewiswch gais i'w asesu");
		});

		test("should display Welsh content on application details", async ({ page }) => {
			await page.goto(`/media-applications/${applicationId}?lng=cy`);

			await expect(page.locator("h1")).toContainText("Manylion yr ymgeisydd");
		});

		test("should display Welsh content on approval confirmation", async ({ page }) => {
			await page.goto(`/media-applications/${applicationId}/approve?lng=cy`);

			await expect(page.locator("h1")).toContainText(
				"A ydych yn siŵr eich bod am gymeradwyo'r cais hwn?",
			);
		});
	});
});
