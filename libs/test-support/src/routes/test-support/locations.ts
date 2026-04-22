import { prisma } from "@hmcts/postgres";
import type { Request, Response } from "express";
import type { CreateLocationInput } from "../../types.js";

export const GET = async (req: Request, res: Response) => {
  try {
    const { first, includeRelationships } = req.query;

    const include =
      includeRelationships === "true"
        ? {
            locationRegions: true,
            locationSubJurisdictions: true
          }
        : undefined;

    if (first === "true") {
      const location = await prisma.location.findFirst({ include });
      if (!location) {
        return res.status(404).json({ error: "No location found" });
      }
      return res.json(location);
    }

    const locations = await prisma.location.findMany({ include });
    return res.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return res.status(500).json({ error: "Failed to fetch locations" });
  }
};

export const POST = async (req: Request, res: Response) => {
  try {
    const input = req.body as CreateLocationInput;

    if (!input.name || !input.welshName) {
      return res.status(400).json({
        error: "name and welshName are required"
      });
    }

    const locationId = input.locationId || 90000 + Math.floor(Math.random() * 9000) + (Date.now() % 1000);

    const location = await prisma.location.upsert({
      where: { locationId },
      create: {
        locationId,
        name: input.name,
        welshName: input.welshName,
        email: input.email || `${input.name.toLowerCase().replace(/\s+/g, "-")}@test.hmcts.net`,
        contactNo: input.contactNo || "01234567890",
        locationRegions: {
          create: (input.regionIds || [4]).map((regionId) => ({ regionId }))
        },
        locationSubJurisdictions: {
          create: (input.subJurisdictionIds || [1]).map((subJurisdictionId) => ({ subJurisdictionId }))
        }
      },
      update: {
        name: input.name,
        welshName: input.welshName,
        email: input.email || `${input.name.toLowerCase().replace(/\s+/g, "-")}@test.hmcts.net`,
        contactNo: input.contactNo || "01234567890"
      }
    });

    return res.status(201).json({
      locationId: location.locationId,
      name: location.name,
      welshName: location.welshName
    });
  } catch (error) {
    console.error("Error creating test location:", error);
    return res.status(500).json({ error: "Failed to create test location" });
  }
};

export const DELETE = async (req: Request, res: Response) => {
  try {
    const { locationIds } = req.body;

    if (!locationIds || !Array.isArray(locationIds)) {
      return res.status(400).json({ error: "locationIds array is required" });
    }

    const result = await prisma.location.deleteMany({
      where: {
        locationId: { in: locationIds }
      }
    });

    return res.json({ deleted: result.count });
  } catch (error) {
    console.error("Error deleting locations:", error);
    return res.status(500).json({ error: "Failed to delete locations" });
  }
};
