import { expect, test } from "@playwright/test";
import { getApiAuthToken } from "../utils/api-auth-helpers.js";
import {
  cleanupTestNotifications,
  cleanupTestSubscriptions,
  cleanupTestUsers,
  createTestSubscription,
  createTestUser,
  getGovNotifyEmail,
  getNotificationsByPublicationId,
  waitForNotifications
} from "../utils/notification-helpers.js";

const API_BASE_URL = "http://localhost:3001";
const ENDPOINT = `${API_BASE_URL}/v1/publication`;

function createCivilFamilyCauseListPayload(contentDate: string, displayFrom: string, displayTo: string) {
  return {
    court_id: "9001",
    provenance: "MANUAL_UPLOAD",
    content_date: contentDate,
    list_type: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    display_from: displayFrom,
    display_to: displayTo,
    hearing_list: {
      document: {
        publicationDate: `${contentDate}T09:00:00.000Z`,
        version: "1.0"
      },
      venue: {
        venueName: "Test Court Alpha",
        venueAddress: {
          line: ["1 Test Street", "Test District"],
          town: "Test City",
          county: "Test County",
          postCode: "TC1 1TC"
        },
        venueContact: {
          venueTelephone: "01234 567890",
          venueEmail: "test.court@justice.gov.uk"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court Alpha",
            courtHouseAddress: {
              line: ["1 Test Street"],
              town: "Test City",
              postCode: "TC1 1TC"
            },
            courtRoom: [
              {
                courtRoomName: "Court Room 1",
                session: [
                  {
                    judiciary: [
                      {
                        johKnownAs: "Judge Smith",
                        isPresiding: true
                      }
                    ],
                    sittings: [
                      {
                        sittingStart: `${contentDate}T10:00:00Z`,
                        sittingEnd: `${contentDate}T12:00:00Z`,
                        channel: ["In Person"],
                        hearing: [
                          {
                            hearingType: "Trial",
                            case: [
                              {
                                caseNumber: "NOTIF-TEST-001",
                                caseName: "Smith v Jones",
                                caseType: "Civil",
                                caseSequenceIndicator: "1 of 1",
                                party: [
                                  {
                                    partyRole: "APPLICANT_PETITIONER",
                                    individualDetails: {
                                      title: "Mr",
                                      individualForenames: "John",
                                      individualSurname: "Smith"
                                    }
                                  },
                                  {
                                    partyRole: "RESPONDENT",
                                    individualDetails: {
                                      title: "Ms",
                                      individualForenames: "Jane",
                                      individualSurname: "Jones"
                                    }
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                courtRoomName: "Court Room 2",
                session: [
                  {
                    judiciary: [
                      {
                        johKnownAs: "Judge Brown",
                        isPresiding: true
                      }
                    ],
                    sittings: [
                      {
                        sittingStart: `${contentDate}T14:00:00Z`,
                        sittingEnd: `${contentDate}T16:00:00Z`,
                        channel: ["Video"],
                        hearing: [
                          {
                            hearingType: "Hearing",
                            case: [
                              {
                                caseNumber: "NOTIF-TEST-002",
                                caseName: "ABC Ltd v XYZ Corp",
                                caseType: "Family",
                                party: [
                                  {
                                    partyRole: "APPLICANT_PETITIONER",
                                    organisationDetails: {
                                      organisationName: "ABC Limited"
                                    }
                                  }
                                ]
                              }
                            ]
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
    }
  };
}

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

  test("should send email notification with case summary to subscribers", async ({ request }) => {
    test.skip(!process.env.GOVUK_NOTIFY_TEST_API_KEY, "Skipping: GOVUK_NOTIFY_TEST_API_KEY not set");

    // Create test user and subscription
    const testUser = await createTestUser(process.env.CFT_VALID_TEST_ACCOUNT!);
    testData.userIds.push(testUser.userId);

    const subscription = await createTestSubscription(testUser.userId, 9001);
    testData.subscriptionIds.push(subscription.subscriptionId);

    // Upload publication via API
    const contentDate = "2025-06-15";
    const displayFrom = "2025-06-15T00:00:00Z";
    const displayTo = "2025-06-16T23:59:59Z";
    const payload = createCivilFamilyCauseListPayload(contentDate, displayFrom, displayTo);

    const token = await getApiAuthToken();
    const apiResponse = await request.post(ENDPOINT, {
      data: payload,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(apiResponse.status()).toBe(201);
    const result = await apiResponse.json();
    expect(result.artefact_id).toBeDefined();
    testData.publicationIds.push(result.artefact_id);

    // Wait for notification to be sent
    const notifications = await waitForNotifications(result.artefact_id, 15, 1000, true);
    expect(notifications.length).toBeGreaterThan(0);

    // Verify notification was successfully sent
    const sentNotification = notifications.find((n) => n.govNotifyId !== null);

    // Debug logging for CI
    if (!sentNotification) {
      console.error("No notification with govNotifyId found. All notifications:");
      console.error(JSON.stringify(notifications, null, 2));
    }

    expect(sentNotification).toBeDefined();

    // More detailed error logging
    if (sentNotification && sentNotification.status !== "Sent") {
      console.error(`Notification status: ${sentNotification.status}`);
      console.error(`Notification error: ${sentNotification.errorMessage}`);
    }

    expect(sentNotification.status).toBe("Sent");

    // Verify GOV.UK Notify email content
    if (process.env.GOVUK_NOTIFY_TEST_API_KEY && sentNotification?.govNotifyId) {
      const govNotifyEmail = await getGovNotifyEmail(sentNotification.govNotifyId);

      // Verify email recipient
      expect(govNotifyEmail.email_address).toBe(process.env.CFT_VALID_TEST_ACCOUNT!);

      // Verify email contains list type and court information
      expect(govNotifyEmail.body).toContain("Civil and Family Daily Cause List");
      expect(govNotifyEmail.body).toContain("Test Court Alpha");
      expect(govNotifyEmail.body).toContain("15 June 2025");

      // Verify email contains Special Category Data warning
      expect(govNotifyEmail.body).toContain("Special Category Data");
      expect(govNotifyEmail.body).toContain("Data Protection Act 2018");

      // Verify email contains subscription management links
      expect(govNotifyEmail.body).toContain("Manage your subscriptions");
      expect(govNotifyEmail.body).toContain("Unsubscribe");

      // Verify email delivery status
      expect(govNotifyEmail.status).toMatch(/delivered|sending|pending|created|permanent-failure/);
    }
  });

  test("should send notifications to multiple subscribers for same publication", async ({ request }) => {
    test.skip(!process.env.GOVUK_NOTIFY_TEST_API_KEY, "Skipping: GOVUK_NOTIFY_TEST_API_KEY not set");

    // Create multiple test users and subscriptions
    const testUser1 = await createTestUser(process.env.CFT_VALID_TEST_ACCOUNT!);
    const testUser2 = await createTestUser(process.env.CFT_VALID_TEST_ACCOUNT!);
    testData.userIds.push(testUser1.userId, testUser2.userId);

    const subscription1 = await createTestSubscription(testUser1.userId, 9001);
    const subscription2 = await createTestSubscription(testUser2.userId, 9001);
    testData.subscriptionIds.push(subscription1.subscriptionId, subscription2.subscriptionId);

    // Upload publication
    const contentDate = "2025-06-20";
    const displayFrom = "2025-06-20T00:00:00Z";
    const displayTo = "2025-06-21T23:59:59Z";
    const payload = createCivilFamilyCauseListPayload(contentDate, displayFrom, displayTo);

    const token = await getApiAuthToken();
    const apiResponse = await request.post(ENDPOINT, {
      data: payload,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(apiResponse.status()).toBe(201);
    const result = await apiResponse.json();
    testData.publicationIds.push(result.artefact_id);

    // Wait for notifications - give more time for multiple notifications to complete
    let notifications = await waitForNotifications(result.artefact_id, 15, 1000, true);

    // If we don't have both notifications yet, wait a bit longer
    if (notifications.length < 2) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      notifications = await getNotificationsByPublicationId(result.artefact_id);
    }

    // Verify both subscriptions received notifications
    const sub1Notification = notifications.find((n) => n.subscriptionId === subscription1.subscriptionId);
    const sub2Notification = notifications.find((n) => n.subscriptionId === subscription2.subscriptionId);

    expect(sub1Notification).toBeDefined();
    expect(sub2Notification).toBeDefined();

    // Debug logging for CI
    if (sub1Notification?.status !== "Sent") {
      console.error(`Subscriber 1 notification status: ${sub1Notification?.status}`);
      console.error(`Subscriber 1 notification error: ${sub1Notification?.errorMessage}`);
    }
    if (sub2Notification?.status !== "Sent") {
      console.error(`Subscriber 2 notification status: ${sub2Notification?.status}`);
      console.error(`Subscriber 2 notification error: ${sub2Notification?.errorMessage}`);
    }

    // Verify notifications were sent successfully
    expect(sub1Notification?.status).toBe("Sent");
    expect(sub2Notification?.status).toBe("Sent");
    expect(sub1Notification?.govNotifyId).toBeDefined();
    expect(sub2Notification?.govNotifyId).toBeDefined();
  });

  test("should not send notifications when no subscriptions exist for location", async ({ request }) => {
    // Upload to location with no subscriptions (locationId 999)
    const contentDate = "2025-07-05";
    const displayFrom = "2025-07-05T00:00:00Z";
    const displayTo = "2025-07-06T23:59:59Z";

    const payload = {
      ...createCivilFamilyCauseListPayload(contentDate, displayFrom, displayTo),
      court_id: "999"
    };

    const token = await getApiAuthToken();
    const apiResponse = await request.post(ENDPOINT, {
      data: payload,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(apiResponse.status()).toBe(201);
    const result = await apiResponse.json();
    testData.publicationIds.push(result.artefact_id);

    // Wait briefly for any notifications to be processed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify no notifications were created
    const notifications = await waitForNotifications(result.artefact_id, 3, 500);
    expect(notifications).toHaveLength(0);
  });
});
