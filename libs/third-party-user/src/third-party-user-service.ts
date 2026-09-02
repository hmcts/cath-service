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

export async function findThirdPartyUserByName(name: string) {
  return prisma.thirdPartyUser.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    select: { id: true, name: true }
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
  const entries = Object.entries(subscriptions).filter(([, sensitivity]) => sensitivity !== "UNSELECTED" && sensitivity !== "");

  await prisma.$transaction(async (tx) => {
    await tx.thirdPartySubscription.deleteMany({ where: { thirdPartyUserId: userId } });

    if (entries.length > 0) {
      const listTypeNames = entries.map(([name]) => name);
      const listTypes = await tx.listType.findMany({
        where: { name: { in: listTypeNames } },
        select: { id: true, name: true }
      });
      const listTypeIdByName = new Map(listTypes.map((lt) => [lt.name, lt.id]));

      await tx.thirdPartySubscription.createMany({
        data: entries
          .filter(([listTypeName]) => listTypeIdByName.has(listTypeName))
          .map(([listTypeName, sensitivity]) => ({
            thirdPartyUserId: userId,
            listTypeId: listTypeIdByName.get(listTypeName)!,
            sensitivity
          }))
      });
    }
  });
}

export async function deleteThirdPartyUser(id: string) {
  await prisma.thirdPartyUser.delete({ where: { id } });
}
