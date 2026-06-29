import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculatePagination, determineListType, extractPressCases, type SjpJson } from "@hmcts/list-types-common";
import { prisma } from "@hmcts/postgres-prisma";
import { getPublicationJson, PROVENANCE_LABELS } from "@hmcts/publication";
import { sjpPressListCy as cy, sjpPressListEn as en, validateSjpPressList } from "@hmcts/sjp-press-list";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ParsedQs } from "qs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONOREPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..", "..");
const TEMP_UPLOAD_DIR = path.join(MONOREPO_ROOT, "storage", "temp", "uploads");
const CASES_PER_PAGE = 1000;
const LONDON_POSTCODE_AREAS = new Set(["E", "EC", "N", "NW", "SE", "SW", "W", "WC"]);

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const artefactId = req.query.artefactId as string;
  const page = Number.parseInt(req.query.page as string, 10) || 1;
  const showFilter = req.query.showFilter === "true";

  if (!artefactId) {
    return res.status(400).render("errors/400", { en, cy, locale });
  }

  try {
    const artefact = await prisma.artefact.findUnique({ where: { artefactId } });
    if (!artefact) {
      return res.status(404).render("errors/404", { en, cy, locale });
    }

    const jsonData = await loadJsonData(artefactId);
    if (!jsonData) {
      return res.status(404).render("errors/404", { en, cy, locale });
    }

    if (!isValidPressList(jsonData)) {
      return res.status(400).render("errors/400", { en, cy, locale });
    }

    const validatedData = jsonData as SjpJson;

    const listType = determineListType(validatedData);
    if (listType !== "press") {
      return res.status(404).render("errors/404", { en, cy, locale });
    }

    const filters = parseFiltersFromQuery(req.query);
    const allCases = extractPressCases(validatedData);
    const filteredCases = applyFilters(allCases, filters);
    const paginatedCases = paginateCases(filteredCases, page);
    const { prosecutors, postcodes, hasLondonPostcodes, londonPostcodes } = extractFilterOptions(allCases);

    const isVerifiedUser = req.user?.role === "VERIFIED";
    const pdfExists = await fileExists(path.join(TEMP_UPLOAD_DIR, `${artefactId}.pdf`));
    const excelExists = await fileExists(path.join(TEMP_UPLOAD_DIR, `${artefactId}.xlsx`));
    const downloadDisclaimerUrl = isVerifiedUser && (pdfExists || excelExists) ? `${req.path}/list-download-disclaimer?artefactId=${artefactId}` : null;

    res.render("sjp-press-list", {
      en,
      cy,
      t,
      title: req.path.includes("delta") ? t.SJP_DELTA_PRESS_LIST.title : t.SJP_PRESS_LIST.title,
      ...t.common,
      locale,
      list: buildListMetadata(artefactId, validatedData, artefact),
      cases: paginatedCases,
      prosecutors,
      postcodeAreas: postcodes,
      hasLondonPostcodes,
      londonPostcodes,
      pagination: calculatePagination(page, filteredCases.length, CASES_PER_PAGE),
      filters: {
        postcodes: filters.postcodes || [],
        prosecutors: filters.prosecutors || []
      },
      showFilter,
      errors: undefined,
      dataSource: PROVENANCE_LABELS[artefact.provenance] || artefact.provenance,
      downloadDisclaimerUrl
    });
  } catch (error) {
    console.error("Error rendering SJP press list:", error);
    return res.status(500).render("errors/500", { en, cy, locale });
  }
};

const postHandler = async (req: Request, res: Response) => {
  const artefactId = req.body.artefactId as string;
  const queryParams = new URLSearchParams({ artefactId });
  appendArrayToParams(queryParams, "postcode", req.body.postcode, true);
  appendArrayToParams(queryParams, "prosecutor", req.body.prosecutor);
  res.redirect(`${req.path}?${queryParams.toString()}`);
};

async function loadJsonData(artefactId: string): Promise<unknown | null> {
  return getPublicationJson(artefactId);
}

