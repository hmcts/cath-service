import { locationData } from "./location-data.js";

export interface Location {
  locationId: number;
  name: string;
  welshName: string;
  regions: number[];
  subJurisdictions: number[];
}

export function searchLocations(query: string, language: "en" | "cy"): Location[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.toLowerCase().trim();
  const locations = locationData.locations;

  const startsWithMatches: Location[] = [];
  const partialMatches: Location[] = [];

  for (const location of locations) {
    const locationName = language === "cy" ? location.welshName : location.name;
    const lowerLocationName = locationName.toLowerCase();

    if (lowerLocationName.startsWith(searchTerm)) {
      startsWithMatches.push(location);
    } else if (lowerLocationName.includes(searchTerm)) {
      partialMatches.push(location);
    }
  }

  startsWithMatches.sort((a, b) => {
    const nameA = language === "cy" ? a.welshName : a.name;
    const nameB = language === "cy" ? b.welshName : b.name;
    return nameA.localeCompare(nameB);
  });

  partialMatches.sort((a, b) => {
    const nameA = language === "cy" ? a.welshName : a.name;
    const nameB = language === "cy" ? b.welshName : b.name;
    return nameA.localeCompare(nameB);
  });

  return [...startsWithMatches, ...partialMatches];
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

export function getLocationsGroupedByLetter(language: "en" | "cy"): Record<string, Location[]> {
  const sortedLocations = getAllLocations(language);
  const grouped: Record<string, Location[]> = {};

  for (const location of sortedLocations) {
    const name = language === "cy" ? location.welshName : location.name;
    const firstLetter = name.charAt(0).toUpperCase();

    if (!grouped[firstLetter]) {
      grouped[firstLetter] = [];
    }

    grouped[firstLetter].push(location);
  }

  return grouped;
}
