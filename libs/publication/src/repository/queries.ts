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
        isFlatFile: data.isFlatFile ?? true,
        provenance: data.provenance ?? "MANUAL_UPLOAD",
        lastReceivedDate: new Date()
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
      isFlatFile: data.isFlatFile ?? true,
      provenance: data.provenance ?? "MANUAL_UPLOAD"
    }
  });
  return artefact.artefactId;
}
