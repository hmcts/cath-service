import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  try {
    const { first, id } = req.query;

    if (id) {
      const jurisdiction = await (prisma as any).jurisdiction.findUnique({
        where: { jurisdictionId: Number(id) }
      });
      if (!jurisdiction) {
        return res.status(404).json({ error: "Jurisdiction not found" });
      }
      return res.json(jurisdiction);
    }

    if (first === "true") {
      const jurisdiction = await (prisma as any).jurisdiction.findFirst();
      if (!jurisdiction) {
        return res.status(404).json({ error: "No jurisdiction found" });
      }
      return res.json(jurisdiction);
    }

    const jurisdictions = await (prisma as any).jurisdiction.findMany();
    return res.json(jurisdictions);
  } catch (error) {
    console.error("Error fetching jurisdictions:", error);
    return res.status(500).json({ error: "Failed to fetch jurisdictions" });
  }
};

export const POST = async (req: Request, res: Response) => {
  try {
    const { jurisdictions } = req.body;

    if (!Array.isArray(jurisdictions) || jurisdictions.length === 0) {
      return res.status(400).json({ error: "jurisdictions array is required" });
    }

    const results = [];
    for (const jurisdiction of jurisdictions) {
      if (!jurisdiction.jurisdictionId || !jurisdiction.name) {
        return res.status(400).json({ error: "Each jurisdiction must have jurisdictionId and name" });
      }

      const result = await (prisma as any).jurisdiction.upsert({
        where: { jurisdictionId: jurisdiction.jurisdictionId },
        create: {
          jurisdictionId: jurisdiction.jurisdictionId,
          name: jurisdiction.name,
          welshName: jurisdiction.welshName || jurisdiction.name
        },
        update: {
          name: jurisdiction.name,
          welshName: jurisdiction.welshName || jurisdiction.name
        }
      });
      results.push(result);
    }

    return res.status(201).json({ seeded: results.length, jurisdictions: results });
  } catch (error) {
    console.error("Error seeding jurisdictions:", error);
    return res.status(500).json({ error: "Failed to seed jurisdictions" });
  }
};
