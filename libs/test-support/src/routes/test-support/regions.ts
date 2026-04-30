import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  try {
    const { first } = req.query;

    if (first === "true") {
      const region = await prisma.region.findFirst();
      if (!region) {
        return res.status(404).json({ error: "No region found" });
      }
      return res.json(region);
    }

    const regions = await prisma.region.findMany();
    return res.json(regions);
  } catch (error) {
    console.error("Error fetching regions:", error);
    return res.status(500).json({ error: "Failed to fetch regions" });
  }
};

export const POST = async (req: Request, res: Response) => {
  try {
    const { regions } = req.body;

    if (!Array.isArray(regions) || regions.length === 0) {
      return res.status(400).json({ error: "regions array is required" });
    }

    const results = [];
    for (const region of regions) {
      if (!region.regionId || !region.name) {
        return res.status(400).json({ error: "Each region must have regionId and name" });
      }

      const result = await (prisma as any).region.upsert({
        where: { regionId: region.regionId },
        create: {
          regionId: region.regionId,
          name: region.name,
          welshName: region.welshName || region.name
        },
        update: {
          name: region.name,
          welshName: region.welshName || region.name
        }
      });
      results.push(result);
    }

    return res.status(201).json({ seeded: results.length, regions: results });
  } catch (error) {
    console.error("Error seeding regions:", error);
    return res.status(500).json({ error: "Failed to seed regions" });
  }
};
