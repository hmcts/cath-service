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

      // Create or update location
      await (prisma as any).location.upsert({
        where: { locationId: location.locationId },
        create: {
          locationId: location.locationId,
          name: location.locationName,
          welshName: location.welshLocationName || location.locationName,
          email: location.email || null,
          contactNo: location.contactNo || null
        },
        update: {
          name: location.locationName,
          welshName: location.welshLocationName || location.locationName,
          email: location.email || null,
          contactNo: location.contactNo || null
        }
      });

      // Handle sub-jurisdiction relationships by name
      if (location.subJurisdictionNames && location.subJurisdictionNames.length > 0) {
        const subJurisdictions = await (prisma as any).subJurisdiction.findMany({
          where: {
            name: {
              in: location.subJurisdictionNames
            }
          },
          select: { subJurisdictionId: true, name: true }
        });

        for (const subJurisdiction of subJurisdictions) {
          await (prisma as any).locationSubJurisdiction.upsert({
            where: {
              locationId_subJurisdictionId: {
                locationId: location.locationId,
                subJurisdictionId: subJurisdiction.subJurisdictionId
              }
            },
            create: {
              locationId: location.locationId,
              subJurisdictionId: subJurisdiction.subJurisdictionId
            },
            update: {}
          });
        }
      }

      // Handle region relationships by name
      if (location.regionNames && location.regionNames.length > 0) {
        const regions = await (prisma as any).region.findMany({
          where: {
            name: {
              in: location.regionNames
            }
          },
          select: { regionId: true, name: true }
        });

        for (const region of regions) {
          await (prisma as any).locationRegion.upsert({
            where: {
              locationId_regionId: {
                locationId: location.locationId,
                regionId: region.regionId
              }
            },
            create: {
              locationId: location.locationId,
              regionId: region.regionId
            },
            update: {}
          });
        }
      }

      results.push({ locationId: location.locationId, name: location.locationName });
    }

    return res.status(201).json({ seeded: results.length, locations: results });
  } catch (error) {
    console.error("Error seeding locations:", error);
    return res.status(500).json({ error: "Failed to seed locations" });
  }
};
