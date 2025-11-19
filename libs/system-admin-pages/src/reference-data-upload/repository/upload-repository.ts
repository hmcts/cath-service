import { prisma } from "@hmcts/postgres";
import type { ParsedLocationData } from "../model.js";

export async function upsertLocations(data: ParsedLocationData[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const row of data) {
      // Get sub-jurisdiction IDs from names
      const subJurisdictions = await tx.subJurisdiction.findMany({
        where: {
          name: {
            in: row.subJurisdictionNames
          }
        },
        select: {
          subJurisdictionId: true
        }
      });

      const subJurisdictionIds = subJurisdictions.map((sj) => sj.subJurisdictionId);

      // Get region IDs from names
      const regions = await tx.region.findMany({
        where: {
          name: {
            in: row.regionNames
          }
        },
        select: {
          regionId: true
        }
      });

      const regionIds = regions.map((r) => r.regionId);

      // Upsert location
      await tx.location.upsert({
        where: {
          locationId: row.locationId
        },
        create: {
          locationId: row.locationId,
          name: row.locationName,
          welshName: row.welshLocationName,
          email: row.email || null,
          contactNo: row.contactNo || null
        },
        update: {
          name: row.locationName,
          welshName: row.welshLocationName,
          email: row.email || null,
          contactNo: row.contactNo || null
        }
      });

      // Delete existing junction records
      await tx.locationSubJurisdiction.deleteMany({
        where: {
          locationId: row.locationId
        }
      });

      await tx.locationRegion.deleteMany({
        where: {
          locationId: row.locationId
        }
      });

      // Create new junction records
      if (subJurisdictionIds.length > 0) {
        await tx.locationSubJurisdiction.createMany({
          data: subJurisdictionIds.map((subJurisdictionId) => ({
            locationId: row.locationId,
            subJurisdictionId
          }))
        });
      }

      if (regionIds.length > 0) {
        await tx.locationRegion.createMany({
          data: regionIds.map((regionId) => ({
            locationId: row.locationId,
            regionId
          }))
        });
      }
    }
  });
}
