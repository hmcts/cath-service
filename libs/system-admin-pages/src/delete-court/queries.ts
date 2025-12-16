import { prisma } from "@hmcts/postgres";

export interface LocationDetails {
  locationId: number;
  name: string;
  welshName: string;
  regions: Array<{ name: string; welshName: string }>;
  subJurisdictions: Array<{ name: string; welshName: string; jurisdictionName: string; jurisdictionWelshName: string }>;
}

export async function getLocationWithDetails(locationId: number): Promise<LocationDetails | null> {
  const location = await prisma.location.findFirst({
    where: {
      locationId,
      deletedAt: null
    },
    include: {
      locationRegions: {
        include: {
          region: true
        }
      },
      locationSubJurisdictions: {
        include: {
          subJurisdiction: {
            include: {
              jurisdiction: true
            }
          }
        }
      }
    }
  });

  if (!location) {
    return null;
  }

  return {
    locationId: location.locationId,
    name: location.name,
    welshName: location.welshName,
    regions: location.locationRegions.map((lr) => ({
      name: lr.region.name,
      welshName: lr.region.welshName
    })),
    subJurisdictions: location.locationSubJurisdictions.map((lsj) => ({
      name: lsj.subJurisdiction.name,
      welshName: lsj.subJurisdiction.welshName,
      jurisdictionName: lsj.subJurisdiction.jurisdiction.name,
      jurisdictionWelshName: lsj.subJurisdiction.jurisdiction.welshName
    }))
  };
}

export async function hasActiveSubscriptions(locationId: number): Promise<boolean> {
  const count = await prisma.subscription.count({
    where: {
      locationId
    }
  });

  return count > 0;
}

export async function hasActiveArtefacts(locationId: number): Promise<boolean> {
  const count = await prisma.artefact.count({
    where: {
      locationId: locationId.toString(),
      displayTo: {
        gt: new Date()
      }
    }
  });

  return count > 0;
}

export async function softDeleteLocation(locationId: number): Promise<void> {
  await prisma.location.update({
    where: {
      locationId
    },
    data: {
      deletedAt: new Date()
    }
  });
}
