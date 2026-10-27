import { prisma } from "@hmcts/postgres-prisma";

export async function findArtefactForFulfilment(artefactId: string): Promise<FulfilmentArtefact | null> {
  return prisma.artefact.findUnique({
    where: { artefactId },
    select: {
      artefactId: true,
      locationId: true,
      contentDate: true,
      sensitivity: true,
      language: true,
      displayFrom: true,
      displayTo: true,
      isFlatFile: true,
      sourceArtefactId: true,
      listType: { select: { name: true } }
    }
  });
}

export async function findListTypeName(listTypeId: number): Promise<string | null> {
  const listType = await prisma.listType.findUnique({ where: { id: listTypeId }, select: { name: true } });
  return listType?.name ?? null;
}

export async function findMatchingSubscriptions(listTypeName: string, sensitivities: string[]): Promise<string[]> {
  if (sensitivities.length === 0) {
    return [];
  }

  const listType = await prisma.listType.findUnique({ where: { name: listTypeName }, select: { id: true } });
  if (!listType) {
    return [];
  }

  const subscriptions = await prisma.thirdPartySubscription.findMany({
    where: { listTypeId: listType.id, sensitivity: { in: sensitivities } },
    select: { thirdPartyUserId: true }
  });

  return subscriptions.map((subscription) => subscription.thirdPartyUserId);
}

export interface FulfilmentArtefact {
  artefactId: string;
  locationId: string;
  contentDate: Date;
  sensitivity: string;
  language: string;
  displayFrom: Date | null;
  displayTo: Date | null;
  isFlatFile: boolean;
  sourceArtefactId: string | null;
  listType: { name: string };
}
