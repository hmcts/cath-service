import { expect, test } from "@playwright/test";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import {
  assertEmailDownloadLinks,
  createNotificationSubscriber,
  createTestSubscription,
  type GovNotifyEmail,
  waitForNotifications
} from "../../utils/notification-helpers.js";
import {
  buildExcelOnlyCivilAndFamilyPayload,
  buildOversizedCivilAndFamilyPayload,
  loadListTypeFixture,
  NOTIFY_ATTACHMENT_LIMIT_BYTES,
  PDF_PAYLOAD_GATE_BYTES,
  type StoredFileExtension
} from "../../utils/publication-payloads.js";
import { uploadTestPublication } from "../../utils/publication-upload.js";
import { checkFlatFileExists, type FlatFileInfo, getListTypes, type NotificationRecord } from "../../utils/test-support-api.js";

const NOTIFY_KEY_MISSING = "GOVUK_NOTIFY_API_KEY not set - the email body cannot be read back from Notify";
const NOTIFY_STATUS_PATTERN = /delivered|sending|pending|created|permanent-failure/;
const ALL_STORED_FILES: StoredFileExtension[] = [".pdf", ".xlsx"];
const STRATEGIC_LIST_TYPE = "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST";
const NON_STRATEGIC_LIST_TYPE = "CST_WEEKLY_HEARING_LIST";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// displayFrom is now because upload only notifies publications that are already displayable; the content date
// offset keeps each upload a distinct publication
function generatePublicationDates(daysFromNow = 1) {
  const now = new Date();
  const contentDate = new Date(now.getTime() + daysFromNow * ONE_DAY_MS);
  const displayTo = new Date(contentDate.getTime() + ONE_DAY_MS);

  return {
    contentDate: contentDate.toISOString().split("T")[0],
    displayFrom: now.toISOString(),
    displayTo: displayTo.toISOString(),
    formattedContentDate: contentDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
  };
}

async function publishJson(listTypeName: string, payload: unknown, dates: PublicationDates, locationId: number): Promise<string> {
  const { artefactId } = await uploadTestPublication({ locationId, listTypeName, payload, ...publicationWindow(dates) });
  return artefactId;
}

async function publishFlatFile(listTypeName: string, dates: PublicationDates, locationId: number): Promise<string> {
  const file = { name: "hearing-list.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") };
  const { artefactId } = await uploadTestPublication({ locationId, listTypeName, file, ...publicationWindow(dates) });
  return artefactId;
}

function publicationWindow(dates: PublicationDates) {
  return { contentDate: dates.contentDate, displayFrom: dates.displayFrom, displayTo: dates.displayTo };
}

// Other users in a shared environment may subscribe to the same list type, so pick this test's
// notification by its own subscription. Failed or missing Notify ids are hard failures.
async function waitForSentNotification(publicationId: string, subscriptionId: string): Promise<NotificationRecord & { govNotifyId: string }> {
  // Puppeteer PDF generation must finish before notifications are sent, so allow up to 90 seconds
  const notifications = await waitForNotifications(publicationId, 90, 1000, false, true);
  const notification = notifications.find((n) => n.subscriptionId === subscriptionId);

  expect(notification, `notification for subscription ${subscriptionId}`).toBeDefined();
  expect(notification!.status, notification!.errorMessage ?? "").toBe("Sent");
  expect(notification!.govNotifyId).not.toBeNull();

  return notification as NotificationRecord & { govNotifyId: string };
}

async function waitForStoredFiles(artefactId: string, extensions: StoredFileExtension[]): Promise<Map<StoredFileExtension, FlatFileInfo>> {
  const stored = new Map<StoredFileExtension, FlatFileInfo>();

  for (const extension of extensions) {
    await expect
      .poll(
        async () => {
          const info = await checkFlatFileExists(artefactId, extension);
          stored.set(extension, info);
          return info.exists && (info.sizeBytes ?? 0) > 0;
        },
        { message: `${artefactId}${extension} stored in blob storage`, timeout: 30_000 }
      )
      .toBe(true);
  }

  return stored;
}

