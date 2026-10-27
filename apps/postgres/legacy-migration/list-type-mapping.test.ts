import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listTypeData } from "@hmcts/list-types-common/list-type-data";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PIP_TO_CATH = readFileSync(path.join(__dirname, "pip-to-cath-migration.sql"), "utf-8");
const CATH_TO_PIP = readFileSync(path.join(__dirname, "cath-to-pip-migration.sql"), "utf-8");
const CATH_LIST_TYPES = new Set(listTypeData.map((listType) => listType.name));

// Pip list types nothing here maps to, so their rows are rejected (docs/migration/legacy-data-migration.md §6).
// A list type added or renamed here changes this list: update it and the doc together.
const PIP_LIST_TYPES_WITHOUT_TARGET = [
  "ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST",
  "BUSINESS_LIST_CHD_DAILY_CAUSE_LIST",
  "CARE_STANDARDS_LIST",
  "CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST",
  "CIC_DAILY_HEARING_LIST",
  "COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST",
  "COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST",
  "COMPETITION_LIST_CHD_DAILY_CAUSE_LIST",
  "FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST",
  "INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST",
  "INTELLECTUAL_PROPERTY_AND_ENTERPRISE_COURT_DAILY_CAUSE_LIST",
  "INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST",
  "LONDON_CIRCUIT_COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST",
  "PATENTS_COURT_CHD_DAILY_CAUSE_LIST",
  "PENSIONS_LIST_CHD_DAILY_CAUSE_LIST",
  "PRIMARY_HEALTH_LIST",
  "PROPERTY_TRUSTS_PROBATE_LIST_CHD_DAILY_CAUSE_LIST",
  "REVENUE_LIST_CHD_DAILY_CAUSE_LIST",
  "SJP_PRESS_REGISTER",
  "SSCS_DAILY_LIST",
  "SSCS_DAILY_LIST_ADDITIONAL_HEARINGS",
  "TECHNOLOGY_AND_CONSTRUCTION_COURT_DAILY_CAUSE_LIST",
  "TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST"
];

describe("legacy migration list type mapping", () => {
  it("should have the same mappings in both scripts", () => {
    // Arrange
    const mappings = (script: string) => script.slice(script.indexOf("-- Legacy ListType enum names"), script.indexOf("('CASE_URN', 'CASE_NUMBER');"));

    // Act
    const pipToCath = mappings(PIP_TO_CATH);
    const cathToPip = mappings(CATH_TO_PIP);

    // Assert
    expect(pipToCath.length).toBeGreaterThan(0);
    expect(cathToPip).toBe(pipToCath);
  });

  it("should rename only to list types that exist here", () => {
    // Arrange
    const renames = listTypeRenames(PIP_TO_CATH);

    // Act
    const missing = renames.filter(({ name }) => !CATH_LIST_TYPES.has(name));

    // Assert
    expect(renames.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  it("should rename only legacy names that are not also list types here", () => {
    // Arrange
    const renames = listTypeRenames(PIP_TO_CATH);

    // Act
    const shadowed = renames.filter(({ legacyName }) => CATH_LIST_TYPES.has(legacyName));

    // Assert
    expect(shadowed).toEqual([]);
  });

  it("should rename only names that are pip list types", () => {
    // Arrange
    const pipListTypes = new Set(pipListTypeNames(CATH_TO_PIP));

    // Act
    const unknown = listTypeRenames(PIP_TO_CATH).filter(({ legacyName }) => !pipListTypes.has(legacyName));

    // Assert
    expect(unknown).toEqual([]);
  });

  it("should map every pip list type except the known ones with no target", () => {
    // Arrange
    const renamed = new Set(listTypeRenames(PIP_TO_CATH).map(({ legacyName }) => legacyName));

    // Act
    const withoutTarget = pipListTypeNames(CATH_TO_PIP).filter((name) => !CATH_LIST_TYPES.has(name) && !renamed.has(name));

    // Assert
    expect(withoutTarget.sort()).toEqual(PIP_LIST_TYPES_WITHOUT_TARGET);
  });
});

function listTypeRenames(script: string) {
  return [...valuesOf(script, "list_type_rename").matchAll(/\('([A-Z0-9_]+)', '([A-Z0-9_]+)'\)/g)].map(([, legacyName, name]) => ({
    legacyName,
    name
  }));
}

function pipListTypeNames(script: string) {
  return [...valuesOf(script, "legacy_list_type").matchAll(/\('([A-Z0-9_]+)'\)/g)].map(([, name]) => name);
}

function valuesOf(script: string, table: string) {
  const start = script.indexOf(`INSERT INTO ${table} VALUES`);
  if (start === -1) throw new Error(`no INSERT INTO ${table} in the script`);
  return script.slice(start, script.indexOf(";", start));
}
