// Import from dedicated subpaths, not the package barrels: the list-types-common
// barrel re-exports PDF utilities (nunjucks/exceljs) and the location barrel pulls
// in the Prisma repository layer — neither is needed to emit SQL and the former is
// not installed in the focused postgres deploy image.

import { type ListTypeData, listTypeData } from "@hmcts/list-types-common/list-type-data";
import { locationData } from "@hmcts/location/location-data";

const LOCATION_REFERENCE_PROVENANCE = "SNL";
const DEFAULT_PROVENANCE_LOCATION_TYPE = "VENUE";

// Deploy-time reference-data seed. Emits idempotent INSERT ... ON CONFLICT SQL from
// the TypeScript source of truth so it can be applied with `prisma db execute`. Unlike
// Prisma's non-atomic upsert (SELECT-then-INSERT in application code), ON CONFLICT is
// resolved atomically inside Postgres, so concurrent seeders across any number of pods
// converge without racing on a UniqueConstraintViolation.
export function generateSeedSql(data: typeof locationData, listTypes: ListTypeData[]): string {
  return [
    "BEGIN;",
    // Realign first: region/jurisdiction/sub_jurisdiction/location each have UNIQUE(name) and
    // UNIQUE(welsh_name) in addition to their id primary key. ON CONFLICT can arbitrate only the
    // id, so if an environment already holds one of the seed's names/welsh_names at a *different*
    // id (e.g. a value renamed or moved to a new id in a past release that never seeded cleanly),
    // the id-keyed upsert below throws a unique violation on name/welsh_name. Parking those rows
    // to a deterministic temp value first frees the names so the upsert can place them at their
    // canonical id. Only name/welsh_name change here — ids and FK children are untouched.
    generateRealignSql(
      "region",
      "region_id",
      data.regions.map((r) => r.name),
      data.regions.map((r) => r.welshName)
    ),
    generateRealignSql(
      "jurisdiction",
      "jurisdiction_id",
      data.jurisdictions.map((j) => j.name),
      data.jurisdictions.map((j) => j.welshName)
    ),
    generateRealignSql(
      "sub_jurisdiction",
      "sub_jurisdiction_id",
      data.subJurisdictions.map((sj) => sj.name),
      data.subJurisdictions.map((sj) => sj.welshName)
    ),
    generateRealignSql(
      "location",
      "location_id",
      data.locations.map((l) => l.name),
      data.locations.map((l) => l.welshName)
    ),
    generateRegionsSql(data.regions),
    generateJurisdictionsSql(data.jurisdictions),
    generateSubJurisdictionsSql(data.subJurisdictions),
    generateLocationsSql(data.locations),
    generateLocationReferencesSql(data.locations),
    generateLocationRegionsSql(data.locations),
    generateLocationSubJurisdictionsSql(data.locations),
    generateListTypesSql(listTypes),
    generateListTypeSubJurisdictionsSql(listTypes),
    generateSoftDeleteReconciliationSql(listTypes),
    "COMMIT;"
  ].join("\n\n");
}

// Park any row whose name or welsh_name matches a value the seed is about to insert, renaming it
// to a deterministic id-keyed placeholder so the following ON CONFLICT (id) upsert can set that
// name at its canonical id without a unique-constraint violation. A row parked but not restored by
// the upsert (its id is absent from the seed) is a genuinely stale/moved row; its placeholder name
// is inert and collision-free.
function generateRealignSql(table: string, idColumn: string, names: string[], welshNames: string[]): string {
  const nameList = names.map(sqlStr).join(", ");
  const welshList = welshNames.map(sqlStr).join(", ");
  return `UPDATE ${table} SET\n  name = '__realign_' || ${idColumn},\n  welsh_name = '__realign_w_' || ${idColumn}\nWHERE name IN (${nameList}) OR welsh_name IN (${welshList});`;
}

function generateRegionsSql(regions: typeof locationData.regions): string {
  const values = regions.map((r) => `  (${r.regionId}, ${sqlStr(r.name)}, ${sqlStr(r.welshName)})`).join(",\n");
  return `INSERT INTO region (region_id, name, welsh_name) VALUES\n${values}\nON CONFLICT (region_id) DO UPDATE SET\n  name = EXCLUDED.name, welsh_name = EXCLUDED.welsh_name;`;
}

function generateJurisdictionsSql(jurisdictions: typeof locationData.jurisdictions): string {
  const values = jurisdictions.map((j) => `  (${j.jurisdictionId}, ${sqlStr(j.name)}, ${sqlStr(j.welshName)})`).join(",\n");
  return `INSERT INTO jurisdiction (jurisdiction_id, name, welsh_name) VALUES\n${values}\nON CONFLICT (jurisdiction_id) DO UPDATE SET\n  name = EXCLUDED.name, welsh_name = EXCLUDED.welsh_name;`;
}

function generateSubJurisdictionsSql(subJurisdictions: typeof locationData.subJurisdictions): string {
  const values = subJurisdictions.map((sj) => `  (${sj.subJurisdictionId}, ${sqlStr(sj.name)}, ${sqlStr(sj.welshName)}, ${sj.jurisdictionId})`).join(",\n");
  return `INSERT INTO sub_jurisdiction (sub_jurisdiction_id, name, welsh_name, jurisdiction_id) VALUES\n${values}\nON CONFLICT (sub_jurisdiction_id) DO UPDATE SET\n  name = EXCLUDED.name, welsh_name = EXCLUDED.welsh_name, jurisdiction_id = EXCLUDED.jurisdiction_id;`;
}

