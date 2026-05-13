import { prisma } from "@hmcts/postgres-prisma";
import type { EnrichedLocationData, ParsedLocationData } from "../model.js";

export async function enrichLocationData(data: ParsedLocationData[]): Promise<EnrichedLocationData[]> {
  const enriched: EnrichedLocationData[] = [];

  for (const row of data) {
    // Get sub-jurisdictions with their parent jurisdictions
    const subJurisdictions = await prisma.subJurisdiction.findMany({
      where: {
        name: {
          in: row.subJurisdictionNames
        }
      },
      select: {
        welshName: true,
        jurisdiction: {
          select: {
            name: true,
            welshName: true
          }
        }
      }
    });

    const jurisdictionNames = [...new Set(subJurisdictions.map((sj) => sj.jurisdiction.name))] as string[];
    const jurisdictionWelshNames = [...new Set(subJurisdictions.map((sj) => sj.jurisdiction.welshName))] as string[];
    const subJurisdictionWelshNames = subJurisdictions.map((sj) => sj.welshName);

    // Get regions
    const regions = await prisma.region.findMany({
      where: {
        name: {
          in: row.regionNames
        }
      },
      select: {
        welshName: true
      }
    });

    const regionWelshNames = regions.map((r) => r.welshName);

    enriched.push({
      ...row,
      jurisdictionNames,
      jurisdictionWelshNames,
      subJurisdictionWelshNames,
      regionWelshNames
    });
  }

  return enriched;
}
