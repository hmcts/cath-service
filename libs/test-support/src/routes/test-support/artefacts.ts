import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";
import type { CreateArtefactInput } from "../../types.js";

interface CreateArtefactWithSearchInput extends CreateArtefactInput {
  caseNumber?: string;
  caseName?: string;
}

export const GET = async (req: Request, res: Response) => {
  try {
    const { locationId, provenance } = req.query;

    const where: Record<string, unknown> = {};
    if (locationId) where.locationId = locationId as string;
    if (provenance) where.provenance = provenance as string;

    const artefacts = await prisma.artefact.findMany({ where });

    return res.json(artefacts);
  } catch (error) {
    console.error("Error fetching artefacts:", error);
    return res.status(500).json({ error: "Failed to fetch artefacts" });
  }
};

export const POST = async (req: Request, res: Response) => {
  try {
    const input = req.body as CreateArtefactWithSearchInput;

    if (!input.locationId || !input.listTypeId || !input.contentDate) {
      return res.status(400).json({
        error: "locationId, listTypeId, and contentDate are required"
      });
    }

    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const artefact = await prisma.artefact.create({
      data: {
        locationId: input.locationId,
        listTypeId: input.listTypeId,
        contentDate: new Date(input.contentDate),
        sensitivity: input.sensitivity || "PUBLIC",
        language: input.language || "ENGLISH",
        displayFrom: input.displayFrom ? new Date(input.displayFrom) : now,
        displayTo: input.displayTo ? new Date(input.displayTo) : oneDayFromNow,
        isFlatFile: input.isFlatFile ?? false,
        provenance: input.provenance || "MANUAL_UPLOAD"
      }
    });

    if (input.caseNumber || input.caseName) {
      await prisma.listSearchConfig.upsert({
        where: { listTypeId: input.listTypeId },
        create: {
          listTypeId: input.listTypeId,
          caseNumberFieldName: "case_number",
          caseNameFieldName: "case_name"
        },
        update: {}
      });

      await prisma.artefactSearch.create({
        data: {
          artefactId: artefact.artefactId,
          caseNumber: input.caseNumber ?? "",
          caseName: input.caseName ?? ""
        }
      });
    }

    return res.status(201).json({
      artefactId: artefact.artefactId,
      locationId: artefact.locationId,
      listTypeId: artefact.listTypeId
    });
  } catch (error) {
    console.error("Error creating test artefact:", error);
    return res.status(500).json({ error: "Failed to create test artefact" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { locationId, provenance, artefactIds } = req.body;

    const where: Record<string, unknown> = {};
    if (locationId) where.locationId = locationId;
    if (provenance) where.provenance = provenance;
    if (artefactIds && Array.isArray(artefactIds)) {
      where.artefactId = { in: artefactIds };
    }

    const result = await prisma.artefact.deleteMany({ where });

    return res.json({ deleted: result.count });
  } catch (error) {
    console.error("Error deleting artefacts:", error);
    return res.status(500).json({ error: "Failed to delete artefacts" });
  }
};
