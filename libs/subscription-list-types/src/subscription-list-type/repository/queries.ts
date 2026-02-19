import { prisma } from "@hmcts/postgres";

type TransactionClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function findListTypeSubscriptionsByUserId(userId: string, tx?: TransactionClient) {
  const client = tx || prisma;
  return client.subscriptionListType.findMany({
    where: { userId },
    orderBy: { dateAdded: "desc" }
  });
}

export async function findListTypeSubscriptionById(listTypeSubscriptionId: string, userId: string, tx?: TransactionClient) {
  const client = tx || prisma;
  return client.subscriptionListType.findFirst({
    where: {
      listTypeSubscriptionId,
      userId
    }
  });
}

export async function createListTypeSubscriptionRecord(userId: string, listTypeId: number, language: string[], tx?: TransactionClient) {
  const client = tx || prisma;
  return client.subscriptionListType.create({
    data: {
      userId,
      listTypeId,
      language
    }
  });
}

export async function deleteListTypeSubscriptionRecord(listTypeSubscriptionId: string, userId: string, tx?: TransactionClient) {
  const client = tx || prisma;
  const result = await client.subscriptionListType.deleteMany({
    where: {
      listTypeSubscriptionId,
      userId
    }
  });
  return result.count;
}

export async function countListTypeSubscriptionsByUserId(userId: string, tx?: TransactionClient) {
  const client = tx || prisma;
  return client.subscriptionListType.count({
    where: { userId }
  });
}

export async function findExistingListTypeSubscription(userId: string, listTypeId: number, tx?: TransactionClient) {
  const client = tx || prisma;
  return client.subscriptionListType.findFirst({
    where: {
      userId,
      listTypeId
    }
  });
}

export async function updateListTypeSubscriptionLanguage(userId: string, listTypeId: number, language: string[], tx?: TransactionClient) {
  const client = tx || prisma;
  return client.subscriptionListType.updateMany({
    where: {
      userId,
      listTypeId
    },
    data: {
      language
    }
  });
}

export async function findActiveSubscriptionsByListType(listTypeId: number, language: string, tx?: TransactionClient) {
  const client = tx || prisma;
  return client.subscriptionListType.findMany({
    where: {
      listTypeId,
      language: {
        has: language
      }
    },
    include: {
      user: {
        select: {
          userId: true,
          email: true,
          firstName: true,
          surname: true
        }
      }
    }
  });
}
