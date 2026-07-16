import { CONTAINER, downloadBlob } from "@hmcts/azure-blob";
import { prisma } from "@hmcts/postgres-prisma";
import type { SjpJson } from "./json-parser.js";
import { determineListType, extractCaseCount, extractPressCases } from "./json-parser.js";

const CASES_PER_PAGE = 1000;

export interface SjpListMetadata {
  artefactId: string;
  listType: "public" | "press";
  generatedAt: Date;
  publishedAt: Date;
  contentDate: Date;
  caseCount: number;
  locationId: number;
}

export interface SjpOffenceDetails {
  offenceTitle: string;
  offenceWording: string | null;
  reportingRestriction: boolean;
}

export interface SjpCasePublic {
  caseId: string;
  name: string;
  postcode: string | null;
  offence: string | null;
  prosecutor: string | null;
}

export interface SjpCasePress extends Omit<SjpCasePublic, "offence"> {
  dateOfBirth: Date | null;
  age: number | null;
  reference: string | null;
  address: string | null;
  offences: SjpOffenceDetails[];
}

export interface SjpSearchFilters {
  postcodes?: string[];
  prosecutors?: string[];
}

async function readSjpJson(artefactId: string): Promise<SjpJson> {
  const buffer = await downloadBlob(`${artefactId}.json`, CONTAINER.ARTEFACT);
  if (!buffer) {
    throw new Error(`SJP JSON not found in blob storage for artefact ${artefactId}`);
  }
  return JSON.parse(buffer.toString("utf-8"));
}

const SJP_LIST_NAMES = ["SJP_PRESS_LIST", "SJP_PUBLIC_LIST", "SJP_DELTA_PRESS_LIST", "SJP_DELTA_PUBLIC_LIST"];

async function getLatestSjpArtefacts() {
  const listTypes = await prisma.listType.findMany({
    where: { name: { in: SJP_LIST_NAMES } },
    select: { id: true }
  });
  const listTypeIds = listTypes.map((lt) => lt.id);
  return prisma.artefact.findMany({
    where: { listTypeId: { in: listTypeIds } },
    orderBy: { lastReceivedDate: "desc" },
    take: 10
  });
}

/**
 * Gets the latest SJP lists from the artefact table
 */
export async function getLatestSjpLists(): Promise<SjpListMetadata[]> {
  const artefacts = await getLatestSjpArtefacts();

  // Read metadata from each JSON file
  const lists = await Promise.all(
    artefacts.map(async (artefact) => {
      try {
        const sjpData = await readSjpJson(artefact.artefactId);

        return {
          artefactId: artefact.artefactId,
          listType: determineListType(sjpData),
          generatedAt: new Date(sjpData.document.publicationDate),
          publishedAt: new Date(sjpData.document.publicationDate),
          contentDate: artefact.contentDate,
          caseCount: extractCaseCount(sjpData),
          locationId: Number.parseInt(artefact.locationId, 10)
        };
      } catch (error) {
        console.error(`Error reading SJP JSON for artefact ${artefact.artefactId}:`, error);
        return null;
      }
    })
  );

  return lists.filter((list): list is SjpListMetadata => list !== null);
}

/**
 * Gets SJP list metadata by artefact ID
 */
export async function getSjpListById(artefactId: string): Promise<SjpListMetadata | null> {
  const artefact = await prisma.artefact.findUnique({
    where: { artefactId }
  });

  if (!artefact) return null;

  try {
    const sjpData = await readSjpJson(artefactId);

    return {
      artefactId,
      listType: determineListType(sjpData),
      generatedAt: new Date(sjpData.document.publicationDate),
      publishedAt: new Date(sjpData.document.publicationDate),
      contentDate: artefact.contentDate,
      caseCount: extractCaseCount(sjpData),
      locationId: Number.parseInt(artefact.locationId, 10)
    };
  } catch (error) {
    console.error(`Error reading SJP JSON for artefact ${artefactId}:`, error);
    return null;
  }
}

/**
 * Applies filters to cases in JavaScript
 */
function applyFilters(cases: SjpCasePress[], filters: SjpSearchFilters): SjpCasePress[] {
  let filteredCases = cases;

  if (filters.postcodes && filters.postcodes.length > 0) {
    filteredCases = filteredCases.filter((c) => {
      if (!c.postcode) return false;

      const postcode = c.postcode; // TypeScript type narrowing
      return filters.postcodes?.some((selectedPostcode) => {
        if (selectedPostcode === "LONDON_POSTCODES") {
          return isLondonPostcode(postcode);
        }
        return postcode.toLowerCase().startsWith(selectedPostcode.toLowerCase());
      });
    });
  }

  if (filters.prosecutors && filters.prosecutors.length > 0) {
    filteredCases = filteredCases.filter((c) => c.prosecutor && filters.prosecutors?.includes(c.prosecutor));
  }

  return filteredCases;
}

