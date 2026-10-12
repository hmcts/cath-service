import type { LegacyLocation, LegacyLocationReference } from "./legacy-publication-source.js";
import type { LocationData } from "./location-drift.js";
import type { Rejection } from "./sync-report.js";

const DEFAULT_LOCATION_TYPE = "VENUE";

// Builds a location-data.ts candidate whose ids are the legacy P&I ids, so migrated
// subscriptions and artefacts resolve. Regions, jurisdictions and sub-jurisdictions are kept
// from the current file; legacy names that match none of them are reported, not invented.
export function generateLocationData(
  legacyLocations: LegacyLocation[],
  legacyReferences: LegacyLocationReference[],
  current: LocationData
): { data: LocationData; issues: Rejection[] } {
  const regionIds = idsByName(current.regions.map((region) => [region.name, region.regionId]));
  const subJurisdictionIds = idsByName(current.subJurisdictions.map((subJurisdiction) => [subJurisdiction.name, subJurisdiction.subJurisdictionId]));
  const locationIdsWithReferences = new Set(legacyReferences.map((reference) => reference.location_id));
  const issues: Rejection[] = [];

  const locations = [...legacyLocations]
    .sort((a, b) => a.location_id - b.location_id)
    .flatMap((legacy) => {
      const entityId = String(legacy.location_id);
      const name = legacy.name?.trim();

      if (!name) {
        issues.push({ entityId, reason: "missing name, location left out" });
        return [];
      }

      if (!legacy.welsh_name) issues.push({ entityId, reason: "missing Welsh name, English name used" });
      if (locationIdsWithReferences.has(legacy.location_id)) {
        issues.push({ entityId, reason: "location references not carried: location-data.ts has no field for them" });
      }

      return [
        {
          locationId: legacy.location_id,
          name,
          welshName: legacy.welsh_name?.trim() || name,
          regions: resolveNames(legacy.region, regionIds, "region", entityId, issues),
          subJurisdictions: resolveNames(legacy.jurisdiction_type, subJurisdictionIds, "sub-jurisdiction", entityId, issues),
          ...(legacy.location_type && legacy.location_type !== DEFAULT_LOCATION_TYPE ? { provenanceLocationType: legacy.location_type } : {})
        }
      ];
    });

  return { data: { ...current, locations }, issues };
}

export function renderLocationDataSource(data: LocationData): string {
  return [
    'import type { Jurisdiction, Location, Region, SubJurisdiction } from "./repository/model.js";',
    "",
    "// Generated from legacy CaTH by generate-location-data. Review before merging.",
    "export const locationData: {",
    "  locations: Location[];",
    "  regions: Region[];",
    "  jurisdictions: Jurisdiction[];",
    "  subJurisdictions: SubJurisdiction[];",
    `} = ${JSON.stringify(data, null, 2)};`,
    ""
  ].join("\n");
}

function idsByName(entries: [string, number][]): Map<string, number> {
  return new Map(entries.map(([name, id]) => [name.trim().toLowerCase(), id]));
}

function resolveNames(names: string[] | null, idByName: Map<string, number>, kind: string, entityId: string, issues: Rejection[]): number[] {
  const ids: number[] = [];
  for (const name of names ?? []) {
    const id = idByName.get(name.trim().toLowerCase());
    if (id === undefined) {
      issues.push({ entityId, reason: `unknown ${kind} ${name}` });
    } else if (!ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}
