import { randomUUID } from "node:crypto";
import { prisma } from "@hmcts/postgres";

interface CreateNotificationLogParams {
  subscriptionId: string;
  userId: string;
  publicationId: string;
  locationId: string;
  status: string;
}

export async function createNotificationLog(params: CreateNotificationLogParams): Promise<string> {
  const notificationId = randomUUID();

  await prisma.notificationLog.create({
    data: {
      notificationId,
      subscriptionId: params.subscriptionId,
      userId: params.userId,
      publicationId: params.publicationId,
      locationId: params.locationId,
      status: params.status,
      createdAt: new Date()
    }
  });

  return notificationId;
}

export async function updateNotificationLogSent(notificationId: string): Promise<void> {
  await prisma.notificationLog.update({
    where: { notificationId },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  });
}

export async function updateNotificationLogFailed(notificationId: string, errorMessage: string): Promise<void> {
  await prisma.notificationLog.update({
    where: { notificationId },
    data: {
      status: "FAILED",
      errorMessage,
      failedAt: new Date()
    }
  });
}

export async function findNotificationLogsByPublicationId(publicationId: string) {
  return prisma.notificationLog.findMany({
    where: { publicationId },
    orderBy: { createdAt: "desc" }
  });
}

export async function findNotificationLogsByUserId(userId: string) {
  return prisma.notificationLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
}
