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

  await (prisma as any).subscription.create({
    data: {
      subscriptionId,
      userId,
      locationId
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

export async function getGovNotifyEmail(notificationId: string) {
  const apiKey = process.env.GOVUK_NOTIFY_API_KEY;
  if (!apiKey) {
    throw new Error("GOVUK_NOTIFY_API_KEY not set");
  }

  const notifyClient = new NotifyClient(apiKey);
  return await notifyClient.getNotificationById(notificationId);
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
