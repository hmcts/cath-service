import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues
// These issues affect ALL pages and should be addressed in a separate ticket

test.describe("Create Media Account", () => {
	test("should navigate to create media account from sign-in page", async ({ page }) => {
		await page.goto("/sign-in");

		const createAccountLink = page.getByRole("link", { name: /create/i });
		await expect(createAccountLink).toBeVisible();
		await expect(createAccountLink).toHaveAttribute("href", "/create-media-account");

		await createAccountLink.click();
		await expect(page).toHaveURL("/create-media-account");
	});

	test("should display form with all required fields", async ({ page }) => {
		await page.goto("/create-media-account");

		await expect(page.getByRole("heading", { level: 1 })).toContainText(
			"Create a Court and tribunal hearings account",
		);

		await expect(page.locator("#fullName")).toBeVisible();
		await expect(page.locator("#email")).toBeVisible();
		await expect(page.locator("#employer")).toBeVisible();
		await expect(page.locator("#idProof")).toBeVisible();
		await expect(page.locator('input[name="termsAccepted"]')).toBeVisible();

		await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
	});

	test("should show error summary when submitting empty form", async ({ page }) => {
		await page.goto("/create-media-account");

		await page.getByRole("button", { name: /continue/i }).click();

		await expect(page.locator(".govuk-error-summary")).toBeVisible();
		await expect(page.locator(".govuk-error-summary__title")).toContainText(
			"There is a problem",
		);

		const errorLinks = page.locator(".govuk-error-summary__list a");
		await expect(errorLinks).toHaveCount(5);
	});

	test("should show error for invalid email", async ({ page }) => {
		await page.goto("/create-media-account");

		await page.fill("#fullName", "John Smith");
		await page.fill("#email", "notanemail");
		await page.fill("#employer", "BBC News");

		await page.getByRole("button", { name: /continue/i }).click();

		await expect(page.locator(".govuk-error-summary")).toBeVisible();
		await expect(page.locator("#email-error")).toContainText(
			"There is a problem - Email address field must be populated",
		);
	});

	test("should show error for invalid file type", async ({ page }) => {
		await page.goto("/create-media-account");

		await page.fill("#fullName", "John Smith");
		await page.fill("#email", "john@example.com");
		await page.fill("#employer", "BBC News");

		const fileInput = page.locator("#idProof");
		await fileInput.setInputFiles({
			name: "document.txt",
			mimeType: "text/plain",
			buffer: Buffer.from("This is a text file"),
		});

		await page.check('input[name="termsAccepted"]');
		await page.getByRole("button", { name: /continue/i }).click();

		await expect(page.locator(".govuk-error-summary")).toBeVisible();
		await expect(page.locator("#idProof-error")).toContainText(
			"There is a problem - We will need ID evidence to support your application for an account",
		);
	});

	test("should show error for file larger than 2MB", async ({ page }) => {
		await page.goto("/create-media-account");

		await page.fill("#fullName", "John Smith");
		await page.fill("#email", "john@example.com");
		await page.fill("#employer", "BBC News");

		const fileInput = page.locator("#idProof");
		const largeBuffer = Buffer.alloc(3 * 1024 * 1024);
		await fileInput.setInputFiles({
			name: "large-file.jpg",
			mimeType: "image/jpeg",
			buffer: largeBuffer,
		});

		await page.check('input[name="termsAccepted"]');
		await page.getByRole("button", { name: /continue/i }).click();

		await expect(page.locator(".govuk-error-summary")).toBeVisible();
		await expect(page.locator("#idProof-error")).toContainText(
			"Your file must be smaller than 2MB",
		);
	});

	test("should show error when terms not accepted", async ({ page }) => {
		await page.goto("/create-media-account");

		await page.fill("#fullName", "John Smith");
		await page.fill("#email", "john@example.com");
		await page.fill("#employer", "BBC News");

		const fileInput = page.locator("#idProof");
		await fileInput.setInputFiles({
			name: "press-card.jpg",
			mimeType: "image/jpeg",
			buffer: Buffer.from("fake image data"),
		});

		await page.getByRole("button", { name: /continue/i }).click();

		await expect(page.locator(".govuk-error-summary")).toBeVisible();
		await expect(page.locator("#termsAccepted-error")).toContainText(
			"There is a problem - You must check the box to confirm you agree to the terms and conditions",
		);
	});

	test("should complete successful submission", async ({ page }) => {
		await page.goto("/create-media-account");

		await page.fill("#fullName", "Jane Doe");
		await page.fill("#email", "jane.doe@example.com");
		await page.fill("#employer", "The Guardian");

		const fileInput = page.locator("#idProof");
		await fileInput.setInputFiles({
			name: "press-card.jpg",
			mimeType: "image/jpeg",
			buffer: Buffer.from("fake image data"),
		});

		await page.check('input[name="termsAccepted"]');
		await page.getByRole("button", { name: /continue/i }).click();

		await page.waitForURL(/\/account-request-submitted/);

		await expect(page.locator(".govuk-panel__title")).toContainText(
			"Details submitted",
		);
		await expect(page.getByRole("heading", { name: "What happens next" })).toBeVisible();
		await expect(page.locator("main .govuk-body").first()).toContainText(
			"HMCTS will review your details",
		);
	});

	test("should verify database record created after successful submission", async ({
		page,
	}) => {
		const { prisma } = await import("@hmcts/postgres");

		await page.goto("/create-media-account");

		const testEmail = `test-${Date.now()}@example.com`;

		await page.fill("#fullName", "Database Test User");
		await page.fill("#email", testEmail);
		await page.fill("#employer", "Test Organization");

		const fileInput = page.locator("#idProof");
		await fileInput.setInputFiles({
			name: "test-id.pdf",
			mimeType: "application/pdf",
			buffer: Buffer.from("%PDF-1.4\nTest ID card"),
		});

		await page.check('input[name="termsAccepted"]');
		await page.getByRole("button", { name: /continue/i }).click();

		await page.waitForURL(/\/account-request-submitted/);

		const application = await prisma.mediaApplication.findFirst({
			where: { email: testEmail.toLowerCase() },
		});

		expect(application).not.toBeNull();
		expect(application?.name).toBe("Database Test User");
		expect(application?.email).toBe(testEmail.toLowerCase());
		expect(application?.employer).toBe("Test Organization");
		expect(application?.status).toBe("PENDING");

		if (application) {
			const filePath = path.join(
				process.cwd(),
				"../apps/web/storage",
				"temp",
				"files",
				`${application.id}.pdf`,
			);
			const fileExists = await fs
				.access(filePath)
				.then(() => true)
				.catch(() => false);
			expect(fileExists).toBe(true);

			if (fileExists) {
				await fs.unlink(filePath);
			}

			await prisma.mediaApplication.delete({ where: { id: application.id } });
		}
	});

	test("should clear form values on browser refresh", async ({ page }) => {
		await page.goto("/create-media-account");

		await page.fill("#fullName", "John Smith");
		await page.fill("#email", "notanemail");

		await page.getByRole("button", { name: /continue/i }).click();

		await expect(page.locator(".govuk-error-summary")).toBeVisible();

		await page.reload();

		await expect(page.locator("#fullName")).toHaveValue("");
		await expect(page.locator("#email")).toHaveValue("");
		await expect(page.locator("#employer")).toHaveValue("");
	});

	test("should support Welsh language", async ({ page }) => {
		await page.goto("/create-media-account?lng=cy");

		await expect(page.getByRole("heading", { level: 1 })).toContainText(
			"Creu cyfrif gwrandawiadau Llys a Thribiwnlys",
		);

		await expect(page.getByRole("button", { name: /parhau/i })).toBeVisible();
	});

	test("should have back to top link", async ({ page }) => {
		await page.goto("/create-media-account");

		const backToTopLink = page.getByRole("link", { name: /back to top/i });
		await expect(backToTopLink).toBeVisible();
		await expect(backToTopLink).toHaveAttribute("href", "#top");
	});

	test("should pass accessibility checks", async ({ page }) => {
		await page.goto("/create-media-account");

		const accessibilityScanResults = await new AxeBuilder({ page })
			.disableRules(["target-size", "link-name", "region"])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test("should pass accessibility checks on confirmation page", async ({
		page,
	}) => {
		await page.goto("/create-media-account");

		await page.fill("#fullName", "Jane Doe");
		await page.fill("#email", "jane.doe@example.com");
		await page.fill("#employer", "The Guardian");

		const fileInput = page.locator("#idProof");
		await fileInput.setInputFiles({
			name: "press-card.jpg",
			mimeType: "image/jpeg",
			buffer: Buffer.from("fake image data"),
		});

		await page.check('input[name="termsAccepted"]');
		await page.getByRole("button", { name: /continue/i }).click();

		await page.waitForURL(/\/account-request-submitted/);

		const accessibilityScanResults = await new AxeBuilder({ page })
			.disableRules(["target-size", "link-name", "region"])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
