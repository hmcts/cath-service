/**
 * Builds reference data upload CSVs at runtime so an upload only ever creates or overwrites rows this test owns.
 * Names carry the run prefix (so global-teardown removes confirmed uploads) and ids are random, unused and kept in a
 * range of their own, apart from createUniqueTestLocation's 90000-99999.
 */

import { generateTestId } from "./dynamic-test-data.js";
import { prefixName } from "./test-prefix.js";
import { getTestLocations } from "./test-support-api.js";

const CSV_LOCATION_ID_MIN = 80000;
const CSV_LOCATION_ID_MAX = 89999;
const MAX_ID_ATTEMPTS_PER_ROW = 50;
// Deploy-seeded reference data names; the CSV upload resolves sub-jurisdictions and regions by name
const DEFAULT_SUB_JURISDICTIONS = "Civil Court;Crown Court";
const DEFAULT_REGIONS = "South East";
const ALL_COLUMNS: LocationCsvColumn[] = [
  "LOCATION_ID",
  "LOCATION_NAME",
  "WELSH_LOCATION_NAME",
  "EMAIL",
  "CONTACT_NO",
  "SUB_JURISDICTION_NAME",
  "REGION_NAME",
  "PROVENANCE",
  "PROVENANCE_LOCATION_ID",
  "PROVENANCE_LOCATION_TYPE"
];

export async function buildLocationCsv(
  rowCount = 1,
  overrides: Partial<LocationCsvRow>[] = [],
  columns: LocationCsvColumn[] = ALL_COLUMNS
): Promise<LocationCsv> {
  const testId = generateTestId();
  const locationIds = await findUnusedLocationIds(rowCount);

  const rows = locationIds.map((locationId, index): LocationCsvRow => {
    const label = `${testId}-${index + 1}`;
    return {
      LOCATION_ID: String(locationId),
      LOCATION_NAME: prefixName(`Ref Upload Court ${label}`),
      WELSH_LOCATION_NAME: prefixName(`Llys Uwchlwytho ${label}`),
      EMAIL: `ref-upload-${index + 1}@test.hmcts.net`,
      CONTACT_NO: "01234567890",
      SUB_JURISDICTION_NAME: DEFAULT_SUB_JURISDICTIONS,
      REGION_NAME: DEFAULT_REGIONS,
      PROVENANCE: "SNL",
      // Unique per row and per run, so it can never clash with a real or another run's SNL reference
      PROVENANCE_LOCATION_ID: prefixName(`SNL-${label}`),
      PROVENANCE_LOCATION_TYPE: "VENUE",
      ...overrides[index]
    };
  });

  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => row[column]).join(","))];

  return { content: lines.join("\n"), rows };
}

async function findUnusedLocationIds(count: number): Promise<number[]> {
  const existing = (await getTestLocations()) as { locationId: number }[];
  const taken = new Set(existing.map((location) => location.locationId));
  const ids = new Set<number>();

  for (let attempt = 0; ids.size < count; attempt++) {
    if (attempt >= count * MAX_ID_ATTEMPTS_PER_ROW) {
      throw new Error(`Could not find ${count} unused location ids between ${CSV_LOCATION_ID_MIN} and ${CSV_LOCATION_ID_MAX}`);
    }
    const candidate = CSV_LOCATION_ID_MIN + Math.floor(Math.random() * (CSV_LOCATION_ID_MAX - CSV_LOCATION_ID_MIN + 1));
    if (!taken.has(candidate)) {
      ids.add(candidate);
    }
  }

  return [...ids];
}

export type LocationCsvColumn =
  | "LOCATION_ID"
  | "LOCATION_NAME"
  | "WELSH_LOCATION_NAME"
  | "EMAIL"
  | "CONTACT_NO"
  | "SUB_JURISDICTION_NAME"
  | "REGION_NAME"
  | "PROVENANCE"
  | "PROVENANCE_LOCATION_ID"
  | "PROVENANCE_LOCATION_TYPE";

export type LocationCsvRow = Record<LocationCsvColumn, string>;

export interface LocationCsv {
  content: string;
  rows: LocationCsvRow[];
}
