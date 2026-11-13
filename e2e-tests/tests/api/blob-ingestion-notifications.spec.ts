import { expect, test } from "@playwright/test";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import {
  createNotificationSubscriber,
  createTestSubscription,
  getGovNotifyEmail,
  getNotificationsByPublicationId,
  waitForNotifications
} from "../../utils/notification-helpers.js";
import { uploadTestPublication } from "../../utils/publication-upload.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Upload only notifies publications that are displayable now and not expired, so the window must be current
const PUBLICATION_DATES = {
  contentDate: new Date().toISOString().split("T")[0],
  displayFrom: new Date().toISOString(),
  displayTo: new Date(Date.now() + ONE_DAY_MS).toISOString()
};

function createValidPayload(locationName: string) {
  return {
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
  };
}

// Users, subscriptions, notifications and artefacts all hang off this test's prefixed court or prefixed
// subscriber, so global-teardown removes them
test.describe("Blob Ingestion - Notification E2E Tests", () => {
  test("should verify GOV.UK Notify email content", async () => {
    test.skip(!process.env.GOVUK_NOTIFY_API_KEY, "Skipping: GOVUK_NOTIFY_API_KEY not set");

    const testLocation = await createUniqueTestLocation({ namePrefix: "Blob Ingestion Notification Court" });
    const testUser = await createNotificationSubscriber();
    await createTestSubscription(testUser.userId, testLocation.locationId);

    const { artefactId } = await uploadTestPublication({
      locationId: testLocation.locationId,
      listTypeName: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
      payload: createValidPayload(testLocation.name),
      ...PUBLICATION_DATES
    });

    // Wait for async notification processing with retry logic (wait for govNotifyId to be populated)
    const notifications = await waitForNotifications(artefactId, 30, 2000, true);

    // Verify notification was created
    expect(notifications.length).toBeGreaterThan(0);

    // Find the notification that was successfully sent (has govNotifyId)
    const sentNotification = notifications.find((n) => n.govNotifyId !== null);
    expect(sentNotification).toBeDefined();
    expect(sentNotification?.govNotifyId).toBeDefined();

    const govNotifyEmail = await getGovNotifyEmail(sentNotification?.govNotifyId ?? "");

    expect(govNotifyEmail.email_address).toBe(process.env.CFT_VALID_TEST_ACCOUNT!);
    expect(govNotifyEmail.body).toContain("Civil and Family Daily Cause List");
    expect(govNotifyEmail.body).toContain(testLocation.name);
    // Status can be: delivered, sending, pending, created, or permanent-failure (for test accounts)
    expect(govNotifyEmail.status).toMatch(/delivered|sending|pending|created|permanent-failure/);
  });

  // Note: Test "should skip notifications for users without email addresses" was removed
  // because the API now validates that email is required when creating users.
  // Users without email addresses cannot be created through the API.

  test("should not send notifications when no subscriptions exist", async () => {
    // An own court nobody subscribes to, rather than a fixed id that may belong to a real court
    const unsubscribedLocation = await createUniqueTestLocation({ namePrefix: "Unsubscribed Blob Ingestion Court" });

    const { artefactId } = await uploadTestPublication({
      locationId: unsubscribedLocation.locationId,
      listTypeName: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
      payload: createValidPayload(unsubscribedLocation.name),
      ...PUBLICATION_DATES
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const notifications = await getNotificationsByPublicationId(artefactId);
    expect(notifications).toHaveLength(0);
  });
});
