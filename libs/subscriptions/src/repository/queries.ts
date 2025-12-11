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

export async function findSubscriptionByUserAndLocation(userId: string, locationId: number) {
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

export async function createSubscriptionRecord(userId: string, locationId: number) {
  return prisma.subscription.create({
    data: {
      userId,
      locationId
    }
  });
}

export async function findSubscriptionById(subscriptionId: string) {
  return prisma.subscription.findUnique({
    where: { subscriptionId }
  });
}

export async function deleteSubscriptionRecord(subscriptionId: string) {
  return prisma.subscription.delete({
    where: { subscriptionId }
  });
}

export async function findSubscriptionsWithLocationByUserId(userId: string) {
  return prisma.subscription.findMany({
    where: { userId },
    orderBy: { dateAdded: "desc" },
    include: {
      location: true
    }
  });
}

export async function findSubscriptionsByIds(subscriptionIds: string[]) {
  return prisma.subscription.findMany({
    where: {
      subscriptionId: { in: subscriptionIds }
    },
    select: {
      subscriptionId: true,
      userId: true
    }
  });
}

export async function findSubscriptionsWithLocationByIds(subscriptionIds: string[]) {
  return prisma.subscription.findMany({
    where: {
      subscriptionId: { in: subscriptionIds }
    },
    orderBy: { dateAdded: "desc" },
    include: {
      location: true
    }
  });
}

export async function deleteSubscriptionsByIds(subscriptionIds: string[], userId: string) {
  return prisma.$transaction(async (tx) => {
    const deleteResult = await tx.subscription.deleteMany({
      where: {
        subscriptionId: { in: subscriptionIds },
        userId
      }
    });

    return deleteResult.count;
  });
}
