import { calculatePagination, getSjpListById, getSjpPublicCases, getUniquePostcodes, getUniqueProsecutors } from "@hmcts/list-types-common";
import type { Request, Response } from "express";
import type { ParsedQs } from "qs";
import { cy } from "./cy.js";
import { en } from "./en.js";

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
  const artefactId = req.query.artefactId as string;
  const page = Number.parseInt(req.query.page as string, 10) || 1;
  const sortBy = (req.query.sortBy as string) || "name";
  const sortOrder = (req.query.sortOrder as string) || "asc";

  if (!artefactId) {
    return res.status(400).render("errors/400", {
      en,
      cy,
      locale
    });
  }

  const list = await getSjpListById(artefactId);
  if (!list || list.listType !== "public") {
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

  const { cases, totalCases } = await getSjpPublicCases(artefactId, filters, page, sortBy, sortOrder);
  const prosecutors = await getUniqueProsecutors(artefactId);
  const postcodeData = await getUniquePostcodes(artefactId);
  const pagination = calculatePagination(page, totalCases, 200);
  const t = locale === "cy" ? cy : en;

  // Format cases for GOV.UK table component
  const casesRows = cases.map((caseItem) => [
    { text: caseItem.name },
    { text: caseItem.postcode || "" },
    { text: caseItem.offence || "" },
    { text: caseItem.prosecutor || "" }
  ]);

  res.render("sjp-public-list", {
    ...t,
    en,
    cy,
    locale,
    list,
    cases,
    casesRows,
    prosecutors,
    postcodeAreas: postcodeData.postcodes,
    hasLondonPostcodes: postcodeData.hasLondonPostcodes,
    londonPostcodes: postcodeData.londonPostcodes,
    pagination,
    filters: {
      searchQuery: filters.searchQuery,
      postcodes: selectedPostcodes,
      prosecutors: selectedProsecutors
    },
    sortBy,
    sortOrder
  });
};

export const POST = async (req: Request, res: Response) => {
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

  res.redirect(`/sjp-public-list?${queryParams.toString()}`);
};
