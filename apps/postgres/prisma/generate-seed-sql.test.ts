import type { ListTypeData } from "@hmcts/list-types-common/list-type-data";
import type { locationData } from "@hmcts/location/location-data";
import { describe, expect, it } from "vitest";
import { generateSeedSql } from "./generate-seed-sql.js";

// Synthetic fixture: includes an apostrophe (quote escaping), a null defaultSensitivity,
// a location with empty junction arrays, and the two ET list types that must reach STG.
const LOCATION_DATA: typeof locationData = {
  regions: [
    { regionId: 1, name: "London", welshName: "Llundain" },
    { regionId: 2, name: "Midlands", welshName: "Canolbarth" }
  ],
  jurisdictions: [{ jurisdictionId: 1, name: "Civil", welshName: "Sifil" }],
  subJurisdictions: [
    { subJurisdictionId: 3, name: "Employment", welshName: "Cyflogaeth", jurisdictionId: 1 },
    { subJurisdictionId: 4, name: "Crime", welshName: "Trosedd", jurisdictionId: 1 }
  ],
  locations: [
    {
      locationId: 10,
      name: "Birmingham Magistrates' Court",
      welshName: "Llys Ynadon Birmingham",
      regions: [2],
      subJurisdictions: [3, 4]
    },
    {
      locationId: 11,
      name: "Empty Court",
      welshName: "Llys Gwag",
      regions: [],
      subJurisdictions: []
    }
  ]
};

const LIST_TYPES: ListTypeData[] = [
  {
    name: "ET_DAILY_LIST",
    englishFriendlyName: "Employment Tribunals Daily List",
    welshFriendlyName: "Rhestr Ddyddiol",
    provenance: "CFT_IDAM",
    urlPath: "et-daily-list",
    isNonStrategic: false,
    defaultSensitivity: "Public",
    shortenedFriendlyName: "ET Daily List",
    subJurisdictionIds: [3]
  },
  {
    name: "ET_FORTNIGHTLY_PRESS_LIST",
    englishFriendlyName: "Employment Tribunals Fortnightly Press List",
    welshFriendlyName: "Rhestr y Wasg",
    provenance: "CFT_IDAM",
    urlPath: "et-fortnightly-list",
    isNonStrategic: true,
    defaultSensitivity: null,
    subJurisdictionIds: [3, 4]
  }
];

function generate(): string {
  return generateSeedSql(LOCATION_DATA, LIST_TYPES);
}

