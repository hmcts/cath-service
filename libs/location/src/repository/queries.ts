import { prisma } from "@hmcts/postgres";
import type { Jurisdiction, Location, Region, SubJurisdiction } from "./model.js";

export type { Location };

export async function getAllLocations(language: "en" | "cy"): Promise<Location[]> {
  const locations = await prisma.location.findMany({
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

  const mapped: Location[] = locations.map((loc) => ({
    locationId: loc.locationId,
    name: loc.name,
    welshName: loc.welshName,
    regions: loc.locationRegions.map((lr) => lr.region.regionId),
    subJurisdictions: loc.locationSubJurisdictions.map((lsj) => lsj.subJurisdiction.subJurisdictionId)
  }));

  return mapped.sort((a, b) => {
    const nameA = language === "cy" ? a.welshName : a.name;
    const nameB = language === "cy" ? b.welshName : b.name;
    return nameA.localeCompare(nameB);
  });
}

export async function getLocationById(id: number): Promise<Location | undefined> {
  const location = await prisma.location.findUnique({
    where: { locationId: id },
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
    regions: location.locationRegions.map((lr) => lr.region.regionId),
    subJurisdictions: location.locationSubJurisdictions.map((lsj) => lsj.subJurisdiction.subJurisdictionId)
  };
}

export async function getAllJurisdictions(): Promise<Jurisdiction[]> {
  const jurisdictions = await prisma.jurisdiction.findMany({
    orderBy: { jurisdictionId: "asc" }
  });

  return jurisdictions.map((j) => ({
    jurisdictionId: j.jurisdictionId,
    name: j.name,
    welshName: j.welshName
  }));
}

export async function getAllRegions(): Promise<Region[]> {
  const regions = await prisma.region.findMany({
    orderBy: { regionId: "asc" }
  });

  return regions.map((r) => ({
    regionId: r.regionId,
    name: r.name,
    welshName: r.welshName
  }));
}

export async function getAllSubJurisdictions(): Promise<SubJurisdiction[]> {
  const subJurisdictions = await prisma.subJurisdiction.findMany({
    orderBy: { subJurisdictionId: "asc" }
  });

  return subJurisdictions.map((sj) => ({
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

  return subJurisdictions.map((sj) => ({
    subJurisdictionId: sj.subJurisdictionId,
    name: sj.name,
    welshName: sj.welshName,
    jurisdictionId: sj.jurisdictionId
  }));
}