function isValidPressList(jsonData: unknown): boolean {
  const result = validateSjpPressList(jsonData);
  if (!result.isValid) {
    console.error("Validation errors:", result.errors);
  }
  return result.isValid;
}

function parseFiltersFromQuery(query: Request["query"]): Filters {
  const postcodes = parseQueryAsStringArray(query.postcode);
  const prosecutors = parseQueryAsStringArray(query.prosecutor);

  return {
    postcodes: postcodes.length > 0 ? postcodes : undefined,
    prosecutors: prosecutors.length > 0 ? prosecutors : undefined
  };
}

function parseQueryAsStringArray(param: string | ParsedQs | (string | ParsedQs)[] | undefined): string[] {
  if (!param) return [];
  const items = Array.isArray(param) ? param : [param];
  return items.filter((item): item is string => typeof item === "string");
}

function applyFilters(cases: PressCase[], filters: Filters): PressCase[] {
  let result = [...cases];

  if (filters.postcodes?.length) {
    result = result.filter((c) => c.postcode && matchesPostcodeFilter(c.postcode, filters.postcodes!));
  }

  if (filters.prosecutors?.length) {
    result = result.filter((c) => c.prosecutor && filters.prosecutors!.includes(c.prosecutor));
  }

  return result;
}

function matchesPostcodeFilter(postcode: string, selectedPostcodes: string[]): boolean {
  return selectedPostcodes.some((selected) => {
    if (selected === "LONDON_POSTCODES") {
      return isLondonPostcode(postcode);
    }
    return postcode.toLowerCase().startsWith(selected.toLowerCase());
  });
}

function isLondonPostcode(postcode: string): boolean {
  for (const area of LONDON_POSTCODE_AREAS) {
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

function paginateCases(cases: PressCase[], page: number): PressCase[] {
  const startIdx = (page - 1) * CASES_PER_PAGE;
  return cases.slice(startIdx, startIdx + CASES_PER_PAGE);
}

function extractFilterOptions(cases: PressCase[]) {
  const prosecutors = [...new Set(cases.map((c) => c.prosecutor).filter((p): p is string => p !== null))].sort((a, b) => a.localeCompare(b));

  const postcodes = [...new Set(cases.map((c) => c.postcode).filter((p): p is string => p !== null))].sort((a, b) => a.localeCompare(b));

  const londonPostcodes = postcodes.filter(isLondonPostcode);

  return {
    prosecutors,
    postcodes,
    hasLondonPostcodes: londonPostcodes.length > 0,
    londonPostcodes
  };
}

function buildListMetadata(artefactId: string, jsonData: SjpJson, artefact: { contentDate: Date; locationId: string }) {
  return {
    artefactId,
    listType: "press" as const,
    generatedAt: new Date(jsonData.document.publicationDate),
    publishedAt: new Date(jsonData.document.publicationDate),
    contentDate: artefact.contentDate,
    caseCount: extractPressCases(jsonData).length,
    locationId: Number.parseInt(artefact.locationId, 10)
  };
}

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

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

interface Filters {
  postcodes?: string[];
  prosecutors?: string[];
}

interface PressCase {
  name: string;
  reference?: string | null;
  postcode?: string | null;
  prosecutor?: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const requireVerifiedWithProvenance: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === "SYSTEM_ADMIN") {
    return next();
  }

  if (req.user?.role !== "VERIFIED" || !req.user.provenance) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/sign-in");
  }

  const artefactId = (req.query.artefactId || req.body?.artefactId) as string;
  if (!artefactId || !UUID_REGEX.test(artefactId)) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/sign-in");
  }

  const artefact = await prisma.artefact.findUnique({ where: { artefactId } });
  if (!artefact) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/sign-in");
  }

  const dbListType = await prisma.listType.findUnique({ where: { id: artefact.listTypeId } });
  if (!dbListType || !dbListType.allowedProvenance.split(",").includes(req.user.provenance)) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/sign-in");
  }

  next();
};

export const GET: RequestHandler[] = [requireVerifiedWithProvenance, getHandler];
export const POST: RequestHandler[] = [requireVerifiedWithProvenance, postHandler];
