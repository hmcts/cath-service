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

export async function findArtefactSearchByArtefactId(artefactId: string) {
  return await prisma.artefactSearch.findFirst({
    where: { artefactId }
  });
}

export async function findAllArtefactSearchByArtefactId(artefactId: string) {
  return await prisma.artefactSearch.findMany({
    where: { artefactId }
  });
}

export async function deleteArtefactSearchByArtefactId(artefactId: string) {
  return await prisma.artefactSearch.deleteMany({
    where: { artefactId }
  });
}

export async function findByCaseName(caseName: string) {
  return await prisma.artefactSearch.findMany({
    where: {
      caseName: {
        contains: caseName,
        mode: "insensitive"
      }
    },
    take: 50,
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function findByCaseNumber(caseNumber: string) {
  return await prisma.artefactSearch.findMany({
    where: {
      caseNumber: {
        equals: caseNumber
      }
    },
    take: 50,
    orderBy: {
      createdAt: "desc"
    }
  });
}
