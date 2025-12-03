import { randomUUID } from "node:crypto";
import { prisma } from "@hmcts/postgres";
import { NotifyClient } from "notifications-node-client";

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
  const userId = randomUUID();

  await prisma.user.create({
    data: {
      userId,
      email,
      firstName,
      surname,
      role: "VERIFIED",
      userProvenance: "CFT_IDAM",
      userProvenanceId: `cft-test-${userId}`
    }
  });

  return { userId, email, firstName, surname };
}

export async function createTestSubscription(userId: string, locationId: number): Promise<TestSubscription> {
  const subscriptionId = randomUUID();

  await prisma.subscription.create({
    data: {
      subscriptionId,
      userId,
      locationId,
      dateAdded: new Date()
    }
  });

  const user = await prisma.user.findUnique({ where: { userId } });

  return {
    subscriptionId,
    userId,
    locationId,
    userEmail: user?.email || ""
  };
}

export async function getNotificationsByPublicationId(publicationId: string) {
  return await (prisma as any).notificationAuditLog.findMany({
    where: { publicationId },
    orderBy: { createdAt: "asc" }
  });
}

export async function waitForNotifications(
  publicationId: string,
  maxRetries = 15,
  delayMs = 1000,
  waitForGovNotifyId = false
): Promise<any[]> {
  let notifications = [];
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    notifications = await getNotificationsByPublicationId(publicationId);

    if (notifications.length > 0) {
      // If waiting for GOV.UK Notify ID, check if at least one notification has it
      if (waitForGovNotifyId) {
        const hasGovNotifyId = notifications.some((n) => n.govNotifyId !== null);
        if (hasGovNotifyId) break;
      } else {
        break;
      }
    }
  }
  return notifications;
}

export async function getNotificationsBySubscriptionId(subscriptionId: string) {
  return await (prisma as any).notificationAuditLog.findMany({
    where: { subscriptionId },
    orderBy: { createdAt: "desc" }
  });
}

export async function getGovNotifyEmail(notificationId: string, maxRetries = 5, delayMs = 2000) {
  const apiKey = process.env.GOVUK_NOTIFY_API_KEY;
  if (!apiKey) {
    throw new Error("GOVUK_NOTIFY_API_KEY not set");
  }

  const notifyClient = new NotifyClient(apiKey);

  // Retry fetching the notification as it might not be immediately available
  let lastError;
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

  await (prisma as any).notificationAuditLog.deleteMany({
    where: {
      publicationId: { in: validIds }
    }
  });
}

export async function cleanupTestSubscriptions(subscriptionIds: string[]) {
  if (subscriptionIds.length === 0) return;

  // Delete notifications first to avoid foreign key constraint violation
  await (prisma as any).notificationAuditLog.deleteMany({
    where: {
      subscriptionId: { in: subscriptionIds }
    }
  });

  // Then delete subscriptions
  await (prisma as any).subscription.deleteMany({
    where: {
      subscriptionId: { in: subscriptionIds }
    }
  });
}

export async function cleanupTestUsers(userIds: string[]) {
  if (userIds.length === 0) return;

  await prisma.user.deleteMany({
    where: {
      userId: { in: userIds }
    }
  });
}
