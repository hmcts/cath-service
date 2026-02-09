import { prisma } from "@hmcts/postgres";

export async function findListTypeSubscriptionsByUserId(userId: string) {
  return prisma.subscriptionListType.findMany({
    where: { userId },
    orderBy: { dateAdded: "desc" }
  });
}

export async function findListTypeSubscriptionById(listTypeSubscriptionId: string, userId: string) {
  return prisma.subscriptionListType.findFirst({
    where: {
      listTypeSubscriptionId,
      userId
    }
  });
}

export async function createListTypeSubscriptionRecord(userId: string, listTypeId: number, language: string) {
  return prisma.subscriptionListType.create({
    data: {
      userId,
      listTypeId,
      language
    }
  });
}

export async function deleteListTypeSubscriptionRecord(listTypeSubscriptionId: string, userId: string) {
  const result = await prisma.subscriptionListType.deleteMany({
    where: {
      listTypeSubscriptionId,
      userId
    }
  });
  return result.count;
}

export async function countListTypeSubscriptionsByUserId(userId: string) {
  return prisma.subscriptionListType.count({
    where: { userId }
  });
}

export async function findDuplicateListTypeSubscription(userId: string, listTypeId: number, language: string) {
  return prisma.subscriptionListType.findFirst({
    where: {
      userId,
      listTypeId,
      language
    }
  });
}
