import { prisma } from "@hmcts/postgres-prisma";

export async function createArtefactSearch(artefactId: string, caseNumber: string | null, caseName: string | null) {
  return await prisma.artefactSearch.create({
    data: {
      artefactId,
      caseNumber,
      caseName
    }
  });
}

export async function findArtefactSearchByArtefactId(artefactId: string) {
  return await prisma.artefactSearch.findFirst({
    where: { artefactId }
  });
}

export async function deleteArtefactSearchByArtefactId(artefactId: string) {
  return await prisma.artefactSearch.deleteMany({
    where: { artefactId }
  });
}
