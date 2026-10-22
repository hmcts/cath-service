import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(__dirname, "../fixtures/list-types");

export const NOTIFY_ATTACHMENT_LIMIT_BYTES = 2 * 1024 * 1024;
// Default MAX_PDF_PAYLOAD_KB gate; payloads at or above it get no PDF but still get an Excel
export const PDF_PAYLOAD_GATE_BYTES = 256 * 1024;

const OVERSIZE_HEARING_COUNT = 2000;
const OVERSIZE_CASE_NAME_LENGTH = 2000;
const EXCEL_ONLY_HEARING_COUNT = 400;
const EXCEL_ONLY_CASE_NAME_LENGTH = 1000;
const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * One row per list type that can be published as JSON through POST /publication.
 * Adding a list type means adding a row here and, if its schema is new, a fixture in
 * fixtures/list-types/<package>.json copied from the package's json-validator.test.ts VALID_DATA.
 *
 * Regional and court variants that share a package (RCJ, administrative court, SSCS, SIAC/POAC/PAAC,
 * FTT RPT) run one row per package in the PR gate and the remaining variants @nightly: they differ
 * only in list type name, so the first row already exercises the package's generators and template.
 *
 * The SJP_EXCEL_ONLY template is covered by the Excel-only test using buildExcelOnlyCivilAndFamilyPayload.
 * The exact 2 MB boundary is covered by unit tests in
 * libs/notifications/src/notification/notification-service.test.ts.
 */
