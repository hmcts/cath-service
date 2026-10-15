import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import ExcelJSPkg from "exceljs";
import { axeCheck } from "../../utils/axe-helper.js";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import {
  cleanupTestNotifications,
  cleanupTestSubscriptions,
  cleanupTestUsers,
  createTestSubscription,
  createTestUser,
  getGovNotifyEmail,
  waitForNotifications
} from "../../utils/notification-helpers.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";
import { checkFlatFileExists, deleteTestArtefacts, getLatestArtefactByLocationAndListType, getListTypeByName } from "../../utils/test-support-api.js";

const { Workbook } = ExcelJSPkg;

const KB_DIVISION_LIST_TYPE_NAME = "KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST";
const SSCS_LONDON_LIST_TYPE_NAME = "SSCS_LONDON_DAILY_HEARING_LIST";
const SSCS_SHEET_NAME = "SSCS hearings";
const SSCS_UPLOADED_HEADER = [
  "Venue",
  "Appeal Reference Number",
  "Hearing Type",
  "Appellant",
  "Courtroom",
  "Hearing Time",
  "Tribunal",
  "FTA/Respondent",
  "Additional Information"
];
const SSCS_ROW = ["London Tribunal", "SC123/45/67890", "Oral", "A Smith", "Room 1", "10:30am", "Judge Jones", "DWP", "Interpreter required"];
const SSCS_EN_HEADINGS = [
  "Venue",
  "Appeal reference number",
  "Hearing type",
  "Appellant",
  "Courtroom",
  "Hearing time",
  "Tribunal",
  "FTA/Respondent",
  "Additional information"
];
const SSCS_CY_HEADINGS = [
  "Lleoliad",
  "Cyfeirnod Apêl",
  "Math o Wrandawiad",
  "Apellydd",
  "Ystafell y Llys",
  "Amser y Gwrandawiad",
  "Tribiwnlys",
  "ATC/Ymatebydd",
  "Gwybodaeth Ychwanegol"
];
const BUSINESS_AND_PROPERTY_LIST_TYPE_NAME = "BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST";
const INTERIM_APPLICATIONS_LIST_TYPE_NAME = "INTERIM_APPLICATIONS_DAILY_CAUSE_LIST";
const ROLLS_BUILDING_UPLOADED_HEADER = ["Judge", "Time", "Venue", "Type", "Case Number", "Case Name", "Additional Information"];
const BUSINESS_AND_PROPERTY_EN_HEADINGS = ["Judge", "Time", "Venue", "Type", "Case Number", "Case Name", "Additional Information"];
const INTERIM_APPLICATIONS_CY_HEADINGS = ["Barnwr", "Amser", "Lleoliad", "Math", "Rhif yr achos", "Enw’r achos", "Gwybodaeth ychwanegol"];
const GRC_LIST_TYPE_NAME = "GRC_WEEKLY_HEARING_LIST";
const GRC_SHEET_NAME = "GRC hearings";
const GRC_UPLOADED_HEADER = [
  "Date",
  "Hearing time",
  "Case reference number",
  "Case name",
  "Judge(s)",
  "Member(s)",
  "Mode of hearing",
  "Venue",
  "Additional information"
];
const GRC_EN_HEADINGS = [
  "Date",
  "Hearing time",
  "Case reference number",
  "Case name",
  "Judge(s)",
  "Member(s)",
  "Mode of hearing",
  "Venue",
  "Additional information"
];
const GRC_ROW = ["02/01/2026", "10:30am", "EA/2026/0001", "Smith v Information Commissioner", "Judge Jones", "Ms Patel", "Video", "Field House", "Public"];
const CIC_LIST_TYPE_NAME = "CIC_WEEKLY_HEARING_LIST";
const CIC_SHEET_NAME = "CIC hearings";
const CIC_UPLOADED_HEADER = ["Date", "Hearing time", "Case reference number", "Case name", "Venue/platform", "Judge(s)", "Member(s)", "Additional information"];
const CIC_ROW = ["02/01/2026", "2pm", "CIC/2026/001", "AN Other v CICA", "Video", "Judge Lee", "Dr Patel", "Remote"];
const CIC_CY_HEADINGS = [
  "Dyddiad",
  "Amser y gwrandawiad",
  "Cyfeirnod yr achos",
  "Enw'r achos",
  "Lleoliad/Platfform",
  "Barnwyr",
  "Aelod(au)",
  "Gwybodaeth ychwanegol"
];
const GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN = /https:\/\/documents\.service\.gov\.uk\/d\/[A-Za-z0-9_-]+/g;

