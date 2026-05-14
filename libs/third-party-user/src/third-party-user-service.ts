import { mockListTypes } from "@hmcts/list-types-common";
import { prisma } from "@hmcts/postgres-prisma";

export async function findAllThirdPartyUsers() {
  return prisma.thirdPartyUser.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { subscriptions: true } }
    }
  });
}

export async function findThirdPartyUserById(id: string) {
  return prisma.thirdPartyUser.findUnique({
    where: { id },
    include: { subscriptions: true }
  });
}

export async function createThirdPartyUser(name: string) {
  const existing = await prisma.thirdPartyUser.findFirst({ where: { name } });
  if (existing) {
    return existing;
  }
  return prisma.thirdPartyUser.create({ data: { name } });
}

export async function updateThirdPartySubscriptions(userId: string, subscriptions: Record<string, string>) {
  await prisma.$transaction(async (tx) => {
    await tx.thirdPartySubscription.deleteMany({ where: { thirdPartyUserId: userId } });

    const entries = Object.entries(subscriptions).filter(([, sensitivity]) => sensitivity !== "UNSELECTED" && sensitivity !== "");
    if (entries.length > 0) {
      await tx.thirdPartySubscription.createMany({
        data: entries.map(([listTypeName, sensitivity]) => ({
          thirdPartyUserId: userId,
          listTypeId: mockListTypes.find((lt) => lt.name === listTypeName)!.id,
          sensitivity
        }))
      });
    }
  });
}

export async function deleteThirdPartyUser(id: string) {
  await prisma.thirdPartyUser.delete({ where: { id } });
}
