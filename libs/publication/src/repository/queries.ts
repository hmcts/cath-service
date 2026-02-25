import { mockListTypes } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { prisma } from "@hmcts/postgres";
import { PROVENANCE_LABELS } from "../provenance.js";
import type { Artefact } from "./model.js";

export interface ArtefactSummary {
  artefactId: string;
  listType: string;
  displayFrom: string;
  displayTo: string;
}

export interface ArtefactMetadata {
  artefactId: string;
  locationId: string;
  locationName: string;
  publicationType: string;
  listType: string;
  provenance: string;
  language: string;
  sensitivity: string;
  contentDate: string;
  displayFrom: string;
  displayTo: string;
}

export interface LocationWithPublicationCount {
  locationId: string;
  locationName: string;
  publicationCount: number;
}

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
        noMatch: data.noMatch,
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
      provenance: data.provenance,
      noMatch: data.noMatch
    }
  });
  return artefact.artefactId;
}

export async function getArtefactById(artefactId: string): Promise<Artefact | null> {
  const artefact = await prisma.artefact.findUnique({
    where: { artefactId }
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
    lastReceivedDate: artefact.lastReceivedDate,
    isFlatFile: artefact.isFlatFile,
    provenance: artefact.provenance,
    noMatch: artefact.noMatch
  };
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

  return artefacts.map(
    (artefact: (typeof artefacts)[number]): Artefact => ({
      artefactId: artefact.artefactId,
      locationId: artefact.locationId,
      listTypeId: artefact.listTypeId,
      contentDate: artefact.contentDate,
      sensitivity: artefact.sensitivity,
      language: artefact.language,
      displayFrom: artefact.displayFrom,
      displayTo: artefact.displayTo,
      lastReceivedDate: artefact.lastReceivedDate,
      isFlatFile: artefact.isFlatFile,
      provenance: artefact.provenance,
      noMatch: artefact.noMatch
    })
  );
}

export async function getArtefactsByIds(artefactIds: string[]): Promise<Artefact[]> {
  const artefacts = await prisma.artefact.findMany({
    where: {
      artefactId: {
        in: artefactIds
      }
    }
  });

  return artefacts.map(
    (artefact: (typeof artefacts)[number]): Artefact => ({
      artefactId: artefact.artefactId,
      locationId: artefact.locationId,
      listTypeId: artefact.listTypeId,
      contentDate: artefact.contentDate,
      sensitivity: artefact.sensitivity,
      language: artefact.language,
      displayFrom: artefact.displayFrom,
      displayTo: artefact.displayTo,
      lastReceivedDate: artefact.lastReceivedDate,
      isFlatFile: artefact.isFlatFile,
      provenance: artefact.provenance,
      noMatch: artefact.noMatch
    })
  );
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

export async function getArtefactSummariesByLocation(locationId: string): Promise<ArtefactSummary[]> {
  const artefacts = await prisma.artefact.findMany({
    where: {
      locationId
    },
    orderBy: {
      displayFrom: "desc"
    }
  });

  return artefacts.map((artefact) => {
    const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);

    return {
      artefactId: artefact.artefactId,
      listType: listType?.englishFriendlyName || "Unknown",
      displayFrom: artefact.displayFrom.toISOString(),
      displayTo: artefact.displayTo.toISOString()
    };
  });
}

export async function getArtefactMetadata(artefactId: string): Promise<ArtefactMetadata | null> {
  const artefact = await prisma.artefact.findUnique({
    where: {
      artefactId
    }
  });

  if (!artefact) {
    return null;
  }

  const listType = mockListTypes.find((lt) => lt.id === artefact.listTypeId);
  const location = await getLocationById(Number.parseInt(artefact.locationId, 10));

  return {
    artefactId: artefact.artefactId,
    locationId: artefact.locationId,
    locationName: location?.name || "Unknown",
    publicationType: artefact.isFlatFile ? "Flat File" : "JSON",
    listType: listType?.englishFriendlyName || "Unknown",
    provenance: PROVENANCE_LABELS[artefact.provenance] || artefact.provenance,
    language: artefact.language,
    sensitivity: artefact.sensitivity,
    contentDate: artefact.contentDate.toISOString(),
    displayFrom: artefact.displayFrom.toISOString(),
    displayTo: artefact.displayTo.toISOString()
  };
}

export async function getArtefactType(artefactId: string): Promise<"json" | "flat-file" | null> {
  const artefact = await prisma.artefact.findUnique({
    where: {
      artefactId
    },
    select: {
      isFlatFile: true
    }
  });

  if (!artefact) {
    return null;
  }

  return artefact.isFlatFile ? "flat-file" : "json";
}

export async function getLocationsWithPublicationCount(): Promise<LocationWithPublicationCount[]> {
  const result = await prisma.$queryRaw<Array<{ location_id: number; location_name: string; publication_count: bigint }>>`
    SELECT
      l.location_id,
      l.name as location_name,
      COUNT(a.artefact_id) as publication_count
    FROM location l
    LEFT JOIN artefact a ON CAST(l.location_id AS VARCHAR) = a.location_id
    GROUP BY l.location_id, l.name
    HAVING COUNT(a.artefact_id) > 0
    ORDER BY l.name ASC
  `;

  return result.map((row) => ({
    locationId: String(row.location_id),
    locationName: row.location_name,
    publicationCount: Number(row.publication_count)
  }));
}

export async function getArtefactListTypeId(artefactId: string): Promise<number | null> {
  const artefact = await prisma.artefact.findUnique({
    where: {
      artefactId
    },
    select: {
      listTypeId: true
    }
  });

  return artefact?.listTypeId ?? null;
}

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