let testLocationId: number;

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues

async function createMinimalExcelFile(): Promise<Buffer> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");

  // CST required headers
  worksheet.addRow(["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"]);
  // CST data row
  worksheet.addRow(["01/01/2026", "Test Case A vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function createKbDivisionExcelFile(): Promise<Buffer> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("KB hearings");

  worksheet.addRow(["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information", "Notes"]);
  worksheet.addRow(["Court 1", "Mr Justice Smith", "10.30am", "KB-2026-000001", "Smith v Jones", "Trial", "", "Bring bundle"]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function createSscsExcelFile(): Promise<Buffer> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(SSCS_SHEET_NAME);

  worksheet.addRow([...SSCS_UPLOADED_HEADER, "Internal notes"]);
  worksheet.addRow([...SSCS_ROW, "Appellant is vulnerable"]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function createBusinessAndPropertyExcelFile(): Promise<Buffer> {
  const workbook = new Workbook();
  const sheets: Record<string, unknown[][]> = {
    "Appeal List": [
      [...ROLLS_BUILDING_UPLOADED_HEADER, "Internal notes"],
      ["Mr Justice Smith", "10.30am", "Court 1", "Appeal", "BL-2026-000001", "Smith v Jones", "Remote", "Vulnerable party"]
    ],
    "Insolvency & Companies Court": [
      [...ROLLS_BUILDING_UPLOADED_HEADER, "Internal notes"],
      ["ICC Judge Green", "2pm", "Court 7", "Winding up", "CR-2026-000010", "Re Example Ltd", "Hybrid", "Staff only"]
    ],
    Notes: [ROLLS_BUILDING_UPLOADED_HEADER, ["Judge X", "9am", "Court 9", "Note", "N-1", "Working copy", "Draft"]]
  };
  for (const [name, rows] of Object.entries(sheets)) {
    const worksheet = workbook.addWorksheet(name);
    for (const row of rows) {
      worksheet.addRow(row);
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function createInterimApplicationsExcelFile(): Promise<Buffer> {
  const workbook = new Workbook();
  workbook
    .addWorksheet("Hearing List")
    .addRows([
      ROLLS_BUILDING_UPLOADED_HEADER,
      ["Mr Justice Smith", "10.30am", "Court 1", "Interim application", "BL-2026-000002", "Acme v Widget", "In person"]
    ]);
  workbook.addWorksheet("Open Justice Statement Details").addRows([
    ["Name to be displayed", "Email"],
    ["Mr Justice Smith", "interim.applications@justice.gov.uk"]
  ]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function createTribunalExcelFile(sheetName: string, header: string[], row: string[]): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.addWorksheet(sheetName).addRows([
    [...header, "Internal notes"],
    [...row, "Appellant is vulnerable"]
  ]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function uploadExcelAndConfirm(page: Page, upload: ExcelUpload): Promise<string> {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  await page.goto(`/non-strategic-upload?locationId=${testLocationId}`);
  await page.selectOption('select[name="listType"]', String(upload.listTypeId));
  await fillDate(page, "hearingStartDate", today);
  await page.selectOption('select[name="sensitivity"]', "PUBLIC");
  await page.selectOption('select[name="language"]', upload.language);
  await fillDate(page, "displayFrom", today);
  await fillDate(page, "displayTo", nextWeek);
  await page.locator('input[name="file"]').setInputFiles({
    name: upload.fileName,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: upload.buffer
  });
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/non-strategic-upload-summary\?uploadId=/, { timeout: 10000 });
  await expect(page.locator("h1")).toHaveText("File upload summary");
  if (upload.checkAccessibility) {
    expect((await axeCheck(page).analyze()).violations).toEqual([]);
  }

  await page.getByRole("button", { name: "Confirm" }).click();
  await page.waitForURL("/non-strategic-upload-success", { timeout: 10000 });
  await expect(page.locator(".govuk-panel__title")).toHaveText("File upload successful");
  if (upload.checkAccessibility) {
    expect((await axeCheck(page).analyze()).violations).toEqual([]);
    await page.goto("/non-strategic-upload-success?lng=cy");
    await expect(page.locator(".govuk-panel__title")).toHaveText("Wedi llwyddo i uwchlwytho ffeiliau");
  }

  const artefact = await getLatestArtefactByLocationAndListType(testLocationId, upload.listTypeId);
  if (!artefact) {
    throw new Error(`No artefact was created for list type ${upload.listTypeId}`);
  }
  return artefact.artefactId;
}

async function downloadReformattedWorkbook(page: Page, artefactId: string): Promise<ExcelJSPkg.Workbook> {
  await expect.poll(async () => (await checkFlatFileExists(artefactId)).exists, { timeout: 60000, intervals: [2000] }).toBe(true);
  const excelBuffer = await waitForExcelDownload(page, artefactId);

  const workbook = new Workbook();
  // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
  await workbook.xlsx.load(excelBuffer);
  return workbook;
}

async function downloadReformattedWorksheet(page: Page, artefactId: string, sheetName: string): Promise<ExcelJSPkg.Worksheet> {
  const workbook = await downloadReformattedWorkbook(page, artefactId);
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    throw new Error(`Reformatted workbook is missing the uploaded sheet ${sheetName}`);
  }
  return worksheet;
}

async function expectPdfAndExcelLinksInEmail(artefactId: string): Promise<void> {
  const notifications = await waitForNotifications(artefactId, 30, 2000, true);
  const sentNotification = notifications.find((n) => n.govNotifyId !== null);
  if (!sentNotification?.govNotifyId) {
    throw new Error(`No sent notification for ${artefactId}`);
  }

  const govNotifyEmail = await getGovNotifyEmail(sentNotification.govNotifyId);
  expect(govNotifyEmail.body.match(GOVUK_NOTIFY_DOCUMENT_LINK_PATTERN)).toHaveLength(2);
}

function rowValues(worksheet: ExcelJSPkg.Worksheet, rowNumber: number): unknown[] {
  return (worksheet.getRow(rowNumber).values as unknown[]).slice(1);
}

async function fillDate(page: Page, prefix: string, date: Date) {
  await page.fill(`input[name="${prefix}-day"]`, String(date.getDate()));
  await page.fill(`input[name="${prefix}-month"]`, String(date.getMonth() + 1));
  await page.fill(`input[name="${prefix}-year"]`, String(date.getFullYear()));
}

async function waitForExcelDownload(page: Page, artefactId: string, maxRetries = 30, delayMs = 2000): Promise<Buffer> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await page.request.get(`/api/flat-file/${artefactId}/download?format=excel`);
    if (response.ok()) {
      return Buffer.from(await response.body());
    }
    await page.waitForTimeout(delayMs);
  }
  throw new Error(`Excel download for ${artefactId} was not available`);
}

async function authenticateSystemAdmin(page: Page) {
  await page.goto("/system-admin-dashboard");
  if (page.url().includes("login.microsoftonline.com")) {
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
  }
}

test.describe
  .skip("Non-Strategic Upload", () => {
    test.beforeAll(async () => {
      const testLocation = await createUniqueTestLocation({ namePrefix: "Non-Strategic Upload Court" });
      testLocationId = testLocation.locationId;
    });

    test.beforeEach(async ({ page }) => {
      await authenticateSystemAdmin(page);
    });

    test("complete non-strategic upload journey with form validation, summary, success, Welsh, and accessibility", async ({ page }) => {
      // STEP 1: Load form page and verify all elements
      await page.goto("/non-strategic-upload");
      await expect(page).toHaveTitle("Upload - Upload Excel file - Court and tribunal hearings - GOV.UK");

      const heading = page.getByRole("heading", { name: /upload Excel file/i });
      await expect(heading).toBeVisible();

      // Verify form fields exist
      const fileUpload = page.locator('input[name="file"]');
      await expect(fileUpload).toBeVisible();

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
      await expect(page).toHaveURL("/non-strategic-upload");

      let errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const fileErrorMessage = page.locator("#file").locator("..").locator(".govuk-error-message");
      await expect(fileErrorMessage).toBeVisible();

      // STEP 3: Test accessibility with error state
      let accessibilityScanResults = await axeCheck(page).disableRules(["target-size", "link-name"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // STEP 4: Test invalid file type validation
      await page.goto(`/non-strategic-upload?locationId=${testLocationId}`);
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', "9");
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
      await expect(page).toHaveURL(/\/non-strategic-upload/);

      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      const errorLink = errorSummary.getByRole("link", { name: /the selected file type is not supported/i });
      await expect(errorLink).toBeVisible();

      // STEP 5: Test file size validation
      const largeBuffer = Buffer.alloc(3 * 1024 * 1024);
      await fileInput.setInputFiles({
        name: "large-file.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: largeBuffer
      });

      await page.getByRole("button", { name: /continue/i }).click();
      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      await expect(errorSummary.getByRole("link", { name: /the selected file must be smaller than 2mb/i })).toBeVisible();

      // STEP 6: Test date range validation (re-fill all fields since form state may be lost after validation errors)
      await page.goto(`/non-strategic-upload?locationId=${testLocationId}`);
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', "9");
      await page.fill('input[name="hearingStartDate-day"]', "15");
      await page.fill('input[name="hearingStartDate-month"]', "06");
      await page.fill('input[name="hearingStartDate-year"]', "2025");
      await page.selectOption('select[name="sensitivity"]', "PUBLIC");
      await page.selectOption('select[name="language"]', "ENGLISH");
      await page.fill('input[name="displayFrom-day"]', "20");
      await page.fill('input[name="displayFrom-month"]', "06");
      await page.fill('input[name="displayFrom-year"]', "2025");
      await page.fill('input[name="displayTo-day"]', "10"); // Invalid: to date (10) before from date (20)
      await page.fill('input[name="displayTo-month"]', "06");
      await page.fill('input[name="displayTo-year"]', "2025");

      const fileInputStep6 = page.locator('input[name="file"]');
      await fileInputStep6.setInputFiles({
        name: "test.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: await createMinimalExcelFile()
      });

      await page.getByRole("button", { name: /continue/i }).click();
      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      await expect(errorSummary.getByRole("link", { name: /'display to' date must be the same as or later than 'display from' date/i })).toBeVisible();

      // STEP 7: Complete valid form submission
      await page.goto(`/non-strategic-upload?locationId=${testLocationId}`);
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', "9");
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
        name: "test-hearing-list.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: await createMinimalExcelFile()
      });

      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(/\/non-strategic-upload-summary\?uploadId=/, { timeout: 10000 });

      // STEP 8: Verify summary page
      await expect(page.locator("h1")).toHaveText("File upload summary");

      const values = page.locator(".govuk-summary-list__value");
      await expect(values.nth(1)).toContainText("test-hearing-list.xlsx");
      await expect(values.nth(2)).toContainText("Care Standards Tribunal Weekly Hearing List");
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
      await page.waitForURL("/non-strategic-upload-success", { timeout: 10000 });

      // STEP 10: Verify success page
      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();
      await expect(page.locator(".govuk-panel__title")).toHaveText("File upload successful");
      await expect(successPanel).toContainText("Your file has been uploaded");

      // Verify next steps links
      const uploadLink = page.getByRole("link", { name: "Upload another file" });
      await expect(uploadLink).toBeVisible();
      await expect(uploadLink).toHaveAttribute("href", "/non-strategic-upload");

      const removeLink = page.getByRole("link", { name: "Remove file" });
      await expect(removeLink).toBeVisible();

      const homeLink = page.getByRole("link", { name: "Home" });
      await expect(homeLink).toBeVisible();

      // Test accessibility on success page
      accessibilityScanResults = await axeCheck(page).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // STEP 11: Test Welsh on success page
      await page.goto("/non-strategic-upload-success?lng=cy");
      await expect(page.locator(".govuk-panel__title")).toHaveText("Wedi llwyddo i uwchlwytho ffeiliau");
      await expect(page.getByRole("heading", { name: "Beth yr ydych eisiau ei wneud nesaf?" })).toBeVisible();
      await expect(page.getByRole("link", { name: "uwchlwytho ffeil arall" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Dileu ffeil" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Tudalen hafan" })).toBeVisible();

      // STEP 12: Test keyboard navigation - navigate back to upload (from Welsh page)
      const welshUploadLink = page.getByRole("link", { name: "uwchlwytho ffeil arall" });
      await welshUploadLink.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL("/non-strategic-upload");
    });

    // Stays inside the skipped describe until the SSO specs are re-enabled; the unit tests are the real check until then
    test("RCJ, SSCS, Rolls Building and Tribunal Excel uploads send reformatted Excel and PDF links in email @nightly", async ({ page }) => {
      test.skip(!process.env.GOVUK_NOTIFY_API_KEY, "Skipping: GOVUK_NOTIFY_API_KEY not set");

      const testUser = await createTestUser(process.env.CFT_VALID_TEST_ACCOUNT!);
      const subscription = await createTestSubscription(testUser.userId, testLocationId);
      const kbListType = (await getListTypeByName(KB_DIVISION_LIST_TYPE_NAME)) as { id: number } | null;
      const sscsListType = (await getListTypeByName(SSCS_LONDON_LIST_TYPE_NAME)) as { id: number } | null;
      const businessAndPropertyListType = (await getListTypeByName(BUSINESS_AND_PROPERTY_LIST_TYPE_NAME)) as { id: number } | null;
      const interimApplicationsListType = (await getListTypeByName(INTERIM_APPLICATIONS_LIST_TYPE_NAME)) as { id: number } | null;
      const grcListType = (await getListTypeByName(GRC_LIST_TYPE_NAME)) as { id: number } | null;
      const cicListType = (await getListTypeByName(CIC_LIST_TYPE_NAME)) as { id: number } | null;
      if (!kbListType || !sscsListType || !businessAndPropertyListType || !interimApplicationsListType || !grcListType || !cicListType) {
        throw new Error("Expected list types are not seeded");
      }
      const artefactIds: string[] = [];

      try {
        // STEP 1: Upload a KB Division workbook with an unformatted time and an extra column, checking accessibility on the way
        const kbArtefactId = await uploadExcelAndConfirm(page, {
          listTypeId: kbListType.id,
          language: "ENGLISH",
          fileName: "kb-division.xlsx",
          buffer: await createKbDivisionExcelFile(),
          checkAccessibility: true
        });
        artefactIds.push(kbArtefactId);

        // STEP 2: The KB Excel has localised headings and formatted values, and the unknown column is dropped
        const kbWorksheet = await downloadReformattedWorksheet(page, kbArtefactId, "KB hearings");
        expect(rowValues(kbWorksheet, 1)).toEqual(["Venue", "Judge", "Time", "Case number", "Case details", "Hearing type", "Additional information"]);
        expect(kbWorksheet.getCell("A1").font?.bold).toBe(true);
        expect(rowValues(kbWorksheet, 2)).toEqual(["Court 1", "Mr Justice Smith", "10:30am", "KB-2026-000001", "Smith v Jones", "Trial", ""]);

        // STEP 3: The KB subscription email links both the PDF and the Excel
        await expectPdfAndExcelLinksInEmail(kbArtefactId);

        // STEP 4: An English SSCS upload gets English headings, its unknown column dropped, and both email links
        const sscsArtefactId = await uploadExcelAndConfirm(page, {
          listTypeId: sscsListType.id,
          language: "ENGLISH",
          fileName: "sscs-london.xlsx",
          buffer: await createSscsExcelFile()
        });
        artefactIds.push(sscsArtefactId);

        const sscsWorksheet = await downloadReformattedWorksheet(page, sscsArtefactId, SSCS_SHEET_NAME);
        expect(rowValues(sscsWorksheet, 1)).toEqual(SSCS_EN_HEADINGS);
        expect(sscsWorksheet.getCell("A1").font?.bold).toBe(true);
        expect(rowValues(sscsWorksheet, 2)).toEqual(SSCS_ROW);
        expect(rowValues(sscsWorksheet, 1)).not.toContain("Internal notes");
        await expectPdfAndExcelLinksInEmail(sscsArtefactId);

        // STEP 5: A Welsh SSCS upload gets the Welsh headings
        const welshSscsArtefactId = await uploadExcelAndConfirm(page, {
          listTypeId: sscsListType.id,
          language: "WELSH",
          fileName: "sscs-london-cy.xlsx",
          buffer: await createSscsExcelFile()
        });
        artefactIds.push(welshSscsArtefactId);

        const welshSscsWorksheet = await downloadReformattedWorksheet(page, welshSscsArtefactId, SSCS_SHEET_NAME);
        expect(rowValues(welshSscsWorksheet, 1)).toEqual(SSCS_CY_HEADINGS);
        expect(rowValues(welshSscsWorksheet, 2)).toEqual(SSCS_ROW);

        // STEP 6: A Business and Property upload keeps only its section tabs, drops the extra tab and column, and normalises the time
        const businessAndPropertyArtefactId = await uploadExcelAndConfirm(page, {
          listTypeId: businessAndPropertyListType.id,
          language: "ENGLISH",
          fileName: "business-and-property-rolls.xlsx",
          buffer: await createBusinessAndPropertyExcelFile()
        });
        artefactIds.push(businessAndPropertyArtefactId);

        const businessAndPropertyWorkbook = await downloadReformattedWorkbook(page, businessAndPropertyArtefactId);
        expect(businessAndPropertyWorkbook.worksheets.map((worksheet) => worksheet.name)).toEqual(["Appeal List", "Insolvency & Companies Court"]);
        const appealWorksheet = businessAndPropertyWorkbook.getWorksheet("Appeal List") as ExcelJSPkg.Worksheet;
        expect(rowValues(appealWorksheet, 1)).toEqual(BUSINESS_AND_PROPERTY_EN_HEADINGS);
        expect(appealWorksheet.getCell("A1").font?.bold).toBe(true);
        expect(rowValues(appealWorksheet, 2)).toEqual(["Mr Justice Smith", "10:30am", "Court 1", "Appeal", "BL-2026-000001", "Smith v Jones", "Remote"]);
        expect(rowValues(appealWorksheet, 1)).not.toContain("Internal notes");
        await expectPdfAndExcelLinksInEmail(businessAndPropertyArtefactId);

        // STEP 7: A Welsh Interim Applications upload gets the Welsh headings and only the Hearing List tab
        const interimArtefactId = await uploadExcelAndConfirm(page, {
          listTypeId: interimApplicationsListType.id,
          language: "WELSH",
          fileName: "interim-applications-cy.xlsx",
          buffer: await createInterimApplicationsExcelFile()
        });
        artefactIds.push(interimArtefactId);

        const interimWorkbook = await downloadReformattedWorkbook(page, interimArtefactId);
        expect(interimWorkbook.worksheets.map((worksheet) => worksheet.name)).toEqual(["Hearing List"]);
        const interimWorksheet = interimWorkbook.getWorksheet("Hearing List") as ExcelJSPkg.Worksheet;
        expect(rowValues(interimWorksheet, 1)).toEqual(INTERIM_APPLICATIONS_CY_HEADINGS);
        expect(rowValues(interimWorksheet, 2)).toEqual([
          "Mr Justice Smith",
          "10.30am",
          "Court 1",
          "Interim application",
          "BL-2026-000002",
          "Acme v Widget",
          "In person"
        ]);

        // STEP 8: An English GRC upload gets English headings, the PDF's long-form date, its unknown column dropped, and both email links
        const grcArtefactId = await uploadExcelAndConfirm(page, {
          listTypeId: grcListType.id,
          language: "ENGLISH",
          fileName: "grc-weekly.xlsx",
          buffer: await createTribunalExcelFile(GRC_SHEET_NAME, GRC_UPLOADED_HEADER, GRC_ROW)
        });
        artefactIds.push(grcArtefactId);

        const grcWorksheet = await downloadReformattedWorksheet(page, grcArtefactId, GRC_SHEET_NAME);
        expect(rowValues(grcWorksheet, 1)).toEqual(GRC_EN_HEADINGS);
        expect(grcWorksheet.getCell("A1").font?.bold).toBe(true);
        expect(rowValues(grcWorksheet, 2)).toEqual(["2 January 2026", ...GRC_ROW.slice(1)]);
        expect(rowValues(grcWorksheet, 1)).not.toContain("Internal notes");
        expect(rowValues(grcWorksheet, 2)).not.toContain("Appellant is vulnerable");
        await expectPdfAndExcelLinksInEmail(grcArtefactId);

        // STEP 9: A Welsh CIC upload gets the Welsh headings, including the venue/platform alias, the Welsh long-form date, and both email links
        const cicArtefactId = await uploadExcelAndConfirm(page, {
          listTypeId: cicListType.id,
          language: "WELSH",
          fileName: "cic-weekly-cy.xlsx",
          buffer: await createTribunalExcelFile(CIC_SHEET_NAME, CIC_UPLOADED_HEADER, CIC_ROW)
        });
        artefactIds.push(cicArtefactId);

        const cicWorksheet = await downloadReformattedWorksheet(page, cicArtefactId, CIC_SHEET_NAME);
        expect(rowValues(cicWorksheet, 1)).toEqual(CIC_CY_HEADINGS);
        expect(rowValues(cicWorksheet, 2)).toEqual(["2 Ionawr 2026", ...CIC_ROW.slice(1)]);
        await expectPdfAndExcelLinksInEmail(cicArtefactId);
      } finally {
        if (artefactIds.length > 0) {
          await cleanupTestNotifications(artefactIds);
          await deleteTestArtefacts({ artefactIds });
        }
        await cleanupTestSubscriptions([subscription.subscriptionId]);
        await cleanupTestUsers([testUser.userId]);
      }
    });

    test("court name validation and autocomplete functionality @nightly", async ({ page }) => {
      await page.goto("/non-strategic-upload");

      const courtInput = page.getByRole("combobox", { name: /court name or tribunal name/i });
      await courtInput.waitFor({ state: "visible", timeout: 10000 });
      await expect(courtInput).toHaveAttribute("role", "combobox");

      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "test.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: await createMinimalExcelFile()
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
      await page.waitForTimeout(500); // Wait for autocomplete to settle
      await page.getByRole("button", { name: /continue/i }).click();
      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible({ timeout: 10000 });
      errorLink = errorSummary.getByRole("link", { name: /please enter and select a valid court/i });
      await expect(errorLink).toBeVisible();

      // Verify court name value is preserved after validation error
      const preservedCourtName = "Invalid Court Name";
      await courtInput.fill(preservedCourtName);
      await page.waitForTimeout(500); // Wait for autocomplete to settle
      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForTimeout(500); // Wait for page to reload with preserved value
      await expect(courtInput).toHaveValue(preservedCourtName, { timeout: 10000 });
    });

    test("session management - redirect and refresh behavior @nightly", async ({ page }) => {
      // Test direct access to success page without session redirects
      await page.goto("/non-strategic-upload-success");
      await expect(page).toHaveURL("/non-strategic-upload");

      // Complete an upload
      await page.goto(`/non-strategic-upload?locationId=${testLocationId}`);
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', "9");
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
        name: "test-session.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: await createMinimalExcelFile()
      });

      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(/\/non-strategic-upload-summary\?uploadId=/);
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForURL("/non-strategic-upload-success");

      // Refresh should redirect back to non-strategic-upload (session cleared)
      await page.reload();
      await expect(page).toHaveURL("/non-strategic-upload");

      // Test multiple sequential uploads work
      await page.goto(`/non-strategic-upload?locationId=${testLocationId}`);
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', "9");
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
        name: "second-upload.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: await createMinimalExcelFile()
      });

      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(/\/non-strategic-upload-summary\?uploadId=/);
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForURL("/non-strategic-upload-success");
      await expect(page).toHaveURL("/non-strategic-upload-success");
    });
  });

interface ExcelUpload {
  listTypeId: number;
  language: "ENGLISH" | "WELSH";
  fileName: string;
  buffer: Buffer;
  checkAccessibility?: boolean;
}
