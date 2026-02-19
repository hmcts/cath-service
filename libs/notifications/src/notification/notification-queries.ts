import { prisma } from "@hmcts/postgres";

export interface CreateNotificationData {
  subscriptionId: string | null;
  userId: string;
  publicationId: string;
  status?: string;
  errorMessage?: string;
}

export interface NotificationAuditLog {
  notificationId: string;
  subscriptionId: string | null;
  userId: string;
  publicationId: string;
  govNotifyId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  sentAt: Date | null;
}

export async function createNotificationAuditLog(data: CreateNotificationData): Promise<NotificationAuditLog> {
  const notification = await prisma.notificationAuditLog.create({
    data: {
      subscriptionId: data.subscriptionId,
      userId: data.userId,
      publicationId: data.publicationId,
      status: data.status || "Pending",
      errorMessage: data.errorMessage
    }
  });

  return notification;
}

export async function updateNotificationStatus(
  notificationId: string,
  status: string,
  sentAt?: Date,
  errorMessage?: string,
  govNotifyId?: string
): Promise<void> {
  await prisma.notificationAuditLog.update({
    where: { notificationId },
    data: {
      status,
      sentAt,
      errorMessage,
      govNotifyId
    }
  });
}

export async function getNotificationByGovNotifyId(govNotifyId: string): Promise<NotificationAuditLog | null> {
  return await prisma.notificationAuditLog.findFirst({
    where: { govNotifyId }
  });
}

export async function getNotificationsByPublicationId(publicationId: string): Promise<NotificationAuditLog[]> {
  return await prisma.notificationAuditLog.findMany({
    where: { publicationId }
  });
}
