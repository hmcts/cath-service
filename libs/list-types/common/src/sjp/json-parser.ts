import type { SjpCasePress, SjpCasePublic } from "./sjp-service.js";

const DOB_FORMATS: Array<{ pattern: RegExp; order: "dmy" | "ymd" }> = [
  { pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: "dmy" },
  { pattern: /^(\d{4})-(\d{2})-(\d{2})$/, order: "ymd" },
  { pattern: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, order: "dmy" }
];

export interface SjpJson {
  document: {
    publicationDate: string;
  };
  courtLists: Array<{
    courtHouse: {
      courtRoom: Array<{
        session: Array<{
          sittings: Array<{
            hearing: Array<SjpHearing>;
          }>;
        }>;
      }>;
    };
  }>;
}

export interface SjpHearing {
  case: Array<{ caseUrn?: string }>;
  party: Array<SjpParty>;
  offence: Array<SjpOffence>;
}

export interface SjpParty {
  partyRole: string;
  individualDetails?: {
    title?: string;
    individualForenames?: string;
    individualMiddleName?: string;
    individualSurname?: string;
    dateOfBirth?: string;
    age?: number;
    address?: SjpAddress;
  };
  organisationDetails?: {
    organisationName: string;
    address?: SjpAddress;
  };
}

export interface SjpAddress {
  line?: string[];
  town?: string;
  county?: string;
  postCode?: string;
}

export interface SjpOffence {
  offenceTitle?: string;
  offenceWording?: string;
  reportingRestriction?: boolean;
}

/**
 * Extracts the postcode outward code (first part) from a full postcode
 * Examples: "SE23 6FH" -> "SE23", "M1 2AA" -> "M1", "EC1A 1BB" -> "EC1A"
 */
function extractPostcodeOutward(postcode: string | undefined): string | null {
  if (!postcode) return null;
  const trimmed = postcode.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex > 0) {
    return trimmed.substring(0, spaceIndex);
  }
  // If no space, check if it's already just the outward code
  // Made digits optional to support test postcodes like "AA"
  const regex = /^[A-Z]{1,2}\d{0,2}[A-Z]?$/;
  const match = regex.exec(trimmed);
  return match ? trimmed : null;
}

/**
 * Extracts accused party from hearing parties
 */
function findAccused(parties: SjpParty[]): SjpParty | undefined {
  return parties.find((p) => p.partyRole === "ACCUSED");
}

/**
 * Extracts prosecutor from hearing parties
 */
function findProsecutor(parties: SjpParty[]): string | null {
  const prosecutor = parties.find((p) => p.partyRole === "PROSECUTOR" || p.partyRole === "Prosecuter");
  return prosecutor?.organisationDetails?.organisationName || null;
}

/**
 * Formats the accused name from individual or organisation details
 */
function formatAccusedName(accused: SjpParty | undefined): string {
  if (!accused) return "Unknown";

  if (accused.individualDetails) {
    const { title, individualForenames, individualMiddleName, individualSurname } = accused.individualDetails;
    const parts = [title, individualForenames, individualMiddleName, individualSurname].filter(Boolean);
    return parts.join(" ");
  }

  if (accused.organisationDetails) {
    return accused.organisationDetails.organisationName;
  }

  return "Unknown";
}

/**
 * Formats the address from individual or organisation details
 */
