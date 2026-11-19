import { prisma } from "@hmcts/postgres-prisma";

export async function findExpiredArtefacts(now: Date, afterArtefactId: string | undefined, take: number): Promise<ExpiredArtefact[]> {
  return prisma.artefact.findMany({
    where: {
      displayTo: { lt: now },
      ...(afterArtefactId ? { artefactId: { gt: afterArtefactId } } : {})
    },
    orderBy: { artefactId: "asc" },
    take,
    select: {
      artefactId: true,
      type: true,
      locationId: true,
      contentDate: true,
      sensitivity: true,
      language: true,
      displayFrom: true,
      displayTo: true,
      isFlatFile: true,
      provenance: true,
      sourceArtefactId: true,
      supersededCount: true,
      lastReceivedDate: true,
      listType: { select: { name: true } }
    }
  });
}

export async function archiveAndDeleteArtefact(artefact: ExpiredArtefact): Promise<void> {
  await prisma.$transaction([
    prisma.artefactArchive.create({ data: toArchiveRow(artefact) }),
    prisma.artefact.delete({ where: { artefactId: artefact.artefactId } })
  ]);
}

export async function deleteArtefactArchiveOnOrBefore(cutoff: Date): Promise<number> {
  const { count } = await prisma.artefactArchive.deleteMany({ where: { archivedDate: { lte: cutoff } } });
  return count;
}

function toArchiveRow(artefact: ExpiredArtefact) {
  return {
    artefactId: artefact.artefactId,
    type: artefact.type,
    locationId: artefact.locationId,
    listTypeName: artefact.listType.name,
    contentDate: artefact.contentDate,
    sensitivity: artefact.sensitivity,
    language: artefact.language,
    displayFrom: artefact.displayFrom,
    displayTo: artefact.displayTo,
    isFlatFile: artefact.isFlatFile,
    provenance: artefact.provenance,
    sourceArtefactId: artefact.sourceArtefactId,
    supersededCount: artefact.supersededCount,
    lastReceivedDate: artefact.lastReceivedDate
  };
}

export interface ExpiredArtefact {
  artefactId: string;
  type: string;
  locationId: string;
  contentDate: Date;
  sensitivity: string;
  language: string;
  displayFrom: Date | null;
  displayTo: Date | null;
  isFlatFile: boolean;
  provenance: string;
  sourceArtefactId: string | null;
  supersededCount: number;
  lastReceivedDate: Date;
  listType: { name: string };
}
