import { expect, test } from "@playwright/test";
import {
  cleanupTestNotifications,
  cleanupTestSubscriptions,
  cleanupTestUsers,
  createTestSubscription,
  createTestUser,
  getGovNotifyEmail,
  getNotificationsByPublicationId
} from "../../utils/notification-helpers.js";
import { getApiAuthToken } from "../../utils/api-auth-helpers.js";

const API_BASE_URL = "http://localhost:3001";
const ENDPOINT = `${API_BASE_URL}/v1/publication`;

const validPayload = {
  court_id: "1",
  provenance: "XHIBIT",
  content_date: "2024-12-01",
  list_type: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
  sensitivity: "PUBLIC",
  language: "ENGLISH",
  display_from: "2024-12-01T00:00:00Z",
  display_to: "2024-12-02T00:00:00Z",
  hearing_list: { cases: [] }
};

test.describe("Blob Ingestion - Notification E2E Tests", () => {
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
    // Skip all tests in this suite if no valid API token is available
    // API authentication requires proper Azure AD OAuth tokens which are complex to generate in tests
    // These tests can be enabled when a valid TEST_API_TOKEN environment variable is provided
    test.skip(!process.env.TEST_API_TOKEN || process.env.TEST_API_TOKEN === "test-token",
      "Skipping blob ingestion notification tests: Requires valid Azure AD OAuth token in TEST_API_TOKEN. " +
      "Use manual upload notification tests instead, which use SSO authentication.");
  });

  test.afterEach(async () => {
    await cleanupTestNotifications(testData.publicationIds);
    await cleanupTestSubscriptions(testData.subscriptionIds);
    await cleanupTestUsers(testData.userIds);

    testData.userIds = [];
    testData.subscriptionIds = [];
    testData.publicationIds = [];
  });

  test("should send notification to subscribed user and store GOV.UK Notify ID", async ({ request }) => {
    const testUser = await createTestUser("test.notification@example.com");
    testData.userIds.push(testUser.userId);

    const subscription = await createTestSubscription(testUser.userId, 1);
    testData.subscriptionIds.push(subscription.subscriptionId);

    const token = await getApiAuthToken();
    const response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status()).toBe(201);
    const result = await response.json();
    expect(result.success).toBe(true);

    const publicationId = result.artefact_id;
    testData.publicationIds.push(publicationId);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const notifications = await getNotificationsByPublicationId(publicationId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].status).toBe("Sent");
    expect(notifications[0].govNotifyId).toBeTruthy();
    expect(notifications[0].sentAt).toBeTruthy();
  });

  test("should verify GOV.UK Notify email content", async ({ request }) => {
    test.skip(!process.env.GOVNOTIFY_API_KEY, "Skipping: GOVNOTIFY_API_KEY not set");

    const testUser = await createTestUser("govnotify.test@example.com");
    testData.userIds.push(testUser.userId);

    const subscription = await createTestSubscription(testUser.userId, 1);
    testData.subscriptionIds.push(subscription.subscriptionId);

    const token = await getApiAuthToken();
    const response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await response.json();
    testData.publicationIds.push(result.artefact_id);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const notifications = await getNotificationsByPublicationId(result.artefact_id);
    const govNotifyEmail = await getGovNotifyEmail(notifications[0].govNotifyId);

    expect(govNotifyEmail.email_address).toBe("govnotify.test@example.com");
    expect(govNotifyEmail.body).toContain("Test User");
    expect(govNotifyEmail.body).toContain("Civil And Family Daily Cause List");
    expect(govNotifyEmail.status).toMatch(/delivered|sending|pending/);
  });

  test("should send notifications to multiple subscribers", async ({ request }) => {
    const user1 = await createTestUser("user1.notif@example.com");
    const user2 = await createTestUser("user2.notif@example.com");
    testData.userIds.push(user1.userId, user2.userId);

    const sub1 = await createTestSubscription(user1.userId, 1);
    const sub2 = await createTestSubscription(user2.userId, 1);
    testData.subscriptionIds.push(sub1.subscriptionId, sub2.subscriptionId);

    const token = await getApiAuthToken();
    const response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await response.json();
    testData.publicationIds.push(result.artefact_id);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const notifications = await getNotificationsByPublicationId(result.artefact_id);
    expect(notifications).toHaveLength(2);
    expect(notifications.every((n) => n.status === "Sent")).toBe(true);
    expect(notifications.every((n) => n.govNotifyId)).toBe(true);
  });

  test("should skip notifications for users without email addresses", async ({ request }) => {
    const userWithoutEmail = await createTestUser("");
    testData.userIds.push(userWithoutEmail.userId);

    const subscription = await createTestSubscription(userWithoutEmail.userId, 1);
    testData.subscriptionIds.push(subscription.subscriptionId);

    const token = await getApiAuthToken();
    const response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await response.json();
    testData.publicationIds.push(result.artefact_id);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const notifications = await getNotificationsByPublicationId(result.artefact_id);
    expect(notifications[0].status).toBe("Skipped");
    expect(notifications[0].errorMessage).toContain("No email address");
    expect(notifications[0].govNotifyId).toBeNull();
  });

  test("should not send notifications when no subscriptions exist", async ({ request }) => {
    const token = await getApiAuthToken();
    const response = await request.post(ENDPOINT, {
      data: { ...validPayload, court_id: "999" },
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await response.json();
    testData.publicationIds.push(result.artefact_id);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const notifications = await getNotificationsByPublicationId(result.artefact_id);
    expect(notifications).toHaveLength(0);
  });

  test("should skip notifications for invalid email addresses", async ({ request }) => {
    const userWithInvalidEmail = await createTestUser("invalid-email");
    testData.userIds.push(userWithInvalidEmail.userId);

    const subscription = await createTestSubscription(userWithInvalidEmail.userId, 1);
    testData.subscriptionIds.push(subscription.subscriptionId);

    const token = await getApiAuthToken();
    const response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await response.json();
    testData.publicationIds.push(result.artefact_id);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const notifications = await getNotificationsByPublicationId(result.artefact_id);
    expect(notifications[0].status).toBe("Skipped");
    expect(notifications[0].errorMessage).toContain("Invalid email format");
    expect(notifications[0].govNotifyId).toBeNull();
  });
});
