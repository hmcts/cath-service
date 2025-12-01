import { prisma } from "@hmcts/postgres";

export interface CreateNotificationData {
  subscriptionId: string;
  userId: string;
  publicationId: string;
  status?: string;
}

export interface NotificationAuditLog {
  notificationId: string;
  subscriptionId: string;
  userId: string;
  publicationId: string;
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
      status: data.status || "Pending"
    }
  });

  return notification;
}

export async function updateNotificationStatus(notificationId: string, status: string, sentAt?: Date, errorMessage?: string): Promise<void> {
  await prisma.notificationAuditLog.update({
    where: { notificationId },
    data: {
      status,
      sentAt,
      errorMessage
    }
  });
}

export async function findExistingNotification(userId: string, publicationId: string): Promise<NotificationAuditLog | null> {
  const notification = await prisma.notificationAuditLog.findUnique({
    where: {
      userId_publicationId: {
        userId,
        publicationId
      }
    }
  });

  return notification;
}