async function expectFilesNotStored(artefactId: string, extensions: StoredFileExtension[]) {
  for (const extension of extensions) {
    const info = await checkFlatFileExists(artefactId, extension);
    expect(info.exists, `${artefactId}${extension} should not be stored`).toBe(false);
  }
}

function expectEmailContent(email: GovNotifyEmail, expected: { friendlyName: string; locationName: string; formattedContentDate: string }) {
  expect(email.email_address).toBe(process.env.CFT_VALID_TEST_ACCOUNT!);
  expect(email.body).toContain(expected.friendlyName);
  expect(email.body).toContain(expected.locationName);
  expect(email.body).toContain(expected.formattedContentDate);
  expect(email.status).toMatch(NOTIFY_STATUS_PATTERN);
}

test.describe("Subscription Notifications", () => {
  const friendlyNames = new Map<string, string>();

  test.beforeAll(async () => {
    const listTypes = (await getListTypes()) as { name: string; friendlyName: string | null }[];
    for (const listType of listTypes) {
      friendlyNames.set(listType.name, listType.friendlyName ?? listType.name);
    }
  });

  // Each subscriber is this test's own user (prefixed provenance id) at this test's own court, so global-teardown
  // removes the users, subscriptions, notifications and artefacts; no per-test cleanup is needed
  async function subscribeTestAccount(locationId: number) {
    const user = await createNotificationSubscriber();
    return createTestSubscription(user.userId, locationId);
  }

  function friendlyNameOf(listTypeName: string): string {
    const friendlyName = friendlyNames.get(listTypeName);
    expect(friendlyName, `list type ${listTypeName} is seeded`).toBeDefined();
    return friendlyName!;
  }

  test("strategic list publication notifies every subscriber with PDF and Excel download links", async () => {
    test.skip(!process.env.GOVUK_NOTIFY_API_KEY, NOTIFY_KEY_MISSING);
    test.setTimeout(180_000);

    const location = await createUniqueTestLocation({ namePrefix: "Subscription Notification Court" });
    const listTypeName = STRATEGIC_LIST_TYPE;
    const payload = loadListTypeFixture("civil-and-family-daily-cause-list");

    // PART 1: single subscriber receives an email with the standard subscription content
    const subscription1 = await subscribeTestAccount(location.locationId);
    const dates1 = generatePublicationDates(1);
    const publicationId1 = await publishJson(listTypeName, payload, dates1, location.locationId);

    const notification1 = await waitForSentNotification(publicationId1, subscription1.subscriptionId);
    await waitForStoredFiles(publicationId1, ALL_STORED_FILES);
    const email = await assertEmailDownloadLinks(notification1.govNotifyId, 2);

    expectEmailContent(email, { friendlyName: friendlyNameOf(listTypeName), locationName: location.name, formattedContentDate: dates1.formattedContentDate });
    expect(email.body).toContain("Special Category Data");
    expect(email.body).toContain("Data Protection Act 2018");
    expect(email.body).toContain("Manage your subscriptions");
    expect(email.body).toContain("Unsubscribe");

    // PART 2: every subscriber to the location is notified for the same publication
    const subscription2 = await subscribeTestAccount(location.locationId);
    const dates2 = generatePublicationDates(2);
    const publicationId2 = await publishJson(listTypeName, payload, dates2, location.locationId);

    await waitForSentNotification(publicationId2, subscription1.subscriptionId);
    await waitForSentNotification(publicationId2, subscription2.subscriptionId);
  });

  test("no notifications sent when no subscriptions exist for location @nightly", async () => {
    const location = await createUniqueTestLocation({ namePrefix: "Unsubscribed Notification Court" });
    const payload = loadListTypeFixture("civil-and-family-daily-cause-list");

    const publicationId = await publishJson(STRATEGIC_LIST_TYPE, payload, generatePublicationDates(3), location.locationId);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const notifications = await waitForNotifications(publicationId, 3, 500);
    expect(notifications).toHaveLength(0);
  });

  test("non-strategic list publication sends the PDF-only email with 1 download link", async () => {
    test.skip(!process.env.GOVUK_NOTIFY_API_KEY, NOTIFY_KEY_MISSING);
    // Puppeteer PDF generation can take 40-60 seconds on a CI cold start, and notifications follow it
    test.setTimeout(120_000);

    const location = await createUniqueTestLocation({ namePrefix: "Non-strategic Email Court" });
    const subscription = await subscribeTestAccount(location.locationId);
    const dates = generatePublicationDates(1);

    const payload = loadListTypeFixture("care-standards-tribunal-weekly-hearing-list");
    const publicationId = await publishJson(NON_STRATEGIC_LIST_TYPE, payload, dates, location.locationId);

    const notification = await waitForSentNotification(publicationId, subscription.subscriptionId);

    // A JSON publication carries no uploaded workbook, so a non-strategic list gets a PDF and no Excel
    await waitForStoredFiles(publicationId, [".pdf"]);
    await expectFilesNotStored(publicationId, [".xlsx"]);

    const email = await assertEmailDownloadLinks(notification.govNotifyId, 1);
    expectEmailContent(email, {
      friendlyName: friendlyNameOf(NON_STRATEGIC_LIST_TYPE),
      locationName: location.name,
      formattedContentDate: dates.formattedContentDate
    });
  });

  test("flat-file publication sends the flat-file email with 1 link to the uploaded document @nightly", async () => {
    test.skip(!process.env.GOVUK_NOTIFY_API_KEY, NOTIFY_KEY_MISSING);
    test.setTimeout(120_000);

    const listTypeName = STRATEGIC_LIST_TYPE;
    const location = await createUniqueTestLocation({ namePrefix: "Flat File Email Court" });
    const subscription = await subscribeTestAccount(location.locationId);
    const dates = generatePublicationDates(1);

    const publicationId = await publishFlatFile(listTypeName, dates, location.locationId);

    const notification = await waitForSentNotification(publicationId, subscription.subscriptionId);

    // Flat files carry no JSON, so nothing is generated into the publications container
    await expectFilesNotStored(publicationId, ALL_STORED_FILES);

    // The flat-file template links the uploaded document itself rather than any generated PDF/Excel
    const email = await assertEmailDownloadLinks(notification.govNotifyId, 1);
    expectEmailContent(email, { friendlyName: friendlyNameOf(listTypeName), locationName: location.name, formattedContentDate: dates.formattedContentDate });
  });

  test("publication over the PDF payload gate sends the Excel-only email with 1 link @nightly", async () => {
    test.skip(!process.env.GOVUK_NOTIFY_API_KEY, NOTIFY_KEY_MISSING);
    test.setTimeout(120_000);

    const listTypeName = STRATEGIC_LIST_TYPE;
    const payload = buildExcelOnlyCivilAndFamilyPayload();
    const payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
    expect(payloadBytes, `payload is ${payloadBytes} bytes; recalibrate buildExcelOnlyCivilAndFamilyPayload`).toBeGreaterThan(PDF_PAYLOAD_GATE_BYTES);

    const location = await createUniqueTestLocation({ namePrefix: "Excel Only Email Court" });
    const subscription = await subscribeTestAccount(location.locationId);
    const dates = generatePublicationDates(1);

    const publicationId = await publishJson(listTypeName, payload, dates, location.locationId);

    const notification = await waitForSentNotification(publicationId, subscription.subscriptionId);

    const stored = await waitForStoredFiles(publicationId, [".xlsx"]);
    const excelSize = stored.get(".xlsx")!.sizeBytes!;
    expect(excelSize, `stored Excel is ${excelSize} bytes; recalibrate buildExcelOnlyCivilAndFamilyPayload`).toBeLessThanOrEqual(NOTIFY_ATTACHMENT_LIMIT_BYTES);
    await expectFilesNotStored(publicationId, [".pdf"]);

    const email = await assertEmailDownloadLinks(notification.govNotifyId, 1);
    expectEmailContent(email, { friendlyName: friendlyNameOf(listTypeName), locationName: location.name, formattedContentDate: dates.formattedContentDate });
  });

  test("publication with a generated file over 2 MB stores the file but sends the no-links email @nightly", async () => {
    test.skip(!process.env.GOVUK_NOTIFY_API_KEY, NOTIFY_KEY_MISSING);
    test.setTimeout(180_000);

    const listTypeName = STRATEGIC_LIST_TYPE;
    const location = await createUniqueTestLocation({ namePrefix: "Oversize Email Court" });
    const subscription = await subscribeTestAccount(location.locationId);
    const dates = generatePublicationDates(1);

    const publicationId = await publishJson(listTypeName, buildOversizedCivilAndFamilyPayload(), dates, location.locationId);

    const notification = await waitForSentNotification(publicationId, subscription.subscriptionId);

    // The 2 MB limit only withholds the email link: the oversized Excel is still generated and stored
    const stored = await waitForStoredFiles(publicationId, [".xlsx"]);
    const excelSize = stored.get(".xlsx")!.sizeBytes!;
    expect(excelSize, `stored Excel is ${excelSize} bytes; recalibrate buildOversizedCivilAndFamilyPayload`).toBeGreaterThan(NOTIFY_ATTACHMENT_LIMIT_BYTES);
    // The source payload is above the PDF payload gate, so no PDF is generated
    await expectFilesNotStored(publicationId, [".pdf"]);

    const email = await assertEmailDownloadLinks(notification.govNotifyId, 0);
    expectEmailContent(email, { friendlyName: friendlyNameOf(listTypeName), locationName: location.name, formattedContentDate: dates.formattedContentDate });
  });

  test("upload notifies a displayable publication but defers a future one and skips an expired one @nightly", async () => {
    test.skip(!process.env.GOVUK_NOTIFY_API_KEY, NOTIFY_KEY_MISSING);
    test.setTimeout(180_000);

    const location = await createUniqueTestLocation({ namePrefix: "Upload Trigger Court" });
    const subscription = await subscribeTestAccount(location.locationId);
    const payload = loadListTypeFixture("civil-and-family-daily-cause-list");
    const now = Date.now();

    // The display-from cron, not the upload, notifies a publication whose display-from is tomorrow
    const futureDates = generatePublicationDates(4);
    const futureId = await publishJson(
      STRATEGIC_LIST_TYPE,
      payload,
      { ...futureDates, displayFrom: new Date(now + ONE_DAY_MS).toISOString(), displayTo: new Date(now + 2 * ONE_DAY_MS).toISOString() },
      location.locationId
    );

    const expiredDates = generatePublicationDates(5);
    const expiredId = await publishJson(
      STRATEGIC_LIST_TYPE,
      payload,
      { ...expiredDates, displayFrom: new Date(now - 3 * ONE_DAY_MS).toISOString(), displayTo: new Date(now - 2 * ONE_DAY_MS).toISOString() },
      location.locationId
    );

    const displayableId = await publishJson(STRATEGIC_LIST_TYPE, payload, generatePublicationDates(6), location.locationId);
    await waitForSentNotification(displayableId, subscription.subscriptionId);

    // Files are generated before the notification step runs, so once they exist the skipped uploads have had their chance to notify
    for (const artefactId of [futureId, expiredId]) {
      await waitForStoredFiles(artefactId, ALL_STORED_FILES);
      const notifications = await waitForNotifications(artefactId, 3, 1000);
      expect(notifications, `notifications for ${artefactId}`).toHaveLength(0);
    }
  });
});

type PublicationDates = ReturnType<typeof generatePublicationDates>;
