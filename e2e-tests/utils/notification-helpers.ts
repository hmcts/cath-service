import { NotifyClient } from "notifications-node-client";
import {
  createTestSubscription as createSubscriptionApi,
  createTestUser as createUserApi,
  deleteTestNotifications,
  deleteTestSubscriptions,
  deleteTestUsers,
  getNotificationsByPublicationId as getNotificationsByPublicationIdApi,
  getNotificationsBySubscriptionId as getNotificationsBySubscriptionIdApi,
  type NotificationRecord
} from "./test-support-api.js";

export interface TestSubscription {
  subscriptionId: string;
  userId: string;
  locationId: number;
  userEmail: string;
}

export interface TestUser {
  userId: string;
  email: string;
  firstName: string;
  surname: string;
}

export async function createTestUser(email: string, firstName = "Test", surname = "User"): Promise<TestUser> {
  const user = await createUserApi({
    email,
    firstName,
    surname,
    userProvenance: "CFT_IDAM",
    role: "VERIFIED"
  });

  return {
    userId: user.userId,
    email: user.email,
    firstName: user.firstName,
    surname: user.surname
  };
}

export async function createTestSubscription(userId: string, locationId: number): Promise<TestSubscription> {
  const subscription = await createSubscriptionApi({
    userId,
    searchType: "LOCATION_ID",
    searchValue: locationId.toString()
  });

  return {
    subscriptionId: subscription.subscriptionId,
    userId: subscription.userId,
    locationId,
    userEmail: "" // Email not returned from subscription API, but tests don't seem to need it
  };
}

export async function getNotificationsByPublicationId(publicationId: string): Promise<NotificationRecord[]> {
  return getNotificationsByPublicationIdApi(publicationId);
}

const TERMINAL_STATUSES = new Set(["Sent", "Failed", "Skipped"]);

export async function waitForNotifications(
  publicationId: string,
  maxRetries = 15,
  delayMs = 1000,
  waitForGovNotifyId = false,
  waitForTerminalStatus = false
): Promise<NotificationRecord[]> {
  let notifications: NotificationRecord[] = [];
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    notifications = await getNotificationsByPublicationId(publicationId);

    if (notifications.length > 0) {
      if (waitForGovNotifyId) {
        // Wait until at least one notification has a GOV.UK Notify ID
        const hasGovNotifyId = notifications.some((n) => n.govNotifyId !== null);
        if (hasGovNotifyId) break;
      } else if (waitForTerminalStatus) {
        // Wait until all notifications have reached a terminal status (not Pending)
        // Needed because processPublication runs fire-and-forget after the API 201 response
        const allTerminal = notifications.every((n) => TERMINAL_STATUSES.has(n.status));
        if (allTerminal) break;
      } else {
        break;
      }
    }
  }
  return notifications;
}

export async function getNotificationsBySubscriptionId(subscriptionId: string): Promise<NotificationRecord[]> {
  return getNotificationsBySubscriptionIdApi(subscriptionId);
}

export async function getGovNotifyEmail(notificationId: string, maxRetries = 5, delayMs = 2000) {
  const apiKey = process.env.GOVUK_NOTIFY_API_KEY;
  if (!apiKey) {
    throw new Error("GOVUK_NOTIFY_API_KEY not set");
  }

  const notifyClient = new NotifyClient(apiKey);

  // Retry fetching the notification as it might not be immediately available
  let lastError: Error | undefined;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const response = await notifyClient.getNotificationById(notificationId);
      // The notifications-node-client v8.x returns response.data (Axios response structure)
      return response.data;
    } catch (error: any) {
      lastError = error;
      console.log(`Attempt ${i + 1}/${maxRetries} failed to fetch notification ${notificationId}:`, error.message);
      if (i === maxRetries - 1) {
        throw new Error(`Failed to fetch notification after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }

  throw lastError;
}

export async function cleanupTestNotifications(publicationIds: string[]) {
  const validIds = publicationIds.filter((id) => id !== undefined && id !== null);
  if (validIds.length === 0) return;

  await deleteTestNotifications({ publicationIds: validIds });
}

export async function cleanupTestSubscriptions(subscriptionIds: string[]) {
  if (subscriptionIds.length === 0) return;

  // Delete notifications first to avoid foreign key constraint violation
  await deleteTestNotifications({ subscriptionIds });

  // Then delete subscriptions
  await deleteTestSubscriptions({ searchValues: subscriptionIds });
}

export async function getLatestArtefactByLocationAndListType(locationId: number, listTypeId: number) {
  return await prisma.artefact.findFirst({
    where: {
      locationId: locationId.toString(),
      listTypeId
    },
    orderBy: { lastReceivedDate: "desc" }
  });
}

export async function cleanupTestUsers(userIds: string[]) {
  if (userIds.length === 0) return;

  await deleteTestUsers(userIds);
}
