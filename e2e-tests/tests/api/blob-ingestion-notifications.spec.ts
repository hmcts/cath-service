import { expect, test } from "@playwright/test";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import { getApiAuthToken } from "../../utils/api-auth-helpers.js";
import {
  cleanupTestNotifications,
  cleanupTestSubscriptions,
  cleanupTestUsers,
  createTestSubscription,
  createTestUser,
  getGovNotifyEmail,
  getNotificationsByPublicationId,
  waitForNotifications
} from "../../utils/notification-helpers.js";

const API_BASE_URL = "http://localhost:3001";
const ENDPOINT = `${API_BASE_URL}/v1/publication`;

function createValidPayload(locationId: number, locationName: string) {
  return {
    court_id: locationId.toString(),
    provenance: "XHIBIT",
    content_date: "2024-12-01",
    list_type: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    display_from: "2024-12-01T00:00:00Z",
    display_to: "2024-12-02T00:00:00Z",
    hearing_list: {
      document: {
        publicationDate: "2024-12-01T00:00:00.000Z",
        version: "1.0"
      },
      venue: {
        venueName: locationName,
        venueAddress: {
          line: ["St Aldates"],
          town: "Oxford",
          postCode: "OX1 1TL"
        },
        venueContact: {
          venueTelephone: "01865000000",
          venueEmail: "court@test.hmcts.net"
        }
      },
      courtLists: []
    }
  };
}

test.describe("Blob Ingestion - Notification E2E Tests", () => {
  // Shared test location for the entire test suite
  let testLocationId: number;
  let testLocationName: string;

  const testData: {
    userIds: string[];
    subscriptionIds: string[];
    publicationIds: string[];
  } = {
    userIds: [],
    subscriptionIds: [],
    publicationIds: []
  };

  // Create test location before all tests run
  test.beforeAll(async () => {
    const testLocation = await createUniqueTestLocation({ namePrefix: "Blob Ingestion Notification Court" });
    testLocationId = testLocation.locationId;
    testLocationName = testLocation.name;
  });

  test.afterEach(async () => {
    await cleanupTestNotifications(testData.publicationIds);
    await cleanupTestSubscriptions(testData.subscriptionIds);
    await cleanupTestUsers(testData.userIds);

    testData.userIds = [];
    testData.subscriptionIds = [];
    testData.publicationIds = [];
  });

  test("should verify GOV.UK Notify email content", async ({ request }) => {
    test.skip(!process.env.GOVUK_NOTIFY_API_KEY, "Skipping: GOVUK_NOTIFY_API_KEY not set");

    const testUser = await createTestUser(process.env.CFT_VALID_TEST_ACCOUNT!);
    testData.userIds.push(testUser.userId);

    const subscription = await createTestSubscription(testUser.userId, testLocationId);
    testData.subscriptionIds.push(subscription.subscriptionId);

    const token = await getApiAuthToken();
    const response = await request.post(ENDPOINT, {
      data: createValidPayload(testLocationId, testLocationName),
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await response.json();
    testData.publicationIds.push(result.artefact_id);

    // Wait for async notification processing with retry logic (wait for govNotifyId to be populated)
    const notifications = await waitForNotifications(result.artefact_id, 15, 1000, true);

    // Verify notification was created
    expect(notifications.length).toBeGreaterThan(0);

    // Find the notification that was successfully sent (has govNotifyId)
    const sentNotification = notifications.find((n) => n.govNotifyId !== null);
    expect(sentNotification).toBeDefined();
    expect(sentNotification.govNotifyId).toBeDefined();

    const govNotifyEmail = await getGovNotifyEmail(sentNotification.govNotifyId);

    expect(govNotifyEmail.email_address).toBe(process.env.CFT_VALID_TEST_ACCOUNT!);
    expect(govNotifyEmail.body).toContain("Civil and Family Daily Cause List");
    expect(govNotifyEmail.body).toContain(testLocationName);
    // Status can be: delivered, sending, pending, created, or permanent-failure (for test accounts)
    expect(govNotifyEmail.status).toMatch(/delivered|sending|pending|created|permanent-failure/);
  });

  test("should skip notifications for users without email addresses", async ({ request }) => {
    const userWithoutEmail = await createTestUser("");
    testData.userIds.push(userWithoutEmail.userId);

    const subscription = await createTestSubscription(userWithoutEmail.userId, testLocationId);
    testData.subscriptionIds.push(subscription.subscriptionId);

    const token = await getApiAuthToken();
    const response = await request.post(ENDPOINT, {
      data: createValidPayload(testLocationId, testLocationName),
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await response.json();
    testData.publicationIds.push(result.artefact_id);

    // Wait for async notification processing (with retry logic)
    const notifications = await waitForNotifications(result.artefact_id);

    // Filter to only this test's subscription
    const myNotifications = notifications.filter((n) => n.subscriptionId === subscription.subscriptionId);
    expect(myNotifications.length).toBeGreaterThan(0);
    expect(myNotifications[0].status).toBe("Skipped");
    expect(myNotifications[0].errorMessage).toContain("No email address");
    expect(myNotifications[0].govNotifyId).toBeNull();
  });

  test("should not send notifications when no subscriptions exist", async ({ request }) => {
    const token = await getApiAuthToken();
    const response = await request.post(ENDPOINT, {
      data: createValidPayload(999, "Non-existent Court"),
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await response.json();
    testData.publicationIds.push(result.artefact_id);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const notifications = await getNotificationsByPublicationId(result.artefact_id);
    expect(notifications).toHaveLength(0);
  });
});
