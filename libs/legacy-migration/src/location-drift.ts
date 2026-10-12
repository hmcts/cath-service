import type { locationData } from "@hmcts/location";
import type { LegacyLocation } from "./legacy-publication-source.js";
import type { Rejection } from "./sync-report.js";

// location-data.ts is the source of truth here and the deploy seed overwrites names from it,
// so drift is reported for a PR rather than synced. Region and sub-jurisdiction are compared
// by English name, because legacy stores names where this service stores ids.
export function findLocationDrift(legacyLocations: LegacyLocation[], current: LocationData): Rejection[] {
  const regionNames = new Map(current.regions.map((region) => [region.regionId, region.name]));
  const subJurisdictionNames = new Map(current.subJurisdictions.map((subJurisdiction) => [subJurisdiction.subJurisdictionId, subJurisdiction.name]));
  const currentById = new Map(current.locations.map((location) => [location.locationId, location]));
  const legacyIds = new Set(legacyLocations.map((location) => location.location_id));
  const drift: Rejection[] = [];

  for (const legacy of legacyLocations) {
    const entityId = String(legacy.location_id);
    const location = currentById.get(legacy.location_id);

    if (!location) {
      drift.push({ entityId, reason: "missing from location-data.ts" });
      continue;
    }

    if (legacy.name !== location.name) drift.push({ entityId, reason: "name differs" });
    if (legacy.welsh_name !== location.welshName) drift.push({ entityId, reason: "Welsh name differs" });

    const currentRegionNames = location.regions.map((id) => regionNames.get(id));
    const currentSubJurisdictionNames = location.subJurisdictions.map((id) => subJurisdictionNames.get(id));
    if (!sameNames(legacy.region, currentRegionNames)) drift.push({ entityId, reason: "regions differ" });
    if (!sameNames(legacy.jurisdiction_type, currentSubJurisdictionNames)) drift.push({ entityId, reason: "sub-jurisdictions differ" });
  }

  for (const location of current.locations.filter((currentLocation) => !legacyIds.has(currentLocation.locationId))) {
    drift.push({ entityId: String(location.locationId), reason: "in location-data.ts but not in legacy" });
  }

  return drift;
}

function sameNames(legacyNames: string[] | null, currentNames: (string | undefined)[]): boolean {
  const normalise = (names: (string | undefined)[]) => [...new Set(names.map((name) => name?.trim().toLowerCase() ?? ""))].sort().join("|");
  return normalise(legacyNames ?? []) === normalise(currentNames);
}

export type LocationData = typeof locationData;
