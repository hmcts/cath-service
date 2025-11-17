import { prisma } from "@hmcts/postgres";
import type { Artefact } from "./model.js";

export async function createArtefact(data: Artefact): Promise<void> {
  await prisma.artefact.create({
    data: {
      artefactId: data.artefactId,
      locationId: data.locationId,
      listTypeId: data.listTypeId,
      contentDate: data.contentDate,
      sensitivity: data.sensitivity,
      language: data.language,
      displayFrom: data.displayFrom,
      displayTo: data.displayTo
    }
  });
}

export async function getArtefactsByLocation(locationId: string): Promise<Artefact[]> {
  const artefacts = await prisma.artefact.findMany({
    where: {
      locationId
    },
    orderBy: {
      contentDate: "desc"
    }
  });

  return artefacts.map((artefact) => ({
    artefactId: artefact.artefactId,
    locationId: artefact.locationId,
    listTypeId: artefact.listTypeId,
    contentDate: artefact.contentDate,
    sensitivity: artefact.sensitivity,
    language: artefact.language,
    displayFrom: artefact.displayFrom,
    displayTo: artefact.displayTo
  }));
}

export async function getArtefactsByIds(artefactIds: string[]): Promise<Artefact[]> {
  const artefacts = await prisma.artefact.findMany({
    where: {
      artefactId: {
        in: artefactIds
      }
    }
  });

  return artefacts.map((artefact) => ({
    artefactId: artefact.artefactId,
    locationId: artefact.locationId,
    listTypeId: artefact.listTypeId,
    contentDate: artefact.contentDate,
    sensitivity: artefact.sensitivity,
    language: artefact.language,
    displayFrom: artefact.displayFrom,
    displayTo: artefact.displayTo
  }));
}

export async function deleteArtefacts(artefactIds: string[]): Promise<void> {
  await prisma.artefact.deleteMany({
    where: {
      artefactId: {
        in: artefactIds
      }
    }
  });
}
