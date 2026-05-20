import { getAllLocations, type Location, searchLocationsByName } from "./queries.js";

export type { Location } from "./queries.js";

export async function searchLocations(query: string, language: "en" | "cy"): Promise<Location[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.toLowerCase().trim();

  // Use database search with contains (case-insensitive)
  const locations = await searchLocationsByName(searchTerm, language);

  // Separate starts-with from partial matches for better UX
  const startsWithMatches: Location[] = [];
  const partialMatches: Location[] = [];

  for (const location of locations) {
    const locationName = language === "cy" ? location.welshName : location.name;
    const lowerLocationName = locationName.toLowerCase();

    if (lowerLocationName.startsWith(searchTerm)) {
      startsWithMatches.push(location);
    } else {
      partialMatches.push(location);
    }
  }

  return [...startsWithMatches, ...partialMatches];
}

export async function getLocationsGroupedByLetter(
  language: "en" | "cy",
  filters?: {
    regions?: number[];
    subJurisdictions?: number[];
  }
): Promise<Record<string, Location[]>> {
  // Pass filters to database query instead of filtering in JavaScript
  const locations = await getAllLocations(language, filters);

  const grouped: Record<string, Location[]> = {};

  for (const location of locations) {
    const name = language === "cy" ? location.welshName : location.name;
    const firstLetter = name.charAt(0).toUpperCase();

    if (!grouped[firstLetter]) {
      grouped[firstLetter] = [];
    }

    grouped[firstLetter].push(location);
  }

  return grouped;
}
