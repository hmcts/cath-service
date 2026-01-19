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

export async function findSubscriptionsByLocationId(locationId: number) {
  return prisma.subscription.findMany({
    where: {
      searchType: "LOCATION_ID",
      searchValue: locationId.toString()
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
      locationId,
      searchType: "LOCATION_ID",
      searchValue: locationId.toString()
    }
  });
}

export async function findSubscriptionById(subscriptionId: string, userId: string) {
  return prisma.subscription.findFirst({
    where: { subscriptionId, userId }
  });
}

export async function deleteSubscriptionRecord(subscriptionId: string, userId: string) {
  const result = await prisma.subscription.deleteMany({
    where: { subscriptionId, userId }
  });
  return result.count;
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

export async function findSubscriptionsWithLocationByIds(subscriptionIds: string[], userId: string) {
  return prisma.subscription.findMany({
    where: {
      subscriptionId: { in: subscriptionIds },
      userId
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
