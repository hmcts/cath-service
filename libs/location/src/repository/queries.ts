import type { Jurisdiction, Region, SubJurisdiction } from "../location-data.js";
import { locationData } from "../location-data.js";

export interface Location {
  locationId: number;
  name: string;
  welshName: string;
  regions: number[];
  subJurisdictions: number[];
}

export function getAllLocations(language: "en" | "cy"): Location[] {
  const locations = [...locationData.locations];

  return locations.sort((a, b) => {
    const nameA = language === "cy" ? a.welshName : a.name;
    const nameB = language === "cy" ? b.welshName : b.name;
    return nameA.localeCompare(nameB);
  });
}

export function getLocationById(id: number): Location | undefined {
  return locationData.locations.find((location) => location.locationId === id);
}

export function getAllJurisdictions(): Jurisdiction[] {
  return locationData.jurisdictions;
}

export function getAllRegions(): Region[] {
  return locationData.regions;
}

export function getAllSubJurisdictions(): SubJurisdiction[] {
  return locationData.subJurisdictions;
}

export function getSubJurisdictionsByJurisdiction(jurisdictionId: number): SubJurisdiction[] {
  return locationData.subJurisdictions.filter((sub) => sub.jurisdictionId === jurisdictionId);
}
