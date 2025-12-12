import type { SjpCasePress, SjpCasePublic } from "./sjp-service.js";

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
    forename?: string;
    middleName?: string;
    surname?: string;
    dateOfBirth?: string;
    address?: SjpAddress;
  };
  organisationDetails?: {
    name: string;
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
 * Examples: "BS8 1AB" -> "BS8", "M1 2AA" -> "M1", "EC1A 1BB" -> "EC1A"
 */
function extractPostcodeOutward(postcode: string | undefined): string | null {
  if (!postcode) return null;
  const trimmed = postcode.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex > 0) {
    return trimmed.substring(0, spaceIndex);
  }
  // If no space, check if it's already just the outward code
  const match = trimmed.match(/^[A-Z]{1,2}[0-9]{1,2}[A-Z]?$/);
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
  const prosecutor = parties.find((p) => p.partyRole === "PROSECUTOR");
  return prosecutor?.organisationDetails?.name || null;
}

/**
 * Formats the accused name from individual or organisation details
 */
function formatAccusedName(accused: SjpParty | undefined): string {
  if (!accused) return "Unknown";

  if (accused.individualDetails) {
    const { title, forename, middleName, surname } = accused.individualDetails;
    const parts = [title, forename, middleName, surname].filter(Boolean);
    return parts.join(" ");
  }

  if (accused.organisationDetails) {
    return accused.organisationDetails.name;
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
 * Parses date of birth string to Date object
 */
function parseDateOfBirth(dateString: string | undefined): Date | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Extracts the first offence title from offences array
 */
function extractOffenceTitle(offences: SjpOffence[]): string | null {
  return offences[0]?.offenceTitle || offences[0]?.offenceWording || null;
}

/**
 * Checks if any offence has a reporting restriction
 */
function hasReportingRestriction(offences: SjpOffence[]): boolean {
  return offences.some((o) => o.reportingRestriction === true);
}

/**
 * Transforms a hearing from the JSON structure into a case object
 */
function transformHearingToCase(hearing: SjpHearing): SjpCasePress {
  const accused = findAccused(hearing.party);
  const prosecutor = findProsecutor(hearing.party);
  const caseUrn = hearing.case[0]?.caseUrn || null;

  return {
    caseId: crypto.randomUUID(), // Generate temporary ID for in-memory operations
    name: formatAccusedName(accused),
    postcode: extractPostcode(accused),
    offence: extractOffenceTitle(hearing.offence),
    prosecutor,
    dateOfBirth: parseDateOfBirth(accused?.individualDetails?.dateOfBirth),
    reference: caseUrn,
    address: formatAddress(accused),
    reportingRestriction: hasReportingRestriction(hearing.offence)
  };
}

/**
 * Determines the list type based on available data in the JSON
 * Press lists include full details (DOB, address), public lists only include minimal info
 */
export function determineListType(json: SjpJson): "public" | "press" {
  // Check first hearing to see if it has press-only fields
  const firstHearing = json.courtLists[0]?.courtHouse?.courtRoom[0]?.session[0]?.sittings[0]?.hearing[0];
  if (!firstHearing) return "public";

  const accused = findAccused(firstHearing.party);
  const hasDateOfBirth = !!accused?.individualDetails?.dateOfBirth;
  const hasAddress = !!(accused?.individualDetails?.address || accused?.organisationDetails?.address);

  // Press lists typically include DOB and full addresses
  return hasDateOfBirth || hasAddress ? "press" : "public";
}

/**
 * Extracts all hearings from nested SJP JSON structure
 */
export function extractAllHearings(json: SjpJson): SjpHearing[] {
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
    offence: c.offence,
    prosecutor: c.prosecutor
  }));
}