export const EMAIL_LINK_CASES: EmailLinkCase[] = [
  // PDF and Excel generated from JSON: SUBSCRIPTION_PDF_EXCEL template
  pdfAndExcel("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST", "civil-and-family-daily-cause-list"),
  pdfAndExcel("CIVIL_DAILY_CAUSE_LIST", "civil-daily-cause-list"),
  pdfAndExcel("FAMILY_DAILY_CAUSE_LIST", "family-daily-cause-list"),
  pdfAndExcel("MAGISTRATES_PUBLIC_LIST", "magistrates-public-list"),
  pdfAndExcel("MAGISTRATES_STANDARD_LIST", "magistrates-standard-list"),
  pdfAndExcel("MAGISTRATES_ADULT_COURT_LIST_DAILY", "magistrates-adult-court-list"),
  pdfAndExcel("MAGISTRATES_ADULT_COURT_LIST_FUTURE", "magistrates-adult-court-list"),
  pdfAndExcel("MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY", "magistrates-public-adult-court-list"),
  pdfAndExcel("MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE", "magistrates-public-adult-court-list"),
  pdfAndExcel("CROWN_DAILY_PDDA_LIST", "crown-daily-list"),
  pdfAndExcel("CROWN_FIRM_PDDA_LIST", "crown-firm-list"),
  pdfAndExcel("CROWN_ADVANCED_PDDA_LIST", "crown-advanced-pdda-list"),
  pdfAndExcel("UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST", "utiac-statutory-appeal-daily-hearing-list"),
  pdfAndExcel("UTIAC_JR_LONDON_DAILY_HEARING_LIST", "utiac-jr-daily-hearing-list"),
  pdfAndExcel("UTIAC_JR_LEEDS_DAILY_HEARING_LIST", "utiac-jr-daily-hearing-list"),
  pdfAndExcel("UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST", "utiac-jr-daily-hearing-list"),
  pdfAndExcel("UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST", "utiac-jr-daily-hearing-list"),
  pdfAndExcel("UTIAC_JR_CARDIFF_DAILY_HEARING_LIST", "utiac-jr-daily-hearing-list"),
  pdfAndExcel("UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST", "upper-tribunal-tax-and-chancery-chamber-daily-hearing-list"),
  pdfAndExcel("UT_LANDS_CHAMBER_DAILY_HEARING_LIST", "upper-tribunal-lands-chamber-daily-hearing-list"),
  pdfAndExcel("UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST", "upper-tribunal-administrative-appeals-chamber-daily-hearing-list"),
  // SJP types are not in EMAIL_BUILDER_REGISTRY; they use the fallback email builder with the same template selection
  pdfAndExcel("SJP_PUBLIC_LIST", "sjp-public-list"),
  pdfAndExcel("SJP_DELTA_PUBLIC_LIST", "sjp-public-list"),
  pdfAndExcel("SJP_PRESS_LIST", "sjp-press-list"),
  pdfAndExcel("SJP_DELTA_PRESS_LIST", "sjp-press-list"),
  // SSCS reformats an uploaded workbook when there is one, otherwise it generates the Excel from JSON
  pdfAndExcel("SSCS_LONDON_DAILY_HEARING_LIST", "sscs-daily-hearing-list"),
  nightly(pdfAndExcel("SSCS_MIDLANDS_DAILY_HEARING_LIST", "sscs-daily-hearing-list")),
  nightly(pdfAndExcel("SSCS_SOUTH_EAST_DAILY_HEARING_LIST", "sscs-daily-hearing-list")),
  nightly(pdfAndExcel("SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST", "sscs-daily-hearing-list")),
  nightly(pdfAndExcel("SSCS_SCOTLAND_DAILY_HEARING_LIST", "sscs-daily-hearing-list")),
  nightly(pdfAndExcel("SSCS_NORTH_EAST_DAILY_HEARING_LIST", "sscs-daily-hearing-list")),
  nightly(pdfAndExcel("SSCS_NORTH_WEST_DAILY_HEARING_LIST", "sscs-daily-hearing-list")),

  // Uploaded-Excel generators: a JSON publication never carries an uploaded Excel, so only the PDF exists
  pdfOnly("LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", "london-administrative-court-daily-cause-list"),
  pdfOnly("COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST", "court-of-appeal-civil-daily-cause-list"),
  pdfOnly("CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST", "rcj-standard-daily-cause-list"),
  nightly(pdfOnly("COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST", "rcj-standard-daily-cause-list")),
  nightly(pdfOnly("COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST", "rcj-standard-daily-cause-list")),
  nightly(pdfOnly("FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST", "rcj-standard-daily-cause-list")),
  nightly(pdfOnly("KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST", "rcj-standard-daily-cause-list")),
  nightly(pdfOnly("KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST", "rcj-standard-daily-cause-list")),
  nightly(pdfOnly("MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST", "rcj-standard-daily-cause-list")),
  nightly(pdfOnly("SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST", "rcj-standard-daily-cause-list")),

  // No Excel generator: NON_SJP_PDF template
  pdfOnly("ET_DAILY_LIST", "et-daily-list"),
  pdfOnly("ET_FORTNIGHTLY_PRESS_LIST", "et-fortnightly-list"),
  pdfOnly("COP_DAILY_CAUSE_LIST", "cop-daily-cause-list"),
  pdfOnly("CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST", "care-standards-tribunal-weekly-hearing-list"),
  pdfOnly("SEND_DAILY_HEARING_LIST", "send-daily-hearing-list"),
  pdfOnly("CIC_WEEKLY_HEARING_LIST", "cic-weekly-hearing-list"),
  pdfOnly("AST_DAILY_HEARING_LIST", "ast-daily-hearing-list"),
  pdfOnly("PHT_WEEKLY_HEARING_LIST", "pht-weekly-hearing-list"),
  pdfOnly("IAC_DAILY_LIST", "iac-daily-list"),
  pdfOnly("IAC_DAILY_LIST_ADDITIONAL_CASES", "iac-daily-list"),
  pdfOnly("BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST", "business-and-property-division-rolls-building-daily-cause-list"),
  pdfOnly("INTERIM_APPLICATIONS_DAILY_CAUSE_LIST", "interim-applications-daily-cause-list"),
  pdfOnly("FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST", "ftt-tax-chamber-weekly-hearing-list"),
  pdfOnly("FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST", "ftt-lands-registration-tribunal-weekly-hearing-list"),
  pdfOnly("GRC_WEEKLY_HEARING_LIST", "grc-weekly-hearing-list"),
  pdfOnly("WPAFCC_WEEKLY_HEARING_LIST", "wpafcc-weekly-hearing-list"),
  pdfOnly("BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", "administrative-court-daily-cause-list"),
  nightly(pdfOnly("LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", "administrative-court-daily-cause-list")),
  nightly(pdfOnly("BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", "administrative-court-daily-cause-list")),
  nightly(pdfOnly("MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST", "administrative-court-daily-cause-list")),
  pdfOnly("SIAC_WEEKLY_HEARING_LIST", "siac-poac-paac-weekly-hearing-list"),
  nightly(pdfOnly("POAC_WEEKLY_HEARING_LIST", "siac-poac-paac-weekly-hearing-list")),
  nightly(pdfOnly("PAAC_WEEKLY_HEARING_LIST", "siac-poac-paac-weekly-hearing-list")),
  pdfOnly("FTT_RPT_EASTERN_WEEKLY_HEARING_LIST", "ftt-rpt-weekly-hearing-list"),
  nightly(pdfOnly("FTT_RPT_LONDON_WEEKLY_HEARING_LIST", "ftt-rpt-weekly-hearing-list")),
  nightly(pdfOnly("FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST", "ftt-rpt-weekly-hearing-list")),
  nightly(pdfOnly("FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST", "ftt-rpt-weekly-hearing-list")),
  nightly(pdfOnly("FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST", "ftt-rpt-weekly-hearing-list")),
  nightly(pdfOnly("FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST", "ftt-rpt-weekly-hearing-list"))
];

