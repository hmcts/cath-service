import { prisma } from "@hmcts/postgres";
import type { Jurisdiction, Location, Region, SubJurisdiction } from "./model.js";

export type { Location };

export async function getAllLocations(language: "en" | "cy"): Promise<Location[]> {
  const locations = await prisma.location.findMany({
    where: {
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
          subJurisdiction: true
        }
      }
    }
  });

  const mapped: Location[] = locations.map((loc: any) => ({
    locationId: loc.locationId,
    name: loc.name,
    welshName: loc.welshName,
    regions: loc.locationRegions.map((lr: any) => lr.region.regionId),
    subJurisdictions: loc.locationSubJurisdictions.map((lsj: any) => lsj.subJurisdiction.subJurisdictionId)
  }));

  return mapped.sort((a, b) => {
    const nameA = language === "cy" ? a.welshName : a.name;
    const nameB = language === "cy" ? b.welshName : b.name;
    return nameA.localeCompare(nameB);
  });
}

export async function getLocationById(id: number): Promise<Location | undefined> {
  const location = await prisma.location.findFirst({
    where: {
      locationId: id,
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
          subJurisdiction: true
        }
      }
    }
  });

  if (!location) {
    return undefined;
  }

  return {
    locationId: location.locationId,
    name: location.name,
    welshName: location.welshName,
    regions: location.locationRegions.map((lr: any) => lr.region.regionId),
    subJurisdictions: location.locationSubJurisdictions.map((lsj: any) => lsj.subJurisdiction.subJurisdictionId)
  };
}

export async function getAllJurisdictions(): Promise<Jurisdiction[]> {
  const jurisdictions = await prisma.jurisdiction.findMany({
    orderBy: { jurisdictionId: "asc" }
  });

  return jurisdictions.map((j: any) => ({
    jurisdictionId: j.jurisdictionId,
    name: j.name,
    welshName: j.welshName
  }));
}

export async function getAllRegions(): Promise<Region[]> {
  const regions = await prisma.region.findMany({
    orderBy: { regionId: "asc" }
  });

  return regions.map((r: any) => ({
    regionId: r.regionId,
    name: r.name,
    welshName: r.welshName
  }));
}

export async function getAllSubJurisdictions(): Promise<SubJurisdiction[]> {
  const subJurisdictions = await prisma.subJurisdiction.findMany({
    orderBy: { subJurisdictionId: "asc" }
  });

  return subJurisdictions.map((sj: any) => ({
    subJurisdictionId: sj.subJurisdictionId,
    name: sj.name,
    welshName: sj.welshName,
    jurisdictionId: sj.jurisdictionId
  }));
}

export async function getSubJurisdictionsByJurisdiction(jurisdictionId: number): Promise<SubJurisdiction[]> {
  const subJurisdictions = await prisma.subJurisdiction.findMany({
    where: { jurisdictionId },
    orderBy: { subJurisdictionId: "asc" }
  });

  return subJurisdictions.map((sj: any) => ({
    subJurisdictionId: sj.subJurisdictionId,
    name: sj.name,
    welshName: sj.welshName,
    jurisdictionId: sj.jurisdictionId
  }));
}

export async function getLocationWithDetails(locationId: number): Promise<import("./model.js").LocationDetails | null> {
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
      searchType: "LOCATION_ID",
      searchValue: locationId.toString()
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
