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
      unique_user_subscription: {
        userId,
        searchType: "LOCATION_ID",
        searchValue: locationId.toString()
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
    where: {
      userId,
      searchType: "LOCATION_ID"
    },
    orderBy: { dateAdded: "desc" }
  });
}

export async function findSubscriptionsWithLocationByIds(subscriptionIds: string[], userId: string) {
  return prisma.subscription.findMany({
    where: {
      subscriptionId: { in: subscriptionIds },
      userId,
      searchType: "LOCATION_ID"
    },
    orderBy: { dateAdded: "desc" }
  });
}

export async function findSubscriptionsByIds(subscriptionIds: string[], userId: string) {
  return prisma.subscription.findMany({
    where: {
      subscriptionId: { in: subscriptionIds },
      userId
    },
    orderBy: { dateAdded: "desc" }
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

export async function findByUserId(userId: string) {
  return prisma.subscription.findMany({
    where: {
      userId
    },
    orderBy: {
      dateAdded: "desc"
    }
  });
}

export async function findByUserIdAndType(userId: string, searchType: string) {
  return prisma.subscription.findMany({
    where: {
      userId,
      searchType
    },
    orderBy: {
      dateAdded: "desc"
    }
  });
}

export async function findByUserIdTypeAndValue(userId: string, searchType: string, searchValue: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      searchType,
      searchValue
    }
  });
}

export async function createSubscription(userId: string, searchType: string, searchValue: string, caseName: string | null, caseNumber: string | null) {
  return prisma.subscription.create({
    data: {
      userId,
      searchType,
      searchValue,
      caseName,
      caseNumber
    }
  });
}

export async function deleteSubscription(id: string) {
  return prisma.subscription.delete({
    where: {
      subscriptionId: id
    }
  });
}
