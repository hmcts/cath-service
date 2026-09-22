import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listTypeData } from "./list-type-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REFERENCE_PATH = path.resolve(__dirname, "../../../../docs/tickets/698/reference-list-types.json");

interface ReferenceEntry {
  name: string;
  allowedProvenances: string[];
  isDeprecated: boolean;
}

const reference: { listTypes: ReferenceEntry[] } = JSON.parse(readFileSync(REFERENCE_PATH, "utf8"));
const referenceByName = new Map(reference.listTypes.map((e) => [e.name, e]));

// 19 name divergences: ours -> shared-model name. All agree on CFT_IDAM.
// Doubles as the rename-follow-up checklist (out of scope for this ticket; name is the stable key).
const NAME_ALIASES: Record<string, string> = {
  BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: "BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST: "CST_WEEKLY_HEARING_LIST",
  FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST: "FTT_LR_WEEKLY_HEARING_LIST",
  FTT_RPT_EASTERN_WEEKLY_HEARING_LIST: "RPT_EASTERN_WEEKLY_HEARING_LIST",
  FTT_RPT_LONDON_WEEKLY_HEARING_LIST: "RPT_LONDON_WEEKLY_HEARING_LIST",
  FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST: "RPT_MIDLANDS_WEEKLY_HEARING_LIST",
  FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST: "RPT_NORTHERN_WEEKLY_HEARING_LIST",
  FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST: "RPT_SOUTHERN_WEEKLY_HEARING_LIST",
  FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST: "FTT_TAX_WEEKLY_HEARING_LIST",
  MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST: "MAYOR_AND_CITY_CIVIL_DAILY_CAUSE_LIST",
  UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST: "UT_IAC_JR_BIRMINGHAM_DAILY_HEARING_LIST",
  UTIAC_JR_CARDIFF_DAILY_HEARING_LIST: "UT_IAC_JR_CARDIFF_DAILY_HEARING_LIST",
  UTIAC_JR_LEEDS_DAILY_HEARING_LIST: "UT_IAC_JR_LEEDS_DAILY_HEARING_LIST",
  UTIAC_JR_LONDON_DAILY_HEARING_LIST: "UT_IAC_JR_LONDON_DAILY_HEARING_LIST",
  UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST: "UT_IAC_JR_MANCHESTER_DAILY_HEARING_LIST",
  UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST: "UT_IAC_STATUTORY_APPEALS_DAILY_HEARING_LIST",
  UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST: "UT_AAC_DAILY_HEARING_LIST",
  UT_LANDS_CHAMBER_DAILY_HEARING_LIST: "UT_LC_DAILY_HEARING_LIST",
  UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST: "UT_T_AND_CC_DAILY_HEARING_LIST"
};

// Shared-model list types not ported to CaTH. Out of scope per the ticket — each would need
// its own schema/validation/render/PDF work. Recorded here so parity is explicit.
// The 22 genuine gaps plus the 3 deprecated-and-superseded entries that must stay absent.
const DEPRECATED_SUPERSEDED = ["CARE_STANDARDS_LIST", "PRIMARY_HEALTH_LIST", "CIC_DAILY_HEARING_LIST"];
const KNOWN_GAPS = [
  "ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST",
  "BUSINESS_LIST_CHD_DAILY_CAUSE_LIST",
  "CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST",
  "COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST",
  "COMPETITION_LIST_CHD_DAILY_CAUSE_LIST",
  "CROWN_DAILY_PDDA_LIST",
  "CROWN_FIRM_PDDA_LIST",
  // CROWN_WARNED_PDDA_LIST is contested with #957 (which renames our list to CROWN_ADVANCED_PDDA_LIST,
  // a name absent from the shared model). It must carry ["CRIME_IDAM", "PI_AAD"] when it lands.
  "CROWN_WARNED_PDDA_LIST",
  "INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST",
  "INTELLECTUAL_PROPERTY_AND_ENTERPRISE_COURT_DAILY_CAUSE_LIST",
  "INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST",
  "INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST",
  "LONDON_CIRCUIT_COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST",
  "PATENTS_COURT_CHD_DAILY_CAUSE_LIST",
  "PENSIONS_LIST_CHD_DAILY_CAUSE_LIST",
  "PROPERTY_TRUSTS_PROBATE_LIST_CHD_DAILY_CAUSE_LIST",
  "REVENUE_LIST_CHD_DAILY_CAUSE_LIST",
  "SJP_PRESS_REGISTER",
  "SSCS_DAILY_LIST",
  "SSCS_DAILY_LIST_ADDITIONAL_HEARINGS",
  "TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST",
  "TECHNOLOGY_AND_CONSTRUCTION_COURT_DAILY_CAUSE_LIST",
  ...DEPRECATED_SUPERSEDED
];

// PHT_WEEKLY_HEARING_LIST MANUAL_UPLOAD -> CFT_IDAM sign-off was granted, so PHT passes parity
// normally and this map is empty. Any recorded divergence would be { ours, reference, reason }.
const ALLOWED_DIVERGENCES: Record<string, { ours: string[]; reference: string[]; reason: string }> = {};

function resolveReferenceName(ourName: string): string {
  return NAME_ALIASES[ourName] ?? ourName;
}

describe("list-type-data provenance parity with shared model", () => {
  it("every list type's provenances match the shared model (or is a recorded divergence)", () => {
    const mismatches: string[] = [];

    for (const lt of listTypeData) {
      if (ALLOWED_DIVERGENCES[lt.name]) {
        continue;
      }

      const refName = resolveReferenceName(lt.name);
      const ref = referenceByName.get(refName);

      if (!ref) {
        mismatches.push(`${lt.name}: no reference entry found (resolved to "${refName}")`);
        continue;
      }

      const ours = [...lt.provenance].sort();
      const theirs = [...ref.allowedProvenances].sort();
      if (JSON.stringify(ours) !== JSON.stringify(theirs)) {
        mismatches.push(`${lt.name}: ours=[${ours.join(",")}] reference=[${theirs.join(",")}]`);
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("the four magistrates adult court lists allow both CRIME_IDAM and PI_AAD", () => {
    const names = [
      "MAGISTRATES_ADULT_COURT_LIST_DAILY",
      "MAGISTRATES_ADULT_COURT_LIST_FUTURE",
      "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY",
      "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE"
    ];

    for (const name of names) {
      const lt = listTypeData.find((l) => l.name === name);
      expect(lt, name).toBeDefined();
      expect([...(lt?.provenance ?? [])].sort()).toEqual(["CRIME_IDAM", "PI_AAD"]);
    }
  });

  it("PHT_WEEKLY_HEARING_LIST provenance is CFT_IDAM (MANUAL_UPLOAD data error fixed)", () => {
    const pht = listTypeData.find((l) => l.name === "PHT_WEEKLY_HEARING_LIST");
    expect(pht?.provenance).toEqual(["CFT_IDAM"]);
  });

  it("known-gap list types (including deprecated-superseded) stay absent from CaTH", () => {
    const ourNames = new Set(listTypeData.map((l) => l.name));
    const present = KNOWN_GAPS.filter((name) => ourNames.has(name));
    expect(present).toEqual([]);
  });

  it("does not declare MANUAL_UPLOAD as a provenance for any list type", () => {
    const offenders = listTypeData.filter((l) => l.provenance.includes("MANUAL_UPLOAD")).map((l) => l.name);
    expect(offenders).toEqual([]);
  });
});
