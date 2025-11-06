import { locationData } from "../location-data.js";
import type { Jurisdiction, Location, Region, SubJurisdiction } from "./model.js";

export type { Location };

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
