import { describe, expect, it } from "vitest";
import { listTypeData } from "./list-type-data.js";

interface ReferenceEntry {
  name: string;
  allowedProvenances: string[];
  isDeprecated: boolean;
}

// Snapshot of the shared model — pip-data-models ListType.java (102 entries).
// `allowedProvenances` is the 2nd constructor arg (List.of(...)); `isDeprecated` the 4th
// positional boolean. Embedded here (rather than read from disk) so the test is self-contained
// and cannot break on a missing planning artifact. Update in lock-step with the upstream enum.
// Source: https://github.com/hmcts/pip-data-models/blob/master/src/main/java/uk/gov/hmcts/reform/pip/model/publication/ListType.java
const REFERENCE_LIST_TYPES: ReferenceEntry[] = [
  { name: "SJP_PUBLIC_LIST", allowedProvenances: ["PI_AAD"], isDeprecated: false },
  { name: "SJP_DELTA_PUBLIC_LIST", allowedProvenances: ["PI_AAD"], isDeprecated: false },
  { name: "SJP_PRESS_LIST", allowedProvenances: ["PI_AAD"], isDeprecated: false },
  { name: "SJP_DELTA_PRESS_LIST", allowedProvenances: ["PI_AAD"], isDeprecated: false },
  { name: "SJP_PRESS_REGISTER", allowedProvenances: ["PI_AAD"], isDeprecated: false },
  { name: "CROWN_DAILY_LIST", allowedProvenances: ["CRIME_IDAM"], isDeprecated: true },
  { name: "CROWN_FIRM_LIST", allowedProvenances: ["CRIME_IDAM"], isDeprecated: true },
  { name: "CROWN_WARNED_LIST", allowedProvenances: ["CRIME_IDAM"], isDeprecated: true },
  { name: "MAGISTRATES_PUBLIC_LIST", allowedProvenances: ["CRIME_IDAM", "PI_AAD"], isDeprecated: false },
  { name: "MAGISTRATES_STANDARD_LIST", allowedProvenances: ["CRIME_IDAM", "PI_AAD"], isDeprecated: false },
  { name: "CIVIL_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "FAMILY_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "COP_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "ET_FORTNIGHTLY_PRESS_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "ET_DAILY_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "SSCS_DAILY_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "SSCS_DAILY_LIST_ADDITIONAL_HEARINGS", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "IAC_DAILY_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "IAC_DAILY_LIST_ADDITIONAL_CASES", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "CARE_STANDARDS_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: true },
  { name: "PRIMARY_HEALTH_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: true },
  { name: "CIC_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: true },
  { name: "CST_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "PHT_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "GRC_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "WPAFCC_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "UT_IAC_JR_LONDON_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "UT_IAC_JR_LEEDS_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "UT_IAC_JR_MANCHESTER_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "UT_IAC_JR_BIRMINGHAM_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "UT_IAC_JR_CARDIFF_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "UT_IAC_STATUTORY_APPEALS_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "SIAC_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "POAC_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "PAAC_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "FTT_TAX_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "FTT_LR_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "UT_T_AND_CC_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "UT_LC_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "UT_AAC_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "RPT_LONDON_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "RPT_EASTERN_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "RPT_MIDLANDS_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "RPT_NORTHERN_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "RPT_SOUTHERN_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "AST_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "SSCS_MIDLANDS_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "SSCS_SOUTH_EAST_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "SSCS_SCOTLAND_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "SSCS_NORTH_EAST_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "SSCS_NORTH_WEST_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "SSCS_LONDON_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "MENTAL_HEALTH_TRIBUNAL_HEARING_LIST", allowedProvenances: ["PI_AAD"], isDeprecated: false },
  { name: "LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST", allowedProvenances: ["CRIME_IDAM"], isDeprecated: false },
  { name: "FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "MAYOR_AND_CITY_CIVIL_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "INTELLECTUAL_PROPERTY_AND_ENTERPRISE_COURT_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "LONDON_CIRCUIT_COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "PATENTS_COURT_CHD_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "PENSIONS_LIST_CHD_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "PROPERTY_TRUSTS_PROBATE_LIST_CHD_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "REVENUE_LIST_CHD_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "BUSINESS_LIST_CHD_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "COMPETITION_LIST_CHD_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "PCOL_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "SEND_DAILY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "CIC_WEEKLY_HEARING_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "MAGISTRATES_ADULT_COURT_LIST_DAILY", allowedProvenances: ["CRIME_IDAM", "PI_AAD"], isDeprecated: false },
  { name: "MAGISTRATES_ADULT_COURT_LIST_FUTURE", allowedProvenances: ["CRIME_IDAM", "PI_AAD"], isDeprecated: false },
  { name: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY", allowedProvenances: ["CRIME_IDAM", "PI_AAD"], isDeprecated: false },
  { name: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE", allowedProvenances: ["CRIME_IDAM", "PI_AAD"], isDeprecated: false },
  { name: "CROWN_DAILY_PDDA_LIST", allowedProvenances: ["CRIME_IDAM", "PI_AAD"], isDeprecated: false },
  { name: "CROWN_FIRM_PDDA_LIST", allowedProvenances: ["CRIME_IDAM", "PI_AAD"], isDeprecated: false },
  { name: "CROWN_WARNED_PDDA_LIST", allowedProvenances: ["CRIME_IDAM", "PI_AAD"], isDeprecated: false },
  { name: "HIGH_COURT_CIVIL_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "HIGH_COURT_FAMILY_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false },
  { name: "TECHNOLOGY_AND_CONSTRUCTION_COURT_DAILY_CAUSE_LIST", allowedProvenances: ["CFT_IDAM"], isDeprecated: false }
];

const referenceByName = new Map(REFERENCE_LIST_TYPES.map((e) => [e.name, e]));

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
