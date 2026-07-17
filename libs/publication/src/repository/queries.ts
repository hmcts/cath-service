import path from "node:path";
import { CONTAINER, deleteBlob } from "@hmcts/azure-blob";
import { getLocationById } from "@hmcts/location";
import { prisma } from "@hmcts/postgres-prisma";
import { PROVENANCE_LABELS } from "../provenance.js";
import type { Artefact, ArtefactWithListType } from "./model.js";

const SJP_LIST_TYPE_NAMES = ["SJP_PRESS_LIST", "SJP_PUBLIC_LIST", "SJP_DELTA_PRESS_LIST", "SJP_DELTA_PUBLIC_LIST"];

export interface ArtefactSummary {
  artefactId: string;
  listType: string;
  displayFrom: string;
  displayTo: string;
  isFlatFile: boolean;
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

export async function createArtefact(data: Artefact): Promise<{ artefactId: string; isUpdate: boolean }> {
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
    return { artefactId: existing.artefactId, isUpdate: true };
  }

  // Create new artefact
  const artefact = await prisma.artefact.create({
    data: {
      artefactId: data.artefactId,
      type: data.type,
      locationId: data.locationId,
      listTypeId: data.listTypeId,
      contentDate: data.contentDate,
      sensitivity: data.sensitivity,
      language: data.language,
      displayFrom: data.displayFrom,
      displayTo: data.displayTo,
      lastReceivedDate: data.lastReceivedDate ?? new Date(),
      isFlatFile: data.isFlatFile,
      provenance: data.provenance,
      noMatch: data.noMatch ?? false
    }
  });
  return { artefactId: artefact.artefactId, isUpdate: false };
}

export async function getArtefactById(artefactId: string): Promise<ArtefactWithListType | null> {
  const artefact = await prisma.artefact.findUnique({
    where: { artefactId },
    select: {
      artefactId: true,
      type: true,
      locationId: true,
      listTypeId: true,
      listType: { select: { name: true } },
      contentDate: true,
      sensitivity: true,
      language: true,
      displayFrom: true,
      displayTo: true,
      lastReceivedDate: true,
      isFlatFile: true,
      provenance: true,
      supersededCount: true,
      noMatch: true,
      excelPath: true
    }
  });
  if (!artefact) return null;
  const { listType, ...rest } = artefact;
  return { ...rest, listTypeName: listType?.name };
}

export async function updateArtefactExcelPath(artefactId: string, excelPath: string): Promise<void> {
  await prisma.artefact.update({
    where: { artefactId },
    data: { excelPath }
  });
}

export async function getArtefactsByLocation(locationId: string): Promise<Artefact[]> {
  return prisma.artefact.findMany({
    where: {
      locationId
    },
    orderBy: {
      contentDate: "desc"
    },
    select: {
      artefactId: true,
      type: true,
      locationId: true,
      listTypeId: true,
      contentDate: true,
      sensitivity: true,
      language: true,
      displayFrom: true,
      displayTo: true,
      lastReceivedDate: true,
      isFlatFile: true,
      provenance: true,
      noMatch: true
    }
  });
}

export async function getArtefactsByIds(artefactIds: string[]): Promise<Artefact[]> {
  return prisma.artefact.findMany({
    where: {
      artefactId: {
        in: artefactIds
      }
    },
    select: {
      artefactId: true,
      type: true,
      locationId: true,
      listTypeId: true,
      contentDate: true,
      sensitivity: true,
      language: true,
      displayFrom: true,
      displayTo: true,
      lastReceivedDate: true,
      isFlatFile: true,
      provenance: true,
      noMatch: true
    }
  });
}

