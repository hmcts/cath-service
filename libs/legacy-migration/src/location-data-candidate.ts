import { locationData } from "@hmcts/location";
import { readLegacyPublicationData } from "./legacy-publication-source.js";
import { generateLocationData, renderLocationDataSource } from "./location-data-generator.js";
import type { Rejection } from "./sync-report.js";

// One-off for the location parity PR: a location-data.ts candidate built from legacy, compared
// with the current file. Reads legacy only; writes nothing.
export async function buildLocationDataCandidate(legacyPublicationDatabaseUrl: string): Promise<{ source: string; issues: Rejection[] }> {
  const legacy = await readLegacyPublicationData(legacyPublicationDatabaseUrl);
  const { data, issues } = generateLocationData(legacy.locations, legacy.locationReferences, locationData);

  return { source: renderLocationDataSource(data), issues };
}
