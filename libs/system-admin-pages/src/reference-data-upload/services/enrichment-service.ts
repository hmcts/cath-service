import { prisma } from "@hmcts/postgres";
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
      include: {
        jurisdiction: true
      }
    });

    const jurisdictionNames: string[] = [...new Set(subJurisdictions.map((sj: any) => sj.jurisdiction.name))];
    const jurisdictionWelshNames: string[] = [...new Set(subJurisdictions.map((sj: any) => sj.jurisdiction.welshName))];
    const subJurisdictionWelshNames = subJurisdictions.map((sj: any) => sj.welshName);

    // Get regions
    const regions = await prisma.region.findMany({
      where: {
        name: {
          in: row.regionNames
        }
      }
    });

    const regionWelshNames = regions.map((r: any) => r.welshName);

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
