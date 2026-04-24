import { prisma } from "@hmcts/postgres";

export interface CaseSearchResult {
  caseNumber: string | null;
  caseName: string | null;
}

export async function searchByCaseName(term: string): Promise<CaseSearchResult[]> {
  const configs = await prisma.listSearchConfig.findMany({
    where: { caseNameFieldName: { not: "" } },
    select: { listTypeId: true }
  });

  if (configs.length === 0) {
    return [];
  }

  const listTypeIds = configs.map((c) => c.listTypeId);
  const now = new Date();

  const results = await prisma.artefactSearch.findMany({
    where: {
      caseName: { contains: term, mode: "insensitive" },
      artefact: {
        listTypeId: { in: listTypeIds },
        displayFrom: { lte: now },
        displayTo: { gte: now }
      }
    },
    select: { caseNumber: true, caseName: true },
    distinct: ["caseNumber", "caseName"],
    take: 50
  });

  return results;
}

export async function searchByCaseNumber(reference: string): Promise<CaseSearchResult[]> {
  const results = await prisma.artefactSearch.findMany({
    where: {
      caseNumber: reference
    },
    select: {
      caseNumber: true,
      caseName: true
    },
    distinct: ["caseNumber", "caseName"]
  });
  return results;
}

export async function createCaseSubscriptionRecord(userId: string, searchType: string, searchValue: string, caseName: string, caseNumber: string | null) {
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

export async function findCaseSubscriptionsByUserId(userId: string) {
  return prisma.subscription.findMany({
    where: {
      userId,
      searchType: { in: ["CASE_NAME", "CASE_NUMBER"] }
    },
    orderBy: { dateAdded: "desc" }
  });
}

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