function generateLocationsSql(locations: typeof locationData.locations): string {
  const values = locations.map((l) => `  (${l.locationId}, ${sqlStr(l.name)}, ${sqlStr(l.welshName)}, NULL, NULL)`).join(",\n");
  // Only name/welsh_name are updated on conflict, matching the previous seed's update block.
  return `INSERT INTO location (location_id, name, welsh_name, email, contact_no) VALUES\n${values}\nON CONFLICT (location_id) DO UPDATE SET\n  name = EXCLUDED.name, welsh_name = EXCLUDED.welsh_name;`;
}

function generateLocationReferencesSql(locations: typeof locationData.locations): string {
  // location_reference_id has no database default (the cuid() default is Prisma
  // application-level only), so a raw INSERT must supply it. A deterministic id keeps
  // re-runs stable and lets ON CONFLICT target the same row every time.
  const values = locations
    .map((l) => {
      const referenceId = `seedref_${l.locationId}`;
      const provenanceLocationId = String(l.locationId + 100);
      const provenanceLocationType = l.provenanceLocationType ?? DEFAULT_PROVENANCE_LOCATION_TYPE;
      return `  (${sqlStr(referenceId)}, ${l.locationId}, ${sqlStr(LOCATION_REFERENCE_PROVENANCE)}, ${sqlStr(provenanceLocationId)}, ${sqlStr(provenanceLocationType)})`;
    })
    .join(",\n");
  return `INSERT INTO location_reference (location_reference_id, location_id, provenance, provenance_location_id, provenance_location_type) VALUES\n${values}\nON CONFLICT (provenance, provenance_location_id) DO UPDATE SET\n  location_id = EXCLUDED.location_id, provenance_location_type = EXCLUDED.provenance_location_type;`;
}

function generateLocationRegionsSql(locations: typeof locationData.locations): string {
  const rows = locations.flatMap((l) => l.regions.map((regionId) => `  (${l.locationId}, ${regionId})`));
  if (rows.length === 0) {
    return "-- no location_region rows";
  }
  return `INSERT INTO location_region (location_id, region_id) VALUES\n${rows.join(",\n")}\nON CONFLICT (location_id, region_id) DO NOTHING;`;
}

function generateLocationSubJurisdictionsSql(locations: typeof locationData.locations): string {
  const rows = locations.flatMap((l) => l.subJurisdictions.map((subJurisdictionId) => `  (${l.locationId}, ${subJurisdictionId})`));
  if (rows.length === 0) {
    return "-- no location_sub_jurisdiction rows";
  }
  return `INSERT INTO location_sub_jurisdiction (location_id, sub_jurisdiction_id) VALUES\n${rows.join(",\n")}\nON CONFLICT (location_id, sub_jurisdiction_id) DO NOTHING;`;
}

function generateListTypesSql(listTypes: ListTypeData[]): string {
  const values = listTypes
    .map((lt) => {
      const shortened = lt.shortenedFriendlyName ?? lt.englishFriendlyName;
      const url = lt.urlPath || "";
      return `  (${sqlStr(lt.name)}, ${sqlStr(lt.englishFriendlyName)}, ${sqlStr(lt.welshFriendlyName)}, ${sqlStr(shortened)}, ${sqlStr(url)}, ${sqlStrOrNull(lt.defaultSensitivity)}, ${sqlStr(lt.provenance)}, ${sqlBool(lt.isNonStrategic)}, NOW(), NOW())`;
    })
    .join(",\n");
  return `INSERT INTO list_types (name, friendly_name, welsh_friendly_name, shortened_friendly_name, url, default_sensitivity, allowed_provenance, is_non_strategic, created_at, updated_at) VALUES\n${values}\nON CONFLICT (name) DO UPDATE SET\n  friendly_name = EXCLUDED.friendly_name,\n  welsh_friendly_name = EXCLUDED.welsh_friendly_name,\n  shortened_friendly_name = EXCLUDED.shortened_friendly_name,\n  url = EXCLUDED.url,\n  default_sensitivity = EXCLUDED.default_sensitivity,\n  allowed_provenance = EXCLUDED.allowed_provenance,\n  is_non_strategic = EXCLUDED.is_non_strategic,\n  deleted_at = NULL,\n  updated_at = NOW();`;
}

function generateListTypeSubJurisdictionsSql(listTypes: ListTypeData[]): string {
  // list_type_id references the autoincrement list_types.id, which the TypeScript source
  // does not know — resolve it by name via a subquery so the link is stable across environments.
  const statements = listTypes.flatMap((lt) =>
    lt.subJurisdictionIds.map(
      (subJurisdictionId) =>
        `INSERT INTO list_types_sub_jurisdictions (list_type_id, sub_jurisdiction_id)\nSELECT id, ${subJurisdictionId} FROM list_types WHERE name = ${sqlStr(lt.name)}\nON CONFLICT (list_type_id, sub_jurisdiction_id) DO NOTHING;`
    )
  );
  return statements.join("\n\n");
}

function generateSoftDeleteReconciliationSql(listTypes: ListTypeData[]): string {
  // Soft-delete any active list type no longer present in listTypeData (e.g. CRIME_DAILY_LIST).
  // TEST_/E2E_ list types live outside listTypeData and must be preserved.
  const activeNames = listTypes.map((lt) => sqlStr(lt.name)).join(", ");
  return `UPDATE list_types SET deleted_at = NOW()\nWHERE deleted_at IS NULL\n  AND name NOT IN (${activeNames})\n  AND name NOT LIKE 'TEST_%'\n  AND name NOT LIKE 'E2E_%';`;
}

function sqlStr(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlStrOrNull(value: string | null): string {
  return value === null ? "NULL" : sqlStr(value);
}

function sqlBool(value: boolean): string {
  return value ? "TRUE" : "FALSE";
}

// Emit the SQL to stdout when run directly (piped into `prisma db execute --stdin`).
if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(generateSeedSql(locationData, listTypeData));
}
