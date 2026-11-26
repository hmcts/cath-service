import { prisma } from "@hmcts/postgres-prisma";

export async function getListTypeIdsForLocation(locationId: number): Promise<number[]> {
  const records = await prisma.listTypeSubJurisdiction.findMany({
    where: {
      listType: { isHidden: false, deletedAt: null },
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

export async function findSubscribableListTypesBySubJurisdictionIds(subJurisdictionIds: number[]) {
  return prisma.listType.findMany({
    where: {
      deletedAt: null,
      isHidden: false,
      subJurisdictions: {
        some: { subJurisdictionId: { in: subJurisdictionIds } }
      }
    },
    orderBy: { friendlyName: "asc" },
    select: {
      id: true,
      name: true,
      friendlyName: true,
      welshFriendlyName: true
    }
  });
}

export async function findHiddenListTypeIds(listTypeIds: number[]): Promise<number[]> {
  if (listTypeIds.length === 0) return [];

  const records = await prisma.listType.findMany({
    where: { id: { in: listTypeIds }, isHidden: true },
    select: { id: true }
  });
  return records.map((r) => r.id);
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
