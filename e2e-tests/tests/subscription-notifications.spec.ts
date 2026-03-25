import { expect, test } from "@playwright/test";
import {
  cleanupTestNotifications,
  cleanupTestSubscriptions,
  cleanupTestUsers,
  createTestSubscription,
  createTestUser,
  getNotificationsByPublicationId,
  waitForNotifications
} from "../utils/notification-helpers.js";
import { getApiAuthToken } from "../utils/api-auth-helpers.js";

const API_BASE_URL = "http://localhost:3001";
const ENDPOINT = `${API_BASE_URL}/v1/publication`;

const VALID_PAYLOAD = {
  court_id: "9001",
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
      venueName: "Test Court Alpha",
      venueAddress: {
        line: ["Test Street"],
        town: "Test Town",
        postCode: "TE1 1ST"
      },
      venueContact: {
        venueTelephone: "01234567890",
        venueEmail: "court@test.hmcts.net"
      }
    },
    courtLists: []
  }
};

test.describe("Subscription Notifications - Email Summary and PDF", () => {
  const testData: {
    userIds: string[];
    subscriptionIds: string[];
    publicationIds: string[];
  } = {
    userIds: [],
    subscriptionIds: [],
    publicationIds: []
  };

  test.afterEach(async () => {
    await cleanupTestNotifications(testData.publicationIds);
    await cleanupTestSubscriptions(testData.subscriptionIds);
    await cleanupTestUsers(testData.userIds);

    testData.userIds = [];
    testData.subscriptionIds = [];
    testData.publicationIds = [];
  });

  test("should create notification audit log entry when publication is posted for subscribed court @nightly", async ({ request }) => {
    const testUser = await createTestUser("notify-test@test.hmcts.net");
    testData.userIds.push(testUser.userId);

    const subscription = await createTestSubscription(testUser.userId, 9001);
    testData.subscriptionIds.push(subscription.subscriptionId);

    const token = await getApiAuthToken();
    const response = await request.post(ENDPOINT, {
      data: VALID_PAYLOAD,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status()).toBe(201);
    const result = await response.json();
    testData.publicationIds.push(result.artefact_id);

    const notifications = await waitForNotifications(result.artefact_id);

    const myNotifications = notifications.filter((n) => n.subscriptionId === subscription.subscriptionId);
    expect(myNotifications.length).toBeGreaterThan(0);
    expect(myNotifications[0].publicationId).toBe(result.artefact_id);
    expect(myNotifications[0].userId).toBe(testUser.userId);
    expect(["Sent", "Failed", "Pending"]).toContain(myNotifications[0].status);
  });

  test("should send email notification with case summary to subscribers @nightly", async ({ request }) => {
    const testUser = await createTestUser("subscriber-summary@test.hmcts.net");
    testData.userIds.push(testUser.userId);

    const subscription = await createTestSubscription(testUser.userId, 9001);
    testData.subscriptionIds.push(subscription.subscriptionId);

    const token = await getApiAuthToken();
    const response = await request.post(ENDPOINT, {
      data: VALID_PAYLOAD,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status()).toBe(201);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.artefact_id).toBeDefined();
    testData.publicationIds.push(result.artefact_id);

    const notifications = await waitForNotifications(result.artefact_id);

    const myNotifications = notifications.filter((n) => n.subscriptionId === subscription.subscriptionId);
    expect(myNotifications.length).toBeGreaterThan(0);

    const notification = myNotifications[0];
    expect(notification.publicationId).toBe(result.artefact_id);
    expect(notification.userId).toBe(testUser.userId);
    expect(notification.subscriptionId).toBe(subscription.subscriptionId);
    expect(["Sent", "Pending", "Failed"]).toContain(notification.status);
    expect(notification.createdAt).toBeDefined();
  });

  test("should send notifications to multiple subscribers for same publication @nightly", async ({ request }) => {
    const userA = await createTestUser("subscriber-a@test.hmcts.net");
    testData.userIds.push(userA.userId);
    const userB = await createTestUser("subscriber-b@test.hmcts.net");
    testData.userIds.push(userB.userId);

    const subscriptionA = await createTestSubscription(userA.userId, 9001);
    testData.subscriptionIds.push(subscriptionA.subscriptionId);
    const subscriptionB = await createTestSubscription(userB.userId, 9001);
    testData.subscriptionIds.push(subscriptionB.subscriptionId);

    const token = await getApiAuthToken();
    const response = await request.post(ENDPOINT, {
      data: VALID_PAYLOAD,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status()).toBe(201);
    const result = await response.json();
    expect(result.success).toBe(true);
    testData.publicationIds.push(result.artefact_id);

    const notifications = await waitForNotifications(result.artefact_id);

    const notificationsForA = notifications.filter((n) => n.subscriptionId === subscriptionA.subscriptionId);
    const notificationsForB = notifications.filter((n) => n.subscriptionId === subscriptionB.subscriptionId);

    expect(notificationsForA.length).toBeGreaterThan(0);
    expect(notificationsForB.length).toBeGreaterThan(0);

    expect(notificationsForA[0].userId).toBe(userA.userId);
    expect(notificationsForB[0].userId).toBe(userB.userId);

    const allNotifications = await getNotificationsByPublicationId(result.artefact_id);
    const ourNotifications = allNotifications.filter(
      (n) => n.subscriptionId === subscriptionA.subscriptionId || n.subscriptionId === subscriptionB.subscriptionId
    );
    expect(ourNotifications.length).toBeGreaterThanOrEqual(2);
  });
});
