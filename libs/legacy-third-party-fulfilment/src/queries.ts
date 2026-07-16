import { prisma } from "@hmcts/postgres-prisma";

export async function findSubscribersByListType(listTypeId: number) {
  return prisma.legacyThirdPartySubscription.findMany({
    where: { listTypeId },
    include: { user: true }
  });
}
