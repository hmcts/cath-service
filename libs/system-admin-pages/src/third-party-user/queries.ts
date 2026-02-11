import { prisma } from "@hmcts/postgres";

export async function findAllThirdPartyUsers() {
  return prisma.legacyThirdPartyUser.findMany({
    orderBy: {
      createdDate: "desc"
    },
    include: {
      subscriptions: true
    }
  });
}

export async function findThirdPartyUserById(id: string) {
  return prisma.legacyThirdPartyUser.findUnique({
    where: { id },
    include: {
      subscriptions: true
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
