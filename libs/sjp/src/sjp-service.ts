import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@hmcts/postgres";
import type { SjpJson } from "./json-parser.js";
import { determineListType, extractCaseCount, extractPressCases, extractPublicCases } from "./json-parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Navigate to monorepo root (from libs/sjp/src/)
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..");
const TEMP_UPLOAD_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

const CASES_PER_PAGE = 50;

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
  searchQuery?: string;
  postcode?: string;
  prosecutor?: string;
}

/**
 * Reads and parses SJP JSON file from storage
 */
async function readSjpJson(artefactId: string): Promise<SjpJson> {
  const jsonPath = path.join(TEMP_UPLOAD_DIR, `${artefactId}.json`);
  const jsonContent = await readFile(jsonPath, "utf-8");
  return JSON.parse(jsonContent);
}

/**
 * Gets the latest SJP lists from the artefact table
 */
export async function getLatestSjpLists(): Promise<SjpListMetadata[]> {
  const artefacts = await prisma.artefact.findMany({
    where: {
      listTypeId: { in: [9, 10] } // SJP_PRESS_LIST (9), SJP_PUBLIC_LIST (10)
    },
    orderBy: { lastReceivedDate: "desc" },
    take: 10
  });

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

  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filteredCases = filteredCases.filter((c) => c.name.toLowerCase().includes(query) || c.reference?.toLowerCase().includes(query));
  }

  if (filters.postcode) {
    if (filters.postcode === "LONDON_POSTCODES") {
      // Filter for all London postcodes
      filteredCases = filteredCases.filter((c) => c.postcode && LONDON_POSTCODES.has(c.postcode));
    } else {
      const postcodeQuery = filters.postcode.toLowerCase();
      filteredCases = filteredCases.filter((c) => c.postcode?.toLowerCase().startsWith(postcodeQuery));
    }
  }

  if (filters.prosecutor) {
    filteredCases = filteredCases.filter((c) => c.prosecutor === filters.prosecutor);
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
  sortBy: string = "name",
  sortOrder: string = "asc"
): Promise<{ cases: SjpCasePublic[]; totalCases: number }> {
  const sjpData = await readSjpJson(artefactId);
  let allCases = extractPublicCases(sjpData);

  // Apply filters
  allCases = applyFilters(allCases as SjpCasePress[], filters) as SjpCasePublic[];

  // Sort
  const sortField = sortBy as keyof SjpCasePublic;
  allCases.sort((a, b) => {
    const aVal = a[sortField] || "";
    const bVal = b[sortField] || "";
    const comparison = String(aVal).localeCompare(String(bVal));
    return sortOrder === "asc" ? comparison : -comparison;
  });

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

  // Sort by name
  allCases.sort((a, b) => a.name.localeCompare(b.name));

  // Paginate
  const startIdx = (page - 1) * CASES_PER_PAGE;
  const paginatedCases = allCases.slice(startIdx, startIdx + CASES_PER_PAGE);

  return {
    cases: paginatedCases,
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
  return Array.from(prosecutors).sort();
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
  // Check if postcode starts with any London area code
  for (const area of LONDON_POSTCODES) {
    if (postcode.startsWith(area)) {
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
  const postcodesArray = Array.from(postcodes).sort();

  const londonPostcodes = postcodesArray.filter(isLondonPostcode);
  const hasLondonPostcodes = londonPostcodes.length > 0;

  return {
    hasLondonPostcodes,
    postcodes: postcodesArray,
    londonPostcodes
  };
}
