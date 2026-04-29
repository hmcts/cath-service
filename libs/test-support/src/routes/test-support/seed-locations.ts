import { prisma } from "@hmcts/postgres-prisma";
import type { Request, Response } from "express";

export const POST = async (req: Request, res: Response) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ error: "locations array is required" });
    }

    const results = [];
    for (const location of locations) {
      if (!location.locationId || !location.locationName) {
        return res.status(400).json({ error: "Each location must have locationId and locationName" });
      }

      await upsertLocation(location);
      await linkSubJurisdictions(location.locationId, location.subJurisdictionNames);
      await linkRegions(location.locationId, location.regionNames);

      results.push({ locationId: location.locationId, name: location.locationName });
    }

    return res.status(201).json({ seeded: results.length, locations: results });
  } catch (error) {
    console.error("Error seeding locations:", error);
    return res.status(500).json({ error: "Failed to seed locations" });
  }
};

async function upsertLocation(location: any): Promise<void> {
  const data = {
    locationId: location.locationId,
    name: location.locationName,
    welshName: location.welshLocationName || location.locationName,
    email: location.email || null,
    contactNo: location.contactNo || null
  };

  await (prisma as any).location.upsert({
    where: { locationId: location.locationId },
    create: data,
    update: {
      name: data.name,
      welshName: data.welshName,
      email: data.email,
      contactNo: data.contactNo
    }
  });
}

async function linkSubJurisdictions(locationId: number, subJurisdictionNames?: string[]): Promise<void> {
  if (!subJurisdictionNames || subJurisdictionNames.length === 0) {
    return;
  }

  const subJurisdictions = await (prisma as any).subJurisdiction.findMany({
    where: { name: { in: subJurisdictionNames } },
    select: { subJurisdictionId: true }
  });

  for (const { subJurisdictionId } of subJurisdictions) {
    await (prisma as any).locationSubJurisdiction.upsert({
      where: { locationId_subJurisdictionId: { locationId, subJurisdictionId } },
      create: { locationId, subJurisdictionId },
      update: {}
    });
  }
}

async function linkRegions(locationId: number, regionNames?: string[]): Promise<void> {
  if (!regionNames || regionNames.length === 0) {
    return;
  }

  const regions = await (prisma as any).region.findMany({
    where: { name: { in: regionNames } },
    select: { regionId: true }
  });

  for (const { regionId } of regions) {
    await (prisma as any).locationRegion.upsert({
      where: { locationId_regionId: { locationId, regionId } },
      create: { locationId, regionId },
      update: {}
    });
  }
}
