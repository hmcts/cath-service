import { type APIRequestContext, expect, test } from "@playwright/test";
import { getApiAuthToken } from "../../utils/api-auth-helpers.js";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import {
  buildExcelOnlyCivilAndFamilyPayload,
  buildOversizedCivilAndFamilyPayload,
  EMAIL_LINK_CASES,
  expectedLinkCount,
  NOTIFY_ATTACHMENT_LIMIT_BYTES,
  PDF_PAYLOAD_GATE_BYTES,
  type StoredFileExtension
} from "../../utils/list-type-email-cases.js";
import {
  assertEmailDownloadLinks,
  cleanupTestNotifications,
  cleanupTestSubscriptions,
  cleanupTestUsers,
  createTestSubscription,
  createTestUser,
  type GovNotifyEmail,
  waitForNotifications
} from "../../utils/notification-helpers.js";
import { checkFlatFileExists, deleteTestArtefacts, type FlatFileInfo, getListTypes, type NotificationRecord } from "../../utils/test-support-api.js";

const API_BASE_URL = process.env.CATH_SERVICE_API_URL || process.env.API_URL || "http://localhost:3001";
const ENDPOINT = `${API_BASE_URL}/publication`;
const NOTIFY_KEY_MISSING = "GOVUK_NOTIFY_API_KEY not set - the email body cannot be read back from Notify";
const NOTIFY_STATUS_PATTERN = /delivered|sending|pending|created|permanent-failure/;
const ALL_STORED_FILES: StoredFileExtension[] = [".pdf", ".xlsx"];

function generatePublicationDates(daysFromNow = 1) {
  const now = new Date();
  const contentDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
  const displayTo = new Date(contentDate.getTime() + 24 * 60 * 60 * 1000);

  return {
    contentDate: contentDate.toISOString().split("T")[0],
    displayFrom: contentDate.toISOString(),
    displayTo: displayTo.toISOString(),
    formattedContentDate: contentDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
  };
}

// Publication metadata travels in x-* headers; the request body is the payload itself.
function publicationHeaders(listType: string, dates: PublicationDates, locationId: number) {
  return {
    "x-provenance": "MANUAL_UPLOAD",
    "x-court-id": locationId.toString(),
    "x-content-date": dates.contentDate,
    "x-list-type": listType,
    "x-language": "ENGLISH",
    "x-type": "LIST",
    "x-sensitivity": "PUBLIC",
    "x-display-from": dates.displayFrom,
    "x-display-to": dates.displayTo
  };
}

async function publishJson(request: APIRequestContext, listTypeName: string, payload: unknown, dates: PublicationDates, locationId: number): Promise<string> {
  const token = await getApiAuthToken();
  const response = await request.post(ENDPOINT, {
    data: payload,
    headers: { ...publicationHeaders(listTypeName, dates, locationId), Authorization: `Bearer ${token}` }
  });

  expect(response.status(), await response.text()).toBe(201);
  const { artefactId } = await response.json();
  expect(artefactId).toBeDefined();
  return artefactId;
}