// Each generated file the template links becomes one distinct Notify document link
export function expectedLinkCount(expectedFiles: StoredFileExtension[]): number {
  return expectedFiles.length;
}

/**
 * A Civil and Family payload whose generated Excel is well over the Notify 2 MB attachment limit.
 * The source payload is above the 256 KB PDF payload gate (MAX_PDF_PAYLOAD_KB) but below the 10 MB
 * Excel gate, so only the Excel is generated.
 */
export function buildOversizedCivilAndFamilyPayload(): unknown {
  return buildBulkCivilAndFamilyPayload(OVERSIZE_HEARING_COUNT, OVERSIZE_CASE_NAME_LENGTH);
}

/**
 * A Civil and Family payload just over the 256 KB PDF payload gate whose generated Excel stays well
 * under the Notify 2 MB attachment limit, so the email links the Excel alone (SJP_EXCEL_ONLY template).
 */
export function buildExcelOnlyCivilAndFamilyPayload(): unknown {
  return buildBulkCivilAndFamilyPayload(EXCEL_ONLY_HEARING_COUNT, EXCEL_ONLY_CASE_NAME_LENGTH);
}

function pdfAndExcel(listTypeName: string, fixture: string): EmailLinkCase {
  return { listTypeName, buildPayload: () => loadFixture(fixture), expectedFiles: [".pdf", ".xlsx"] };
}

function pdfOnly(listTypeName: string, fixture: string): EmailLinkCase {
  return { listTypeName, buildPayload: () => loadFixture(fixture), expectedFiles: [".pdf"] };
}

// Case names are pseudo-random alphanumerics because the xlsx zip container compresses repeated text to almost nothing
function buildBulkCivilAndFamilyPayload(hearingCount: number, caseNameLength: number): unknown {
  const random = createSeededRandom(910);
  const payload = loadFixture("civil-and-family-daily-cause-list") as CivilAndFamilyFixture;
  const sitting = payload.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
  const [templateHearing] = sitting.hearing;

  sitting.hearing = Array.from({ length: hearingCount }, (_, i) => ({
    ...templateHearing,
    case: [{ caseNumber: `BULK-${String(i + 1).padStart(5, "0")}`, caseName: randomAlphanumeric(random, caseNameLength) }]
  }));

  return payload;
}

function nightly(emailCase: EmailLinkCase): EmailLinkCase {
  return { ...emailCase, nightly: true };
}

function loadFixture(fixture: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, `${fixture}.json`), "utf8"));
}

// Deterministic so each bulk payload, and therefore its stored size, is the same on every run
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomAlphanumeric(random: () => number, length: number): string {
  return Array.from({ length }, () => ALPHANUMERIC[Math.floor(random() * ALPHANUMERIC.length)]).join("");
}

export type StoredFileExtension = ".pdf" | ".xlsx";

export interface EmailLinkCase {
  listTypeName: string;
  buildPayload: () => unknown;
  expectedFiles: StoredFileExtension[];
  // Moves a row out of the PR gate into the nightly run
  nightly?: true;
}

interface CivilAndFamilyFixture {
  courtLists: { courtHouse: { courtRoom: { session: { sittings: { hearing: Record<string, unknown>[] }[] }[] }[] } }[];
}
