// Legacy SSO super-admin roles have no equivalent here. SSO re-derives the role from Entra
// group membership on every sign-in, so this value only matters until the user next signs in.
const ROLE_MAP: Record<string, string> = {
  VERIFIED: "VERIFIED",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC",
  INTERNAL_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL",
  INTERNAL_SUPER_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC",
  INTERNAL_SUPER_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL"
};

const USER_PROVENANCES = new Set(["PI_AAD", "SSO", "CFT_IDAM", "CRIME_IDAM"]);

const SEARCH_TYPE_MAP: Record<string, string> = {
  LOCATION_ID: "LOCATION_ID",
  CASE_NUMBER: "CASE_NUMBER",
  CASE_NAME: "CASE_NAME",
  CASE_ID: "CASE_NUMBER",
  // Unconfirmed: only correct if artefact_search.case_number holds URNs for crime lists.
  CASE_URN: "CASE_NUMBER"
};

// Legacy ListType enum names (pip-data-models) that were renamed in list-type-data.ts.
// Names present in both are matched as-is; anything else is rejected and reported.
const LIST_TYPE_RENAMES: Record<string, string> = {
  BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST: "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
  CST_WEEKLY_HEARING_LIST: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
  FTT_LR_WEEKLY_HEARING_LIST: "FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST",
  FTT_TAX_WEEKLY_HEARING_LIST: "FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST",
  INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST: "INTERIM_APPLICATIONS_DAILY_CAUSE_LIST",
  MAYOR_AND_CITY_CIVIL_DAILY_CAUSE_LIST: "MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST",
  RPT_EASTERN_WEEKLY_HEARING_LIST: "FTT_RPT_EASTERN_WEEKLY_HEARING_LIST",
  RPT_LONDON_WEEKLY_HEARING_LIST: "FTT_RPT_LONDON_WEEKLY_HEARING_LIST",
  RPT_MIDLANDS_WEEKLY_HEARING_LIST: "FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST",
  RPT_NORTHERN_WEEKLY_HEARING_LIST: "FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST",
  RPT_SOUTHERN_WEEKLY_HEARING_LIST: "FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST",
  UT_AAC_DAILY_HEARING_LIST: "UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST",
  UT_IAC_JR_BIRMINGHAM_DAILY_HEARING_LIST: "UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST",
  UT_IAC_JR_CARDIFF_DAILY_HEARING_LIST: "UTIAC_JR_CARDIFF_DAILY_HEARING_LIST",
  UT_IAC_JR_LEEDS_DAILY_HEARING_LIST: "UTIAC_JR_LEEDS_DAILY_HEARING_LIST",
  UT_IAC_JR_LONDON_DAILY_HEARING_LIST: "UTIAC_JR_LONDON_DAILY_HEARING_LIST",
  UT_IAC_JR_MANCHESTER_DAILY_HEARING_LIST: "UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST",
  UT_IAC_STATUTORY_APPEALS_DAILY_HEARING_LIST: "UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST",
  UT_LC_DAILY_HEARING_LIST: "UT_LANDS_CHAMBER_DAILY_HEARING_LIST",
  UT_T_AND_CC_DAILY_HEARING_LIST: "UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST",
  // Unconfirmed: legacy has both CROWN_*_LIST (Common Platform) and CROWN_*_PDDA_LIST,
  // while this service renamed its CROWN_*_LIST rows to the PDDA names.
  CROWN_DAILY_LIST: "CROWN_DAILY_PDDA_LIST",
  CROWN_FIRM_LIST: "CROWN_FIRM_PDDA_LIST",
  CROWN_WARNED_LIST: "CROWN_WARNED_PDDA_LIST"
};

export function mapRole(legacyRole: string | null): string | null {
  return legacyRole ? (ROLE_MAP[legacyRole] ?? null) : null;
}

export function isUserProvenance(legacyProvenance: string | null): boolean {
  return legacyProvenance !== null && USER_PROVENANCES.has(legacyProvenance);
}

// The new Crime IDAM sign-in namespaces its subject; the prefix has to match or the
// user is treated as new on first sign-in.
export function mapProvenanceUserId(legacyProvenance: string, legacyProvenanceUserId: string): string {
  return legacyProvenance === "CRIME_IDAM" ? `CRIME_IDAM:${legacyProvenanceUserId}` : legacyProvenanceUserId;
}

export function mapSearchType(legacySearchType: string): string | null {
  return SEARCH_TYPE_MAP[legacySearchType] ?? null;
}

export function mapListTypeName(legacyName: string): string {
  return LIST_TYPE_RENAMES[legacyName] ?? legacyName;
}

// listTypeIdByName is read per environment at run time; list type ids differ between environments.
export function resolveListTypeId(legacyName: string, listTypeIdByName: Map<string, number>): number | undefined {
  return listTypeIdByName.get(mapListTypeName(legacyName));
}

export function normaliseEmail(email: string | null): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}
