import { prisma } from "@hmcts/postgres";

export async function findSubscriptionsByUserId(userId: string) {
  return prisma.subscription.findMany({
    where: {
      userId
    },
    orderBy: {
      dateAdded: "desc"
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

export async function countSubscriptionsByUserId(userId: string) {
  return prisma.subscription.count({
    where: {
      userId
    }
  });
}

export async function createSubscriptionRecord(userId: string, locationId: string) {
  return prisma.subscription.create({
    data: {
      userId,
      locationId
    }
  });
}

export async function deleteSubscriptionRecord(subscriptionId: string) {
  return prisma.subscription.delete({
    where: { subscriptionId }
  });
}
