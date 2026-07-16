import type { PrismaClient } from "@hmcts/postgres-prisma";
import { prisma } from "@hmcts/postgres-prisma";
import type { ParsedLocationData } from "../model.js";

function mergeByLocationId(data: ParsedLocationData[]): ParsedLocationData[] {
  const merged = new Map<number, ParsedLocationData>();
  for (const row of data) {
    const existing = merged.get(row.locationId);
    if (existing) {
      existing.locationReferences = [...existing.locationReferences, ...row.locationReferences];
      existing.subJurisdictionNames = [...new Set([...existing.subJurisdictionNames, ...row.subJurisdictionNames])];
      existing.regionNames = [...new Set([...existing.regionNames, ...row.regionNames])];
    } else {
      merged.set(row.locationId, { ...row, locationReferences: [...row.locationReferences] });
    }
  }
  return [...merged.values()];
}

export async function upsertLocations(data: ParsedLocationData[]): Promise<void> {
  const mergedData = mergeByLocationId(data);
  await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">) => {
    for (const row of mergedData) {
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

      const subJurisdictionIds = subJurisdictions.map((sj: { subJurisdictionId: number }) => sj.subJurisdictionId);

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

      const regionIds = regions.map((r: { regionId: number }) => r.regionId);

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
          contactNo: row.contactNo || null,
          deletedAt: null
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
          data: subJurisdictionIds.map((subJurisdictionId: number) => ({
            locationId: row.locationId,
            subJurisdictionId
          }))
        });
      }

      if (regionIds.length > 0) {
        await tx.locationRegion.createMany({
          data: regionIds.map((regionId: number) => ({
            locationId: row.locationId,
            regionId
          }))
        });
      }

      await tx.locationReference.deleteMany({
        where: {
          locationId: row.locationId
        }
      });

      if (row.locationReferences.length > 0) {
        await tx.locationReference.createMany({
          data: row.locationReferences.map((ref) => ({
            locationId: row.locationId,
            provenance: ref.provenance,
            provenanceLocationId: ref.provenanceLocationId,
            provenanceLocationType: ref.provenanceLocationType
          }))
        });
      }
    }
  });
}
