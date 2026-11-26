import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { axeCheck } from "../../utils/axe-helper.js";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import { createNotificationSubscriber, createTestSubscription, getGovNotifyEmail, getNotificationsBySubscriptionId } from "../../utils/notification-helpers.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";
import { checkFlatFileExists, getLatestArtefactByLocationAndListType, getListTypeByName, getListTypeOptionLabel } from "../../utils/test-support-api.js";

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues

// Option values are list_type.id, which is autoincrement and differs per environment, so options are chosen by label
const LIST_TYPE_NAMES = {
  civilDaily: "CIVIL_DAILY_CAUSE_LIST",
  familyDaily: "FAMILY_DAILY_CAUSE_LIST",
  crownDaily: "CROWN_DAILY_PDDA_LIST",
  crownFirm: "CROWN_FIRM_PDDA_LIST",
  civilAndFamily: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST"
} as const;

let testLocationId: number;
let listTypeLabels: Record<keyof typeof LIST_TYPE_NAMES, string>;

async function authenticateSystemAdmin(page: Page) {
  await page.goto("/system-admin-dashboard");
  if (page.url().includes("login.microsoftonline.com")) {
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
  }
}

test.describe("Manual Upload", () => {
  test.beforeAll(async () => {
    const testLocation = await createUniqueTestLocation({ namePrefix: "Manual Upload Court" });
    testLocationId = testLocation.locationId;
    listTypeLabels = await resolveListTypeLabels();
  });

  test.beforeEach(async ({ page }) => {
    await authenticateSystemAdmin(page);
  });

  test("complete manual upload journey with form validation, summary, success, Welsh, and accessibility", async ({ page }) => {
    // STEP 1: Load form page and verify all elements
    await page.goto("/manual-upload");
    await expect(page).toHaveTitle("Upload - Manual upload - Court and tribunal hearings - GOV.UK");

    const heading = page.getByRole("heading", { name: /manual upload/i });
    await expect(heading).toBeVisible();

    // Verify form fields exist
    const fileUpload = page.locator('input[name="file"]');
    await expect(fileUpload).toBeVisible();
    ("");

    const courtInput = page.getByRole("combobox", { name: /court name or tribunal name/i });
    await courtInput.waitFor({ state: "visible", timeout: 10000 });
    await expect(courtInput).toBeVisible();

    await expect(page.locator('select[name="listType"]')).toBeVisible();
    await expect(page.locator('input[name="hearingStartDate-day"]')).toBeVisible();
    await expect(page.locator('select[name="sensitivity"]')).toBeVisible();
    await expect(page.locator('select[name="language"]')).toBeVisible();
    await expect(page.locator('input[name="displayFrom-day"]')).toBeVisible();
    await expect(page.locator('input[name="displayTo-day"]')).toBeVisible();

    // STEP 2: Test empty form validation
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL("/manual-upload");

    let errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();

    const fileErrorMessage = page.locator("#file").locator("..").locator(".govuk-error-message");
    await expect(fileErrorMessage).toBeVisible();

    // STEP 3: Test accessibility with error state
    let accessibilityScanResults = await axeCheck(page).disableRules(["target-size", "link-name"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 4: Test invalid file type validation
    await page.goto(`/manual-upload?locationId=${testLocationId}`);
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="listType"]', { label: listTypeLabels.civilDaily });
    await page.fill('input[name="hearingStartDate-day"]', "15");
    await page.fill('input[name="hearingStartDate-month"]', "06");
    await page.fill('input[name="hearingStartDate-year"]', "2025");
    await page.selectOption('select[name="sensitivity"]', "PUBLIC");
    await page.selectOption('select[name="language"]', "ENGLISH");
    await page.fill('input[name="displayFrom-day"]', "10");
    await page.fill('input[name="displayFrom-month"]', "06");
    await page.fill('input[name="displayFrom-year"]', "2025");
    await page.fill('input[name="displayTo-day"]', "20");
    await page.fill('input[name="displayTo-month"]', "06");
    await page.fill('input[name="displayTo-year"]', "2025");

    const fileInput = page.locator('input[name="file"]');
    await fileInput.setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("test content")
    });

    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/\/manual-upload/);

    errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    const errorLink = errorSummary.getByRole("link", { name: /please upload a valid file format/i });
    await expect(errorLink).toBeVisible();

    // STEP 5: Test file size validation
    const largeBuffer = Buffer.alloc(3 * 1024 * 1024);
    await fileInput.setInputFiles({
      name: "large-file.pdf",
      mimeType: "application/pdf",
      buffer: largeBuffer
    });

    await page.getByRole("button", { name: /continue/i }).click();
    errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary.getByRole("link", { name: /file too large/i })).toBeVisible();

    // STEP 6: Test date range validation
    await fileInput.setInputFiles({
      name: "test.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("test content")
    });
    await page.fill('input[name="displayFrom-day"]', "20");
    await page.fill('input[name="displayTo-day"]', "10"); // Invalid: to before from

    await page.getByRole("button", { name: /continue/i }).click();
    errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary.getByRole("link", { name: /display to date must be after display from date/i })).toBeVisible();

    // STEP 7: Complete valid form submission
    await page.goto(`/manual-upload?locationId=${testLocationId}`);
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="listType"]', { label: listTypeLabels.crownDaily });
    await page.fill('input[name="hearingStartDate-day"]', "23");
    await page.fill('input[name="hearingStartDate-month"]', "10");
    await page.fill('input[name="hearingStartDate-year"]', "2025");
    await page.selectOption('select[name="sensitivity"]', "PUBLIC");
    await page.selectOption('select[name="language"]', "ENGLISH");
    await page.fill('input[name="displayFrom-day"]', "20");
    await page.fill('input[name="displayFrom-month"]', "10");
    await page.fill('input[name="displayFrom-year"]', "2025");
    await page.fill('input[name="displayTo-day"]', "30");
    await page.fill('input[name="displayTo-month"]', "10");
    await page.fill('input[name="displayTo-year"]', "2025");

    await fileInput.setInputFiles({
      name: "test-hearing-list.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nTest hearing list content")
    });

    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/manual-upload-summary\?uploadId=/, { timeout: 10000 });

    // STEP 8: Verify summary page
    await expect(page.locator("h1")).toHaveText("File Upload Summary");

    const values = page.locator(".govuk-summary-list__value");
    await expect(values.nth(1)).toContainText("test-hearing-list.pdf");
    await expect(values.nth(2)).toContainText(listTypeLabels.crownDaily);
    await expect(values.nth(3)).toContainText("23 October 2025");
    await expect(values.nth(4)).toContainText("Public");
    await expect(values.nth(5)).toContainText("English");
    await expect(values.nth(6)).toContainText("20 October 2025 to 30 October 2025");

    // Verify change links
    const changeLinks = page.locator(".govuk-summary-list__actions a");
    await expect(changeLinks).toHaveCount(7);
    for (let i = 0; i < 7; i++) {
      await expect(changeLinks.nth(i)).toContainText("Change");
    }

    // Test accessibility on summary page
    accessibilityScanResults = await axeCheck(page).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 9: Confirm upload
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL("/manual-upload-success", { timeout: 10000 });

    // STEP 10: Verify success page
    const successPanel = page.locator(".govuk-panel");
    await expect(successPanel).toBeVisible();
    await expect(page.locator(".govuk-panel__title")).toHaveText("File Upload Successful");
    await expect(successPanel).toContainText("Your file has been uploaded");

    // Verify next steps links
    const uploadLink = page.getByRole("link", { name: "Upload another file" });
    await expect(uploadLink).toBeVisible();
    await expect(uploadLink).toHaveAttribute("href", "/manual-upload");

    const removeLink = page.getByRole("link", { name: "Remove file" });
    await expect(removeLink).toBeVisible();

    const homeLink = page.getByRole("link", { name: "Home" });
    await expect(homeLink).toBeVisible();

    // Test accessibility on success page
    accessibilityScanResults = await axeCheck(page).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 11: Test Welsh on success page
    await page.goto("/manual-upload-success?lng=cy");
    await expect(page.locator(".govuk-panel__title")).toHaveText("Wedi llwyddo i uwchlwytho ffeiliau");
    await expect(page.getByRole("heading", { name: "Beth yr ydych eisiau ei wneud nesaf?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "uwchlwytho ffeil arall" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dileu ffeil" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tudalen hafan" })).toBeVisible();

    // STEP 12: Test keyboard navigation - navigate back to upload (from Welsh page)
    const welshUploadLink = page.getByRole("link", { name: "uwchlwytho ffeil arall" });
    await welshUploadLink.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/manual-upload");
  });

  test("court name validation and autocomplete functionality @nightly", async ({ page }) => {
    await page.goto("/manual-upload");

    const courtInput = page.getByRole("combobox", { name: /court name or tribunal name/i });
    await courtInput.waitFor({ state: "visible", timeout: 10000 });
    await expect(courtInput).toHaveAttribute("role", "combobox");

    const fileInput = page.locator('input[name="file"]');
    await fileInput.setInputFiles({
      name: "test.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("test content")
    });

    // Test empty court name validation
    await page.getByRole("button", { name: /continue/i }).click();
    let errorSummary = page.locator(".govuk-error-summary");
    let errorLink = errorSummary.getByRole("link", { name: /court name must be three characters or more/i });
    await expect(errorLink).toBeVisible();

    // Test short court name validation
    await courtInput.fill("AB");
    await page.getByRole("button", { name: /continue/i }).click();
    errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    errorLink = errorSummary.getByRole("link", { name: /court name must be three characters or more/i });
    await expect(errorLink).toBeVisible();

    // Test invalid court name validation
    await courtInput.fill("Invalid Court Name That Does Not Exist");
    await page.getByRole("button", { name: /continue/i }).click();
    errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    errorLink = errorSummary.getByRole("link", { name: /please enter and select a valid court/i });
    await expect(errorLink).toBeVisible();

    // Verify court name value is preserved after validation error
    const preservedCourtName = "Invalid Court Name";
    await courtInput.fill(preservedCourtName);
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(courtInput).toHaveValue(preservedCourtName);
  });

  test("auto-select default sensitivity when list type is selected @nightly", async ({ page }) => {
    await page.goto(`/manual-upload?locationId=${testLocationId}`);
    await page.waitForTimeout(1000);

    const listTypeSelect = page.locator('select[name="listType"]');
    const sensitivitySelect = page.locator('select[name="sensitivity"]');

    // Initially sensitivity should be empty
    await expect(sensitivitySelect).toHaveValue("");

    // Select Crown Daily List (PUBLIC sensitivity)
    await listTypeSelect.selectOption({ label: listTypeLabels.crownDaily });
    await page.waitForTimeout(100);
    await expect(sensitivitySelect).toHaveValue("PUBLIC");

    // Select Family Daily Cause List (PRIVATE sensitivity)
    await listTypeSelect.selectOption({ label: listTypeLabels.familyDaily });
    await page.waitForTimeout(100);
    await expect(sensitivitySelect).toHaveValue("PRIVATE");

    // Clear list type - sensitivity should be cleared
    await listTypeSelect.selectOption("");
    await page.waitForTimeout(100);
    await expect(sensitivitySelect).toHaveValue("");
  });

  test("session management - redirect and refresh behavior @nightly", async ({ page }) => {
    // Test direct access to success page without session redirects
    await page.goto("/manual-upload-success");
    await expect(page).toHaveURL("/manual-upload");

    // Complete an upload
    await page.goto(`/manual-upload?locationId=${testLocationId}`);
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="listType"]', { label: listTypeLabels.crownDaily });
    await page.fill('input[name="hearingStartDate-day"]', "23");
    await page.fill('input[name="hearingStartDate-month"]', "10");
    await page.fill('input[name="hearingStartDate-year"]', "2025");
    await page.selectOption('select[name="sensitivity"]', "PUBLIC");
    await page.selectOption('select[name="language"]', "ENGLISH");
    await page.fill('input[name="displayFrom-day"]', "20");
    await page.fill('input[name="displayFrom-month"]', "10");
    await page.fill('input[name="displayFrom-year"]', "2025");
    await page.fill('input[name="displayTo-day"]', "30");
    await page.fill('input[name="displayTo-month"]', "10");
    await page.fill('input[name="displayTo-year"]', "2025");

    const fileInput = page.locator('input[name="file"]');
    await fileInput.setInputFiles({
      name: "test-session.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nTest session content")
    });

    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/manual-upload-summary\?uploadId=/);
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL("/manual-upload-success");

    // Refresh should redirect back to manual-upload (session cleared)
    await page.reload();
    await expect(page).toHaveURL("/manual-upload");

    // Test multiple sequential uploads work
    await page.goto(`/manual-upload?locationId=${testLocationId}`);
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="listType"]', { label: listTypeLabels.crownFirm });
    await page.fill('input[name="hearingStartDate-day"]', "25");
    await page.fill('input[name="hearingStartDate-month"]', "11");
    await page.fill('input[name="hearingStartDate-year"]', "2025");
    await page.selectOption('select[name="sensitivity"]', "PRIVATE");
    await page.selectOption('select[name="language"]', "WELSH");
    await page.fill('input[name="displayFrom-day"]', "24");
    await page.fill('input[name="displayFrom-month"]', "11");
    await page.fill('input[name="displayFrom-year"]', "2025");
    await page.fill('input[name="displayTo-day"]', "26");
    await page.fill('input[name="displayTo-month"]', "11");
    await page.fill('input[name="displayTo-year"]', "2025");

    await fileInput.setInputFiles({
      name: "second-upload.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nSecond upload content")
    });

    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/manual-upload-summary\?uploadId=/);
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL("/manual-upload-success");
    await expect(page).toHaveURL("/manual-upload-success");
  });

  test("notification delivery after manual upload @nightly", async ({ page }) => {
    // Subscribers use the CFT test account's email so GOV.UK Notify delivers; they are still this test's own users,
    // identified by a prefixed provenance id, so global-teardown removes them with their subscriptions
    const user1 = await createNotificationSubscriber();
    const user2 = await createNotificationSubscriber();
    const sub1 = await createTestSubscription(user1.userId, testLocationId);
    const sub2 = await createTestSubscription(user2.userId, testLocationId);

    // Complete manual upload
    await page.goto(`/manual-upload?locationId=${testLocationId}`);
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="listType"]', { label: listTypeLabels.crownDaily });
    await page.fill('input[name="hearingStartDate-day"]', "23");
    await page.fill('input[name="hearingStartDate-month"]', "10");
    await page.fill('input[name="hearingStartDate-year"]', "2025");
    await page.selectOption('select[name="sensitivity"]', "PUBLIC");
    await page.selectOption('select[name="language"]', "ENGLISH");
    await page.fill('input[name="displayFrom-day"]', "20");
    await page.fill('input[name="displayFrom-month"]', "10");
    await page.fill('input[name="displayFrom-year"]', "2025");
    await page.fill('input[name="displayTo-day"]', "30");
    await page.fill('input[name="displayTo-month"]', "10");
    await page.fill('input[name="displayTo-year"]', "2025");

    const fileInput = page.locator('input[name="file"]');
    await fileInput.setInputFiles({
      name: "test-notification.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nTest content")
    });

    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/manual-upload-summary\?uploadId=/);
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL("/manual-upload-success", { timeout: 10000 });

    await expect(page.locator(".govuk-panel")).toBeVisible();

    // Verify notifications were sent
    // Notifications are sent in the background and recorded as Pending until Notify responds, so wait for a final status
    let notifications1: Awaited<ReturnType<typeof getNotificationsBySubscriptionId>> = [];
    let notifications2: Awaited<ReturnType<typeof getNotificationsBySubscriptionId>> = [];
    await expect
      .poll(
        async () => {
          notifications1 = await getNotificationsBySubscriptionId(sub1.subscriptionId);
          notifications2 = await getNotificationsBySubscriptionId(sub2.subscriptionId);
          return [notifications1[0]?.status, notifications2[0]?.status].every((status) => status && status !== "Pending");
        },
        { timeout: 30000 }
      )
      .toBe(true);

    expect(notifications1.length).toBeGreaterThan(0);
    expect(notifications1[0].status).toBe("Sent");
    expect(notifications1[0].govNotifyId).toBeDefined();

    expect(notifications2.length).toBeGreaterThan(0);
    expect(notifications2[0].status).toBe("Sent");
    expect(notifications1[0].publicationId).toBe(notifications2[0].publicationId);

    const email = await getGovNotifyEmail(notifications1[0].govNotifyId!);
    expect(email.email_address).toBe(process.env.CFT_VALID_TEST_ACCOUNT);
  });

  const CIVIL_FAMILY_JSON = {
    document: {
      publicationDate: "2025-11-12T09:00:00.000Z",
      documentName: "Civil and Family Daily Cause List",
      version: "1.0"
    },
    venue: {
      venueName: "Oxford Combined Court Centre",
      venueAddress: {
        line: ["St Aldate's"],
        town: "Oxford",
        postCode: "OX1 1TL"
      },
      venueContact: {
        venueTelephone: "01865 264 200",
        venueEmail: "enquiries.oxford.countycourt@justice.gov.uk"
      }
    },
    courtLists: [
      {
        courtHouse: {
          courtHouseName: "Oxford Combined Court Centre",
          courtRoom: [
            {
              courtRoomName: "Courtroom 1",
              session: [
                {
                  sittings: [
                    {
                      sittingStart: "2025-11-12T10:00:00.000Z",
                      sittingEnd: "2025-11-12T11:00:00.000Z",
                      hearing: [
                        {
                          hearingType: "Family Hearing",
                          case: [{ caseName: "Brown v Brown", caseNumber: "CF-2025-001" }]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  };

  test("should generate a PDF after uploading a JSON publication @nightly", async ({ page }) => {
    await page.goto(`/manual-upload?locationId=${testLocationId}`);
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="listType"]', { label: listTypeLabels.civilAndFamily });
    await page.fill('input[name="hearingStartDate-day"]', "12");
    await page.fill('input[name="hearingStartDate-month"]', "11");
    await page.fill('input[name="hearingStartDate-year"]', "2025");
    await page.selectOption('select[name="sensitivity"]', "PUBLIC");
    await page.selectOption('select[name="language"]', "ENGLISH");
    await page.fill('input[name="displayFrom-day"]', "12");
    await page.fill('input[name="displayFrom-month"]', "11");
    await page.fill('input[name="displayFrom-year"]', "2025");
    await page.fill('input[name="displayTo-day"]', "13");
    await page.fill('input[name="displayTo-month"]', "11");
    await page.fill('input[name="displayTo-year"]', "2025");

    const fileInput = page.locator('input[name="file"]');
    await fileInput.setInputFiles({
      name: "civil-and-family-daily-cause-list.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(CIVIL_FAMILY_JSON))
    });

    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/manual-upload-summary\?uploadId=/);

    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL("/manual-upload-success", { timeout: 30000 });

    const civilAndFamilyListType = (await getListTypeByName(LIST_TYPE_NAMES.civilAndFamily)) as { id: number };
    const artefact = await getLatestArtefactByLocationAndListType(testLocationId, civilAndFamilyListType.id);
    expect(artefact).toBeDefined();

    // The PDF is rendered in the background after the success page, so wait for it to reach blob storage
    await expect.poll(async () => (await checkFlatFileExists(artefact!.artefactId, ".pdf")).sizeBytes ?? 0, { timeout: 30000 }).toBeGreaterThan(0);
  });
});

async function resolveListTypeLabels(): Promise<Record<keyof typeof LIST_TYPE_NAMES, string>> {
  const entries = await Promise.all(Object.entries(LIST_TYPE_NAMES).map(async ([key, name]) => [key, await getListTypeOptionLabel(name)] as const));
  return Object.fromEntries(entries) as Record<keyof typeof LIST_TYPE_NAMES, string>;
}