export async function deleteArtefacts(artefactIds: string[]): Promise<void> {
  const artefacts = await prisma.artefact.findMany({
    where: { artefactId: { in: artefactIds } },
    select: { artefactId: true, sourceArtefactId: true }
  });

  for (const artefact of artefacts) {
    // New blobs are stored without an extension (just the artefactId).
    deleteBlob(artefact.artefactId, CONTAINER.ARTEFACT).catch((error) => {
      console.error(`Failed to delete blob for artefact ${artefact.artefactId}:`, error);
    });
    // Backward-compat: older blobs were stored with the extension appended — best-effort cleanup.
    const extension = artefact.sourceArtefactId ? path.extname(artefact.sourceArtefactId) || ".pdf" : ".pdf";
    deleteBlob(`${artefact.artefactId}${extension}`, CONTAINER.ARTEFACT).catch(() => {
      // Silently ignore — legacy blob may not exist for new artefacts.
    });
    deleteBlob(`${artefact.artefactId}.pdf`, CONTAINER.PUBLICATIONS).catch((error) => {
      // 404 is expected if no PDF was generated for this artefact
      if (!("statusCode" in error) || (error as { statusCode: number }).statusCode !== 404) {
        console.error(`Failed to delete PDF blob for artefact ${artefact.artefactId}:`, error);
      }
    });
    deleteBlob(`${artefact.artefactId}.xlsx`, CONTAINER.PUBLICATIONS).catch((error) => {
      // 404 is expected if no Excel file was generated for this artefact
      if (!("statusCode" in error) || (error as { statusCode: number }).statusCode !== 404) {
        console.error(`Failed to delete Excel blob for artefact ${artefact.artefactId}:`, error);
      }
    });
  }

  await prisma.artefact.deleteMany({
    where: {
      artefactId: {
        in: artefactIds
      }
    }
  });
}

export async function updateSourceArtefactId(artefactId: string, sourceArtefactId: string | null): Promise<void> {
  await prisma.artefact.update({
    where: { artefactId },
    data: { sourceArtefactId }
  });
}

export async function getArtefactSummariesByLocation(locationId: string): Promise<ArtefactSummary[]> {
  const artefacts = await prisma.artefact.findMany({
    where: {
      locationId
    },
    orderBy: {
      displayFrom: "desc"
    },
    select: {
      artefactId: true,
      displayFrom: true,
      displayTo: true,
      isFlatFile: true,
      listType: {
        select: {
          friendlyName: true
        }
      }
    }
  });

  return artefacts.map((artefact) => ({
    artefactId: artefact.artefactId,
    listType: artefact.listType?.friendlyName || "Unknown",
    displayFrom: artefact.displayFrom.toISOString(),
    displayTo: artefact.displayTo.toISOString(),
    isFlatFile: artefact.isFlatFile
  }));
}

export async function getArtefactMetadata(artefactId: string): Promise<ArtefactMetadata | null> {
  const artefact = await prisma.artefact.findUnique({
    where: {
      artefactId
    },
    select: {
      artefactId: true,
      locationId: true,
      listTypeId: true,
      contentDate: true,
      sensitivity: true,
      language: true,
      displayFrom: true,
      displayTo: true,
      isFlatFile: true,
      provenance: true,
      listType: {
        select: {
          friendlyName: true
        }
      }
    }
  });

  if (!artefact) {
    return null;
  }

  const location = await getLocationById(Number.parseInt(artefact.locationId, 10));

  return {
    artefactId: artefact.artefactId,
    locationId: artefact.locationId,
    locationName: location?.name || "Unknown",
    publicationType: artefact.isFlatFile ? "Flat File" : "JSON",
    listType: artefact.listType?.friendlyName || "Unknown",
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

  return result.map((row: { location_id: number; location_name: string; publication_count: bigint }) => ({
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

export async function getLatestSjpArtefacts(): Promise<Artefact[]> {
  const artefacts = await prisma.artefact.findMany({
    where: {
      listType: { name: { in: SJP_LIST_TYPE_NAMES } }
    },
    orderBy: { lastReceivedDate: "desc" },
    take: 10
  });

  return artefacts.map(
    (artefact: (typeof artefacts)[number]): Artefact => ({
      artefactId: artefact.artefactId,
      type: artefact.type,
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
