import { prisma } from "@hmcts/postgres-prisma";
import type { Location } from "./model.js";

export async function getLocationByProvenanceLocationId(
  provenance: string,
  provenanceLocationId: string,
  locationType?: string
): Promise<Location | undefined> {
  const locationReference = await prisma.locationReference.findFirst({
    where: {
      provenance,
      provenanceLocationId,
      ...(locationType ? { provenanceLocationType: locationType } : {}),
      location: {
        deletedAt: null
      }
    },
    include: {
      location: {
        include: {
          locationRegions: {
            include: {
              region: true
            }
          },
          locationSubJurisdictions: {
            include: {
              subJurisdiction: true
            }
          }
        }
      }
    }
  });

  if (!locationReference) {
    return undefined;
  }

  const loc = locationReference.location;

  return {
    locationId: loc.locationId,
    name: loc.name,
    welshName: loc.welshName,
    regions: loc.locationRegions.map((lr: any) => lr.region.regionId),
    subJurisdictions: loc.locationSubJurisdictions.map((lsj: any) => lsj.subJurisdiction.subJurisdictionId)
  };
}
