import { prisma } from "@hmcts/postgres-prisma";

export async function getListTypeIdsForLocation(locationId: number): Promise<number[]> {
  const records = await prisma.listTypeSubJurisdiction.findMany({
    where: {
      subJurisdiction: {
        locationSubJurisdictions: {
          some: { locationId }
        }
      }
    },
    select: { listTypeId: true }
  });
  return [...new Set(records.map((r) => r.listTypeId))];
}

export async function findSubscriptionListTypeByUserId(userId: string) {
  return prisma.subscriptionListType.findUnique({
    where: { userId }
  });
}

export async function upsertSubscriptionListType(userId: string, listTypeIds: number[], listLanguage: string[]) {
  return prisma.subscriptionListType.upsert({
    where: { userId },
    create: { userId, listTypeIds, listLanguage },
    update: { listTypeIds, listLanguage }
  });
}

export async function deleteAllSubscriptionListTypesByUserId(userId: string) {
  const result = await prisma.subscriptionListType.deleteMany({
    where: { userId }
  });
  return result.count;
}
