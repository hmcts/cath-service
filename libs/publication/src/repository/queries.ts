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

export async function getArtefactById(artefactId: string): Promise<Artefact | null> {
  const artefact = await prisma.artefact.findUnique({
    where: {
      artefactId
    }
  });

  if (!artefact) {
    return null;
  }

  return {
    artefactId: artefact.artefactId,
    locationId: artefact.locationId,
    listTypeId: artefact.listTypeId,
    contentDate: artefact.contentDate,
    sensitivity: artefact.sensitivity,
    language: artefact.language,
    displayFrom: artefact.displayFrom,
    displayTo: artefact.displayTo
  };
}

export async function getArtefactsByLocationId(locationId: string): Promise<Artefact[]> {
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
