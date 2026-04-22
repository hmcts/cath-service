import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  try {
    const { first } = req.query;

    if (first === "true") {
      const subJurisdiction = await prisma.subJurisdiction.findFirst();
      if (!subJurisdiction) {
        return res.status(404).json({ error: "No sub-jurisdiction found" });
      }
      return res.json(subJurisdiction);
    }

    const subJurisdictions = await prisma.subJurisdiction.findMany();
    return res.json(subJurisdictions);
  } catch (error) {
    console.error("Error fetching sub-jurisdictions:", error);
    return res.status(500).json({ error: "Failed to fetch sub-jurisdictions" });
  }
};

export const POST = async (req: Request, res: Response) => {
  try {
    const { subJurisdictions } = req.body;

    if (!Array.isArray(subJurisdictions) || subJurisdictions.length === 0) {
      return res.status(400).json({ error: "subJurisdictions array is required" });
    }

    const results = [];
    for (const subJurisdiction of subJurisdictions) {
      if (!subJurisdiction.subJurisdictionId || !subJurisdiction.name || !subJurisdiction.jurisdictionId) {
        return res.status(400).json({ error: "Each subJurisdiction must have subJurisdictionId, name, and jurisdictionId" });
      }

      const result = await (prisma as any).subJurisdiction.upsert({
        where: { subJurisdictionId: subJurisdiction.subJurisdictionId },
        create: {
          subJurisdictionId: subJurisdiction.subJurisdictionId,
          name: subJurisdiction.name,
          welshName: subJurisdiction.welshName || subJurisdiction.name,
          jurisdictionId: subJurisdiction.jurisdictionId
        },
        update: {
          name: subJurisdiction.name,
          welshName: subJurisdiction.welshName || subJurisdiction.name,
          jurisdictionId: subJurisdiction.jurisdictionId
        }
      });
      results.push(result);
    }

    return res.status(201).json({ seeded: results.length, subJurisdictions: results });
  } catch (error) {
    console.error("Error seeding sub-jurisdictions:", error);
    return res.status(500).json({ error: "Failed to seed sub-jurisdictions" });
  }
};
