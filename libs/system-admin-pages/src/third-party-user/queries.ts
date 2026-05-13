import { prisma } from "@hmcts/postgres-prisma";

export async function findAllThirdPartyUsers() {
  return prisma.legacyThirdPartyUser.findMany({
    orderBy: {
      createdDate: "desc"
    },
    select: {
      id: true,
      name: true,
      createdDate: true,
      subscriptions: {
        select: {
          id: true,
          userId: true,
          listTypeId: true,
          channel: true,
          sensitivity: true,
          createdDate: true
        }
      }
    }
  });
}

export async function findThirdPartyUserById(id: string) {
  return prisma.legacyThirdPartyUser.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdDate: true,
      subscriptions: {
        select: {
          id: true,
          userId: true,
          listTypeId: true,
          channel: true,
          sensitivity: true,
          createdDate: true
        }
      }
    }
  });
}

export async function createThirdPartyUser(name: string) {
  return prisma.legacyThirdPartyUser.create({
    data: {
      name: name.trim()
    }
  });
}

export async function deleteThirdPartyUser(id: string) {
  return prisma.legacyThirdPartyUser.delete({
    where: { id }
  });
}

export async function updateThirdPartySubscriptions(userId: string, subscriptions: Array<{ listTypeId: number; channel: string; sensitivity: string }>) {
  return prisma.$transaction(async (tx) => {
    await tx.legacyThirdPartySubscription.deleteMany({
      where: { userId }
    });

    if (subscriptions.length > 0) {
      await tx.legacyThirdPartySubscription.createMany({
        data: subscriptions.map((sub) => ({
          userId,
          listTypeId: sub.listTypeId,
          channel: sub.channel,
          sensitivity: sub.sensitivity
        }))
      });
    }
  });
}

export function getHighestSensitivity(subscriptions: Array<{ sensitivity: string }>): string {
  if (subscriptions.length === 0) {
    return "unselected";
  }

  const priorities = { CLASSIFIED: 3, PRIVATE: 2, PUBLIC: 1 };
  const highest = subscriptions.reduce((max, sub) => {
    const priority = priorities[sub.sensitivity as keyof typeof priorities] || 0;
    const maxPriority = priorities[max as keyof typeof priorities] || 0;
    return priority > maxPriority ? sub.sensitivity : max;
  }, subscriptions[0].sensitivity);

  return highest;
}
