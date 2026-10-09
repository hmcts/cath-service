const NO_MATCH_PREFIX = "NoMatch";

export function buildNoMatchLocationId(unmatchedLocationId: string): string {
  return `${NO_MATCH_PREFIX}${unmatchedLocationId}`;
}

export function getLocationIdForNoMatch(locationId: string): string {
  return isNoMatchLocationId(locationId) ? locationId.slice(NO_MATCH_PREFIX.length) : locationId;
}

export function isNoMatchLocationId(locationId: string): boolean {
  return locationId.startsWith(NO_MATCH_PREFIX);
}
