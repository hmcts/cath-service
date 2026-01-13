import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";
import type { ParsedQs } from "qs";
import "@hmcts/auth";
import { prisma } from "@hmcts/postgres";
import { PROVENANCE_LABELS } from "@hmcts/publication";
import { validateSjpPressList } from "../validation/json-validator.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Navigate to monorepo root (from libs/list-types/sjp-press-list/src/pages/)
const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const TEMP_UPLOAD_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

/**
 * Parses query parameter as string array, filtering out non-string values
 */
function parseQueryAsStringArray(param: string | ParsedQs | (string | ParsedQs)[] | undefined): string[] {
  if (!param) return [];
  const items = Array.isArray(param) ? param : [param];
  return items.filter((item): item is string => typeof item === "string");
}

/**
 * Appends array values to URLSearchParams
 */
function appendArrayToParams(params: URLSearchParams, key: string, values: string | string[] | undefined, shouldTrim = false): void {
  if (!values) return;
  const items = Array.isArray(values) ? values : [values];
  for (const item of items) {
    const value = shouldTrim ? item.trim() : item;
    if (value) {
      params.append(key, value);
    }
  }
}

export const GET = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  // Skip authentication in development mode
  const isDevelopment = process.env.NODE_ENV !== "production";
  if (!isDevelopment && (!req.isAuthenticated() || req.user?.role !== "VERIFIED")) {
    return res.status(403).render("errors/403", {
      en,
      cy,
      locale,
      message: t.errorNotVerified
    });
  }

  const artefactId = req.query.artefactId as string;
  const page = Number.parseInt(req.query.page as string, 10) || 1;

  if (!artefactId) {
    return res.status(400).render("errors/400", {
      en,
      cy,
      locale
    });
  }

  try {
    // Get artefact metadata from database
    const artefact = await prisma.artefact.findUnique({
      where: { artefactId }
    });

    if (!artefact) {
      return res.status(404).render("errors/404", {
        en,
        cy,
        locale
      });
    }

    // Read and parse JSON file
    const jsonFilePath = path.join(TEMP_UPLOAD_DIR, `${artefactId}.json`);

    let jsonContent: string;
    try {
      jsonContent = await readFile(jsonFilePath, "utf-8");
    } catch (error) {
      console.error(`Error reading JSON file at ${jsonFilePath}:`, error);
      return res.status(404).render("errors/404", {
        en,
        cy,
        locale
      });
    }

    const jsonData = JSON.parse(jsonContent);

    // Validate JSON
    const validationResult = validateSjpPressList(jsonData);
    if (!validationResult.isValid) {
      console.error("Validation errors:", validationResult.errors);
      return res.status(400).render("errors/400", {
        en,
        cy,
        locale
      });
    }

    // Extract data from validated JSON (reuse existing utilities)
    const { calculatePagination, determineListType, extractPressCases } = await import("@hmcts/list-types-common");

    const listType = determineListType(jsonData);
    if (listType !== "press") {
      return res.status(404).render("errors/404", {
        en,
        cy,
        locale
      });
    }

    // Handle multiple prosecutors and postcodes from query string
    const selectedProsecutors = parseQueryAsStringArray(req.query.prosecutor);
    const selectedPostcodes = parseQueryAsStringArray(req.query.postcode);

    const filters = {
      searchQuery: req.query.search as string | undefined,
      postcodes: selectedPostcodes.length > 0 ? selectedPostcodes : undefined,
      prosecutors: selectedProsecutors.length > 0 ? selectedProsecutors : undefined
    };

    // Process cases directly from JSON
    let allCases = extractPressCases(jsonData);

    // Apply filters (inline implementation similar to sjp-service.ts)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      allCases = allCases.filter((c) => c.name.toLowerCase().includes(query) || c.reference?.toLowerCase().includes(query));
    }

    if (filters.postcodes && filters.postcodes.length > 0) {
      allCases = allCases.filter((c) => {
        if (!c.postcode) return false;
        return filters.postcodes?.some((selectedPostcode) => {
          if (selectedPostcode === "LONDON_POSTCODES") {
            const LONDON_POSTCODES = new Set(["E", "EC", "N", "NW", "SE", "SW", "W", "WC"]);
            for (const area of LONDON_POSTCODES) {
              if (c.postcode?.startsWith(area)) return true;
            }
            return false;
          }
          return c.postcode?.toLowerCase().startsWith(selectedPostcode.toLowerCase());
        });
      });
    }

    if (filters.prosecutors && filters.prosecutors.length > 0) {
      allCases = allCases.filter((c) => c.prosecutor && filters.prosecutors?.includes(c.prosecutor));
    }

    // Sort by name
    allCases.sort((a, b) => a.name.localeCompare(b.name));

    // Paginate
    const CASES_PER_PAGE = 200;
    const startIdx = (page - 1) * CASES_PER_PAGE;
    const cases = allCases.slice(startIdx, startIdx + CASES_PER_PAGE);
    const totalCases = allCases.length;

    // Get unique prosecutors and postcodes
    const prosecutors = Array.from(
      new Set(
        extractPressCases(jsonData)
          .map((c) => c.prosecutor)
          .filter((p): p is string => p !== null)
      )
    ).sort((a, b) => a.localeCompare(b));

    const allPostcodes = Array.from(
      new Set(
        extractPressCases(jsonData)
          .map((c) => c.postcode)
          .filter((p): p is string => p !== null)
      )
    ).sort((a, b) => a.localeCompare(b));
    const LONDON_POSTCODES = new Set(["E", "EC", "N", "NW", "SE", "SW", "W", "WC"]);
    const londonPostcodes = allPostcodes.filter((postcode) => {
      for (const area of LONDON_POSTCODES) {
        if (postcode.startsWith(area)) return true;
      }
      return false;
    });
    const hasLondonPostcodes = londonPostcodes.length > 0;

    const pagination = calculatePagination(page, totalCases, CASES_PER_PAGE);

    const list = {
      artefactId,
      listType: "press" as const,
      generatedAt: new Date(jsonData.document.publicationDate),
      publishedAt: new Date(jsonData.document.publicationDate),
      contentDate: artefact.contentDate,
      caseCount: extractPressCases(jsonData).length,
      locationId: Number.parseInt(artefact.locationId, 10)
    };

    const dataSource = PROVENANCE_LABELS[artefact.provenance] || artefact.provenance;

    res.render("sjp-press-list", {
      ...t,
      en,
      cy,
      locale,
      list,
      cases,
      prosecutors,
      postcodeAreas: allPostcodes,
      hasLondonPostcodes,
      londonPostcodes,
      pagination,
      filters: {
        searchQuery: filters.searchQuery,
        postcodes: selectedPostcodes,
        prosecutors: selectedProsecutors
      },
      errors: undefined,
      dataSource
    });
  } catch (error) {
    console.error("Error rendering SJP press list:", error);
    return res.status(500).render("errors/500", {
      en,
      cy,
      locale
    });
  }
};

export const POST = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  // Skip authentication in development mode
  const isDevelopment = process.env.NODE_ENV !== "production";
  if (!isDevelopment && (!req.isAuthenticated() || req.user?.role !== "VERIFIED")) {
    return res.status(403).render("errors/403", {
      en,
      cy,
      locale,
      message: t.errorNotVerified
    });
  }

  const artefactId = req.body.artefactId as string;

  const filters = {
    searchQuery: req.body.search?.trim(),
    postcodes: req.body.postcode,
    prosecutors: req.body.prosecutor
  };

  // Build query parameters
  const queryParams = new URLSearchParams({ artefactId });
  if (filters.searchQuery) queryParams.set("search", filters.searchQuery);
  appendArrayToParams(queryParams, "postcode", filters.postcodes, true);
  appendArrayToParams(queryParams, "prosecutor", filters.prosecutors);

  res.redirect(`/sjp-press-list?${queryParams.toString()}`);
};