/**
 * Gets public SJP cases with filtering and pagination
 */
export async function getSjpPublicCases(
  artefactId: string,
  filters: SjpSearchFilters,
  page: number,
  sortBy: string = "",
  sortOrder: string = "asc"
): Promise<{ cases: SjpCasePublic[]; totalCases: number }> {
  const sjpData = await readSjpJson(artefactId);

  // Get press cases first, apply filters, then convert to public
  let pressCases = extractPressCases(sjpData);
  pressCases = applyFilters(pressCases, filters);

  // Convert to public cases
  const allCases = pressCases.map((c) => ({
    caseId: c.caseId,
    name: c.name,
    postcode: c.postcode,
    offence:
      c.offences
        .map((o) => o.offenceTitle || o.offenceWording)
        .filter(Boolean)
        .join(", ") || null,
    prosecutor: c.prosecutor
  }));

  // Sort only when a sort field is explicitly requested
  if (sortBy) {
    const sortField = sortBy as keyof SjpCasePublic;
    allCases.sort((a, b) => {
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }

  // Paginate
  const startIdx = (page - 1) * CASES_PER_PAGE;
  const paginatedCases = allCases.slice(startIdx, startIdx + CASES_PER_PAGE);

  return {
    cases: paginatedCases,
    totalCases: allCases.length
  };
}

/**
 * Gets press SJP cases with filtering and pagination
 */
export async function getSjpPressCases(artefactId: string, filters: SjpSearchFilters, page: number): Promise<{ cases: SjpCasePress[]; totalCases: number }> {
  const sjpData = await readSjpJson(artefactId);
  let allCases = extractPressCases(sjpData);

  // Apply filters
  allCases = applyFilters(allCases, filters);

  // Paginate
  const startIdx = (page - 1) * CASES_PER_PAGE;
  const paginatedCases = allCases.slice(startIdx, startIdx + CASES_PER_PAGE);

  return {
    cases: paginatedCases,
    totalCases: allCases.length
  };
}

/**
 * Gets all press SJP cases with filtering but without pagination
 * Used for CSV downloads where all cases are needed
 */
export async function getAllSjpPressCases(artefactId: string, filters: SjpSearchFilters): Promise<{ cases: SjpCasePress[]; totalCases: number }> {
  const sjpData = await readSjpJson(artefactId);
  let allCases = extractPressCases(sjpData);

  // Apply filters
  allCases = applyFilters(allCases, filters);

  return {
    cases: allCases,
    totalCases: allCases.length
  };
}

/**
 * Gets unique prosecutors from the list
 */
export async function getUniqueProsecutors(artefactId: string): Promise<string[]> {
  const sjpData = await readSjpJson(artefactId);
  const allCases = extractPressCases(sjpData);

  const prosecutors = new Set(allCases.map((c) => c.prosecutor).filter((p): p is string => p !== null));
  return Array.from(prosecutors).sort((a, b) => a.localeCompare(b));
}

/**
 * London postcode areas
 */
const LONDON_POSTCODES = new Set(["E", "EC", "N", "NW", "SE", "SW", "W", "WC"]);

/**
 * Checks if a postcode is a London postcode
 * Checks if the postcode starts with any London postcode area
 */
function isLondonPostcode(postcode: string): boolean {
  for (const area of LONDON_POSTCODES) {
    if (postcode.startsWith(area)) {
      // Single-letter areas (E, N, W) must be followed by a digit to avoid
      // matching non-London postcodes like NE (Newcastle), EH (Edinburgh), WR (Worcester)
      if (area.length === 1 && !/^\d/.test(postcode.slice(1))) {
        continue;
      }
      return true;
    }
  }
  return false;
}

/**
 * Gets unique postcode areas from the list, grouped with London postcodes first if present
 */
export async function getUniquePostcodes(artefactId: string): Promise<{
  hasLondonPostcodes: boolean;
  postcodes: string[];
  londonPostcodes: string[];
}> {
  const sjpData = await readSjpJson(artefactId);
  const allCases = extractPressCases(sjpData);

  const postcodes = new Set(allCases.map((c) => c.postcode).filter((p): p is string => p !== null));
  const postcodesArray = Array.from(postcodes).sort((a, b) => a.localeCompare(b));

  const londonPostcodes = postcodesArray.filter(isLondonPostcode);
  const hasLondonPostcodes = londonPostcodes.length > 0;

  return {
    hasLondonPostcodes,
    postcodes: postcodesArray,
    londonPostcodes
  };
}
