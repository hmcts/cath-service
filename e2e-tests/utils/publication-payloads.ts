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

export function loadListTypeFixture(fixture: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, `${fixture}.json`), "utf8"));
}

// Case names are pseudo-random alphanumerics because the xlsx zip container compresses repeated text to almost nothing
function buildBulkCivilAndFamilyPayload(hearingCount: number, caseNameLength: number): unknown {
  const random = createSeededRandom(910);
  const payload = loadListTypeFixture("civil-and-family-daily-cause-list") as CivilAndFamilyFixture;
  const sitting = payload.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0];
  const [templateHearing] = sitting.hearing;

  sitting.hearing = Array.from({ length: hearingCount }, (_, i) => ({
    ...templateHearing,
    case: [{ caseNumber: `BULK-${String(i + 1).padStart(5, "0")}`, caseName: randomAlphanumeric(random, caseNameLength) }]
  }));

  return payload;
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

interface CivilAndFamilyFixture {
  courtLists: { courtHouse: { courtRoom: { session: { sittings: { hearing: Record<string, unknown>[] }[] }[] }[] } }[];
}
