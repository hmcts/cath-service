import { prisma } from "@hmcts/postgres-prisma";

const SENSITIVITY_ORDER = ["PUBLIC", "PRIVATE", "CLASSIFIED"] as const;
type SensitivityLevel = (typeof SENSITIVITY_ORDER)[number];

function eligibleSensitivities(publicationSensitivity: string): SensitivityLevel[] {
  const rank = SENSITIVITY_ORDER.indexOf(publicationSensitivity as SensitivityLevel);
  const minRank = rank === -1 ? 0 : rank;
  return SENSITIVITY_ORDER.filter((_, i) => i >= minRank);
}

export async function findSubscribersByListType(listTypeId: number, sensitivity: string) {
  return prisma.legacyThirdPartySubscription.findMany({
    where: { listTypeId, sensitivity: { in: eligibleSensitivities(sensitivity) } },
    include: { user: true }
  });
}
