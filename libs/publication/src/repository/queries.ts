import { prisma } from "@hmcts/postgres";
import type { Artefact } from "./model.js";

export async function createArtefact(data: Artefact): Promise<string> {
  // Check if artefact already exists with same location, list type, content date, and language
  const existing = await prisma.artefact.findFirst({
    where: {
      locationId: data.locationId,
      listTypeId: data.listTypeId,
      contentDate: data.contentDate,
      language: data.language
    }
  });

  if (existing) {
    // Update existing artefact
    await prisma.artefact.update({
      where: { artefactId: existing.artefactId },
      data: {
        sensitivity: data.sensitivity,
        displayFrom: data.displayFrom,
        displayTo: data.displayTo,
        isFlatFile: data.isFlatFile,
        provenance: data.provenance,
        lastReceivedDate: new Date(),
        supersededCount: {
          increment: 1
        }
      }
    });
    return existing.artefactId;
  }

  // Create new artefact
  const artefact = await prisma.artefact.create({
    data: {
      artefactId: data.artefactId,
      locationId: data.locationId,
      listTypeId: data.listTypeId,
      contentDate: data.contentDate,
      sensitivity: data.sensitivity,
      language: data.language,
      displayFrom: data.displayFrom,
      displayTo: data.displayTo,
      isFlatFile: data.isFlatFile,
      provenance: data.provenance
    }
  });
  return artefact.artefactId;
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
    displayTo: artefact.displayTo,
    isFlatFile: artefact.isFlatFile,
    provenance: artefact.provenance
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
    displayTo: artefact.displayTo,
    isFlatFile: artefact.isFlatFile,
    provenance: artefact.provenance
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
    displayTo: artefact.displayTo,
    isFlatFile: artefact.isFlatFile,
    provenance: artefact.provenance
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
    displayTo: artefact.displayTo,
    isFlatFile: artefact.isFlatFile,
    provenance: artefact.provenance
  }));
}