async function publishFlatFile(request: APIRequestContext, listTypeName: string, dates: PublicationDates, locationId: number): Promise<string> {
  const token = await getApiAuthToken();
  const response = await request.post(ENDPOINT, {
    multipart: { file: { name: "hearing-list.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") } },
    headers: { ...publicationHeaders(listTypeName, dates, locationId), Authorization: `Bearer ${token}` }
  });

  expect(response.status(), await response.text()).toBe(201);
  const { artefactId } = await response.json();
  expect(artefactId).toBeDefined();
  return artefactId;
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

  const testData: {
    userIds: string[];
    subscriptionIds: string[];
    publicationIds: string[];
  } = {
    userIds: [],
    subscriptionIds: [],
    publicationIds: []
  };

  test.beforeAll(async () => {
    // Exact name match: the test-support ?name= lookup uses `contains`, which confuses e.g. FAMILY_ with CIVIL_AND_FAMILY_
    const listTypes = (await getListTypes()) as { name: string; friendlyName: string | null }[];
    for (const listType of listTypes) {
      friendlyNames.set(listType.name, listType.friendlyName ?? listType.name);
    }
  });

  test.afterEach(async () => {
    // Users are created with the real CFT_IDAM test account email (not prefixed), so they and their
    // subscriptions, notifications and artefacts are cleaned up here. Locations are prefixed and
    // removed by global-teardown.
    await cleanupTestNotifications(testData.publicationIds);
    await cleanupTestSubscriptions(testData.subscriptionIds);
    await cleanupTestUsers(testData.userIds);

    if (testData.publicationIds.length > 0) {
      await deleteTestArtefacts({ artefactIds: testData.publicationIds });
    }

    testData.userIds = [];
    testData.subscriptionIds = [];
    testData.publicationIds = [];
  });

  async function subscribeTestAccount(locationId: number) {
    const user = await createTestUser(process.env.CFT_VALID_TEST_ACCOUNT!);
    testData.userIds.push(user.userId);

    const subscription = await createTestSubscription(user.userId, locationId);
    testData.subscriptionIds.push(subscription.subscriptionId);

    return subscription;
  }

  function friendlyNameOf(listTypeName: string): string {
    const friendlyName = friendlyNames.get(listTypeName);
    expect(friendlyName, `list type ${listTypeName} is seeded`).toBeDefined();
    return friendlyName!;
  }

  test("notification delivery to single and multiple subscribers", async ({ request }) => {
    test.skip(!process.env.GOVUK_NOTIFY_API_KEY, NOTIFY_KEY_MISSING);
    test.setTimeout(180_000);

    const location = await createUniqueTestLocation({ namePrefix: "Subscription Notification Court" });
    const listTypeName = "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST";
    const payload = EMAIL_LINK_CASES.find((c) => c.listTypeName === listTypeName)!.buildPayload();

    // PART 1: single subscriber receives an email with the standard subscription content
    const subscription1 = await subscribeTestAccount(location.locationId);
    const dates1 = generatePublicationDates(1);
    const publicationId1 = await publishJson(request, listTypeName, payload, dates1, location.locationId);
    testData.publicationIds.push(publicationId1);

    const notification1 = await waitForSentNotification(publicationId1, subscription1.subscriptionId);
    const email = await assertEmailDownloadLinks(notification1.govNotifyId, 2);

    expectEmailContent(email, { friendlyName: friendlyNameOf(listTypeName), locationName: location.name, formattedContentDate: dates1.formattedContentDate });
    expect(email.body).toContain("Special Category Data");
    expect(email.body).toContain("Data Protection Act 2018");
    expect(email.body).toContain("Manage your subscriptions");
    expect(email.body).toContain("Unsubscribe");

    // PART 2: every subscriber to the location is notified for the same publication
    const subscription2 = await subscribeTestAccount(location.locationId);
    const dates2 = generatePublicationDates(2);
    const publicationId2 = await publishJson(request, listTypeName, payload, dates2, location.locationId);
    testData.publicationIds.push(publicationId2);

    await waitForSentNotification(publicationId2, subscription1.subscriptionId);
    await waitForSentNotification(publicationId2, subscription2.subscriptionId);
  });

  test("no notifications sent when no subscriptions exist for location @nightly", async ({ request }) => {
    const location = await createUniqueTestLocation({ namePrefix: "Unsubscribed Notification Court" });
    const payload = EMAIL_LINK_CASES.find((c) => c.listTypeName === "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST")!.buildPayload();

    const publicationId = await publishJson(request, "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST", payload, generatePublicationDates(3), location.locationId);
    testData.publicationIds.push(publicationId);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const notifications = await waitForNotifications(publicationId, 3, 500);
    expect(notifications).toHaveLength(0);
  });

  for (const emailCase of EMAIL_LINK_CASES) {
    const linkCount = expectedLinkCount(emailCase.expectedFiles);

    test(`${emailCase.listTypeName} email has ${linkCount} document download link(s)${emailCase.nightly ? " @nightly" : ""}`, async ({ request }) => {
      test.skip(!process.env.GOVUK_NOTIFY_API_KEY, NOTIFY_KEY_MISSING);
      // Puppeteer PDF generation can take 40-60 seconds on a CI cold start, and notifications follow it
      test.setTimeout(120_000);

      const location = await createUniqueTestLocation({ namePrefix: "Email Link Court" });
      const subscription = await subscribeTestAccount(location.locationId);
      const dates = generatePublicationDates(1);

      const publicationId = await publishJson(request, emailCase.listTypeName, emailCase.buildPayload(), dates, location.locationId);
      testData.publicationIds.push(publicationId);

      const notification = await waitForSentNotification(publicationId, subscription.subscriptionId);

      // A missing file would also lower the link count, so prove generation matched expectations first
      await waitForStoredFiles(publicationId, emailCase.expectedFiles);
      await expectFilesNotStored(
        publicationId,
        ALL_STORED_FILES.filter((extension) => !emailCase.expectedFiles.includes(extension))
      );

      const email = await assertEmailDownloadLinks(notification.govNotifyId, linkCount);
      expectEmailContent(email, {
        friendlyName: friendlyNameOf(emailCase.listTypeName),
        locationName: location.name,
        formattedContentDate: dates.formattedContentDate
      });
    });
  }

  test("flat-file publication sends the flat-file email with 1 link to the uploaded document", async ({ request }) => {
    test.skip(!process.env.GOVUK_NOTIFY_API_KEY, NOTIFY_KEY_MISSING);
    test.setTimeout(120_000);

    const listTypeName = "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST";
    const location = await createUniqueTestLocation({ namePrefix: "Flat File Email Court" });
    const subscription = await subscribeTestAccount(location.locationId);
    const dates = generatePublicationDates(1);

    const publicationId = await publishFlatFile(request, listTypeName, dates, location.locationId);
    testData.publicationIds.push(publicationId);

    const notification = await waitForSentNotification(publicationId, subscription.subscriptionId);

    // Flat files carry no JSON, so nothing is generated into the publications container
    await expectFilesNotStored(publicationId, ALL_STORED_FILES);

    // The flat-file template links the uploaded document itself rather than any generated PDF/Excel
    const email = await assertEmailDownloadLinks(notification.govNotifyId, 1);
    expectEmailContent(email, { friendlyName: friendlyNameOf(listTypeName), locationName: location.name, formattedContentDate: dates.formattedContentDate });
  });

  test("publication over the PDF payload gate sends the Excel-only email with 1 link", async ({ request }) => {
    test.skip(!process.env.GOVUK_NOTIFY_API_KEY, NOTIFY_KEY_MISSING);
    test.setTimeout(120_000);

    const listTypeName = "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST";
    const payload = buildExcelOnlyCivilAndFamilyPayload();
    const payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
    expect(payloadBytes, `payload is ${payloadBytes} bytes; recalibrate buildExcelOnlyCivilAndFamilyPayload`).toBeGreaterThan(PDF_PAYLOAD_GATE_BYTES);

    const location = await createUniqueTestLocation({ namePrefix: "Excel Only Email Court" });
    const subscription = await subscribeTestAccount(location.locationId);
    const dates = generatePublicationDates(1);

    const publicationId = await publishJson(request, listTypeName, payload, dates, location.locationId);
    testData.publicationIds.push(publicationId);

    const notification = await waitForSentNotification(publicationId, subscription.subscriptionId);

    const stored = await waitForStoredFiles(publicationId, [".xlsx"]);
    const excelSize = stored.get(".xlsx")!.sizeBytes!;
    expect(excelSize, `stored Excel is ${excelSize} bytes; recalibrate buildExcelOnlyCivilAndFamilyPayload`).toBeLessThanOrEqual(NOTIFY_ATTACHMENT_LIMIT_BYTES);
    await expectFilesNotStored(publicationId, [".pdf"]);

    const email = await assertEmailDownloadLinks(notification.govNotifyId, 1);
    expectEmailContent(email, { friendlyName: friendlyNameOf(listTypeName), locationName: location.name, formattedContentDate: dates.formattedContentDate });
  });

  test("publication with a generated file over 2 MB stores the file but sends the no-links email", async ({ request }) => {
    test.skip(!process.env.GOVUK_NOTIFY_API_KEY, NOTIFY_KEY_MISSING);
    test.setTimeout(180_000);

    const listTypeName = "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST";
    const location = await createUniqueTestLocation({ namePrefix: "Oversize Email Court" });
    const subscription = await subscribeTestAccount(location.locationId);
    const dates = generatePublicationDates(1);

    const publicationId = await publishJson(request, listTypeName, buildOversizedCivilAndFamilyPayload(), dates, location.locationId);
    testData.publicationIds.push(publicationId);

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
});

type PublicationDates = ReturnType<typeof generatePublicationDates>;