function formatAddress(accused: SjpParty | undefined): string | null {
  if (!accused) return null;

  const address = accused.individualDetails?.address || accused.organisationDetails?.address;
  if (!address) return null;

  const parts = [...(address.line || []), address.town, address.county, address.postCode].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Extracts postcode from address
 */
function extractPostcode(accused: SjpParty | undefined): string | null {
  if (!accused) return null;
  const address = accused.individualDetails?.address || accused.organisationDetails?.address;
  return extractPostcodeOutward(address?.postCode);
}

/**
 * Trims the date of birth as sent, treating empty or whitespace-only values as missing
 */
function normaliseRawDateOfBirth(dateString: string | undefined): string | null {
  const trimmed = dateString?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Parses a date of birth string to a local-midnight Date.
 * Accepts d/M/yyyy, yyyy-MM-dd and d-M-yyyy (read day first) only. Returns null for
 * anything else, including dates that don't exist such as 31/02/1990, so it never
 * returns a different date from the one sent.
 */
function parseDateOfBirth(dateString: string | null): Date | null {
  if (!dateString) return null;

  for (const { pattern, order } of DOB_FORMATS) {
    const match = pattern.exec(dateString);
    if (!match) continue;

    const [first, second, third] = match.slice(1).map(Number);
    const [year, month, day] = order === "ymd" ? [first, second, third] : [third, second, first];
    const date = new Date(year, month - 1, day);
    const isSameDate = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return isSameDate ? date : null;
  }

  return null;
}

/**
 * Extracts all offence details for press lists
 */
function extractOffenceDetails(offences: SjpOffence[]): Array<{ offenceTitle: string; offenceWording: string | null; reportingRestriction: boolean }> {
  return offences.map((offence) => ({
    offenceTitle: offence.offenceTitle || "",
    offenceWording: offence.offenceWording || null,
    reportingRestriction: offence.reportingRestriction || false
  }));
}

/**
 * Transforms a hearing from the JSON structure into a case object
 */
function transformHearingToCase(hearing: SjpHearing): SjpCasePress {
  const accused = findAccused(hearing.party);
  const prosecutor = findProsecutor(hearing.party);
  const caseUrn = hearing.case?.[0]?.caseUrn || null;
  const rawDateOfBirth = normaliseRawDateOfBirth(accused?.individualDetails?.dateOfBirth);

  return {
    caseId: crypto.randomUUID(), // Generate temporary ID for in-memory operations
    name: formatAccusedName(accused),
    postcode: extractPostcode(accused),
    prosecutor,
    dateOfBirth: parseDateOfBirth(rawDateOfBirth),
    rawDateOfBirth,
    age: accused?.individualDetails?.age ?? null,
    reference: caseUrn,
    address: formatAddress(accused),
    offences: extractOffenceDetails(hearing.offence)
  };
}

/**
 * Determines the list type based on available data in the JSON
 * Press lists include full details (DOB, address), public lists only include minimal info
 */
export function determineListType(json: SjpJson): "public" | "press" {
  // Handle empty courtLists
  if (!json.courtLists || json.courtLists.length === 0) {
    return "public";
  }

  // Check first hearing to see if it has press-only fields
  const firstHearing = json.courtLists[0]?.courtHouse?.courtRoom[0]?.session[0]?.sittings[0]?.hearing[0];
  if (!firstHearing) return "public";

  const accused = findAccused(firstHearing.party);
  const hasDateOfBirth = !!accused?.individualDetails?.dateOfBirth;

  // Press lists include DOB (date of birth is the key differentiator)
  // Public lists can have addresses (postcodes) but not DOB
  return hasDateOfBirth ? "press" : "public";
}

/**
 * Extracts all hearings from nested SJP JSON structure
 */
export function extractAllHearings(json: SjpJson): SjpHearing[] {
  // Handle empty courtLists
  if (!json.courtLists || json.courtLists.length === 0) {
    return [];
  }

  const hearings: SjpHearing[] = [];
  for (const courtList of json.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          hearings.push(...sitting.hearing);
        }
      }
    }
  }
  return hearings;
}

/**
 * Extracts case count from SJP JSON
 */
export function extractCaseCount(json: SjpJson): number {
  return extractAllHearings(json).length;
}

/**
 * Transforms all hearings into case objects (full press data)
 */
export function extractPressCases(json: SjpJson): SjpCasePress[] {
  const hearings = extractAllHearings(json);
  return hearings.map(transformHearingToCase);
}

/**
 * Transforms hearings into public case objects (minimal data)
 */
export function extractPublicCases(json: SjpJson): SjpCasePublic[] {
  const pressCases = extractPressCases(json);
  // Convert to public format by removing press-only fields
  return pressCases.map((c) => ({
    caseId: c.caseId,
    name: c.name,
    postcode: c.postcode,
    offence: c.offences[0]?.offenceTitle || c.offences[0]?.offenceWording || null,
    prosecutor: c.prosecutor
  }));
}
