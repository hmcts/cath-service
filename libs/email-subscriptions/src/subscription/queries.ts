import { prisma } from "@hmcts/postgres";

export async function findActiveSubscriptionsByUserId(userId: string) {
  return prisma.subscription.findMany({
    where: {
      userId,
      isActive: true
    },
    orderBy: {
      subscribedAt: "desc"
    }
  });
}

export async function findSubscriptionByUserAndLocation(userId: string, locationId: string) {
  return prisma.subscription.findUnique({
    where: {
      unique_user_location: {
        userId,
        locationId
      }
    }
  });
}

export async function countActiveSubscriptionsByUserId(userId: string) {
  return prisma.subscription.count({
    where: {
      userId,
      isActive: true
    }
  });
}

export async function createSubscriptionRecord(userId: string, locationId: string) {
  return prisma.subscription.create({
    data: {
      userId,
      locationId,
      isActive: true
    }
  });
}

export async function deactivateSubscriptionRecord(subscriptionId: string) {
  return prisma.subscription.update({
    where: { subscriptionId },
    data: {
      isActive: false,
      unsubscribedAt: new Date()
    }
  });
}
