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

      const welshName = region.welshName || region.name;

      // Remove stale regions that share the same name or welshName but a different ID.
      // This handles cases where a previous deploy had different regionId assignments.
      const staleRegions = await prisma.region.findMany({
        where: {
          regionId: { not: region.regionId },
          OR: [{ name: region.name }, { welshName }]
        },
        select: { regionId: true }
      });

      if (staleRegions.length > 0) {
        const staleIds = staleRegions.map((r) => r.regionId);
        await prisma.locationRegion.deleteMany({ where: { regionId: { in: staleIds } } });
        await prisma.region.deleteMany({ where: { regionId: { in: staleIds } } });
      }

      const result = await prisma.region.upsert({
        where: { regionId: region.regionId },
        create: { regionId: region.regionId, name: region.name, welshName },
        update: { name: region.name, welshName }
      });
      results.push(result);
    }

    return res.status(201).json({ seeded: results.length, regions: results });
  } catch (error) {
    console.error("Error seeding regions:", error);
    return res.status(500).json({ error: "Failed to seed regions" });
  }
};