describe("generateSeedSql", () => {
  it("should wrap the whole seed in a single transaction", () => {
    const sql = generate();

    expect(sql.trimStart().startsWith("BEGIN;")).toBe(true);
    expect(sql.trimEnd().endsWith("COMMIT;")).toBe(true);
  });

  it("should realign name/welsh_name collisions before inserting so ON CONFLICT (id) never hits a name conflict", () => {
    const sql = generate();

    // Each id-keyed table parks any pre-existing row holding a seed name/welsh_name.
    for (const [table, idColumn] of [
      ["region", "region_id"],
      ["jurisdiction", "jurisdiction_id"],
      ["sub_jurisdiction", "sub_jurisdiction_id"],
      ["location", "location_id"]
    ]) {
      expect(sql).toContain(`UPDATE ${table} SET\n  name = '__realign_' || ${idColumn},\n  welsh_name = '__realign_w_' || ${idColumn}\nWHERE name IN (`);
    }
    // The seed names appear in the WHERE clause of the realign, and the realign precedes the insert.
    expect(sql.indexOf("UPDATE region SET")).toBeLessThan(sql.indexOf("INSERT INTO region ("));
    expect(sql).toContain("WHERE name IN ('London'");
    expect(sql).toContain("Birmingham Magistrates'' Court");
  });

  it("should emit an atomic ON CONFLICT insert for every reference table", () => {
    const sql = generate();

    expect(sql).toContain("INSERT INTO region (region_id, name, welsh_name) VALUES");
    expect(sql).toContain("ON CONFLICT (region_id) DO UPDATE SET");
    expect(sql).toContain("INSERT INTO jurisdiction (jurisdiction_id, name, welsh_name) VALUES");
    expect(sql).toContain("ON CONFLICT (jurisdiction_id) DO UPDATE SET");
    expect(sql).toContain("INSERT INTO sub_jurisdiction (sub_jurisdiction_id, name, welsh_name, jurisdiction_id) VALUES");
    expect(sql).toContain("ON CONFLICT (sub_jurisdiction_id) DO UPDATE SET");
    expect(sql).toContain("INSERT INTO location (location_id, name, welsh_name, email, contact_no) VALUES");
    expect(sql).toContain("ON CONFLICT (location_id) DO UPDATE SET");
    expect(sql).toContain("INSERT INTO location_reference");
    expect(sql).toContain("ON CONFLICT (provenance, provenance_location_id) DO UPDATE SET");
    expect(sql).toContain("INSERT INTO location_region (location_id, region_id) VALUES");
    expect(sql).toContain("ON CONFLICT (location_id, region_id) DO NOTHING;");
    expect(sql).toContain("INSERT INTO location_sub_jurisdiction (location_id, sub_jurisdiction_id) VALUES");
    expect(sql).toContain("ON CONFLICT (location_id, sub_jurisdiction_id) DO NOTHING;");
    expect(sql).toContain("INSERT INTO list_types");
    expect(sql).toContain("ON CONFLICT (name) DO UPDATE SET");
  });

  it("should double single quotes so apostrophes do not break the SQL string", () => {
    const sql = generate();

    expect(sql).toContain("Birmingham Magistrates'' Court");
    expect(sql).not.toContain("Magistrates' Court");
  });

  it("should emit a literal NULL for a null default_sensitivity", () => {
    const sql = generate();

    // ET_FORTNIGHTLY_PRESS_LIST has null sensitivity; the value must be unquoted NULL,
    // sitting immediately before the provenance/is_non_strategic columns.
    expect(sql).toContain("NULL, 'CFT_IDAM', TRUE");
    expect(sql).not.toContain("'null'");
  });

  it("should supply a deterministic location_reference id and derived provenance id", () => {
    const sql = generate();

    expect(sql).toContain("'seedref_10'");
    expect(sql).toContain("'seedref_11'");
    // provenanceLocationId is locationId + 100 as a string.
    expect(sql).toContain("'110'");
    expect(sql).toContain("'111'");
    expect(sql).toContain("'SNL'");
    expect(sql).toContain("'VENUE'");
  });

  it("should omit junction rows for a location with empty region/sub-jurisdiction arrays", () => {
    const sql = generate();

    // location 11 has no regions/sub-jurisdictions, so it must not appear in either junction insert.
    expect(sql).toContain("(10, 2)");
    expect(sql).not.toMatch(/location_region[\s\S]*\(11,/);
    expect(sql).toContain("(10, 3)");
    expect(sql).toContain("(10, 4)");
    expect(sql).not.toMatch(/location_sub_jurisdiction[\s\S]*\(11,/);
  });

  it("should resolve list_type_id by name subquery for every sub-jurisdiction link", () => {
    const sql = generate();

    expect(sql).toContain("SELECT id, 3 FROM list_types WHERE name = 'ET_DAILY_LIST'");
    expect(sql).toContain("SELECT id, 3 FROM list_types WHERE name = 'ET_FORTNIGHTLY_PRESS_LIST'");
    expect(sql).toContain("SELECT id, 4 FROM list_types WHERE name = 'ET_FORTNIGHTLY_PRESS_LIST'");
    expect(sql).toContain("ON CONFLICT (list_type_id, sub_jurisdiction_id) DO NOTHING;");
  });

  it("should reset deleted_at to NULL when a list type is re-seeded", () => {
    const sql = generate();

    expect(sql).toContain("deleted_at = NULL");
  });

  it("should soft-delete active list types absent from the source data, preserving TEST_/E2E_ fixtures", () => {
    const sql = generate();

    expect(sql).toContain("UPDATE list_types SET deleted_at = NOW()");
    expect(sql).toContain("name NOT IN ('ET_DAILY_LIST', 'ET_FORTNIGHTLY_PRESS_LIST')");
    expect(sql).toContain("name NOT LIKE 'TEST_%'");
    expect(sql).toContain("name NOT LIKE 'E2E_%'");
  });

  it("should include both Employment Tribunal list types", () => {
    const sql = generate();

    expect(sql).toContain("'ET_DAILY_LIST'");
    expect(sql).toContain("'ET_FORTNIGHTLY_PRESS_LIST'");
  });

  it("should order inserts so foreign keys resolve (parents before children)", () => {
    const sql = generate();
    const order = [
      "INSERT INTO region",
      "INSERT INTO jurisdiction",
      "INSERT INTO sub_jurisdiction",
      "INSERT INTO location (",
      "INSERT INTO location_reference",
      "INSERT INTO location_region",
      "INSERT INTO location_sub_jurisdiction",
      "INSERT INTO list_types",
      "INSERT INTO list_types_sub_jurisdictions"
    ];
    const positions = order.map((marker) => sql.indexOf(marker));

    expect(positions.every((p) => p >= 0)).toBe(true);
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
  });
});
