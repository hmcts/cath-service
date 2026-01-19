import { prisma } from "@hmcts/postgres";

export async function createArtefactSearch(artefactId: string, caseNumber: string | null, caseName: string | null) {
  return await prisma.artefactSearch.create({
    data: {
      artefactId,
      caseNumber,
      caseName
    }
  });
}

export async function findByArtefactId(artefactId: string) {
  return await prisma.artefactSearch.findFirst({
    where: { artefactId }
  });
}
