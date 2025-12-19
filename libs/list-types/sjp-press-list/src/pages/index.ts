import type { Request, Response } from "express";
import "@hmcts/auth";
import { calculatePagination, getSjpListById, getSjpPressCases, getUniquePostcodes, getUniqueProsecutors } from "@hmcts/list-types-common";
import { cy } from "./cy.js";
import { en } from "./en.js";

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

  const list = await getSjpListById(artefactId);
  if (!list || list.listType !== "press") {
    return res.status(404).render("errors/404", {
      en,
      cy,
      locale
    });
  }

  // Handle multiple prosecutors from query string
  const prosecutorQuery = req.query.prosecutor;
  const selectedProsecutors = prosecutorQuery
    ? (Array.isArray(prosecutorQuery) ? prosecutorQuery : [prosecutorQuery]).filter((p): p is string => typeof p === "string")
    : [];

  // Handle multiple postcodes from query string
  const postcodeQuery = req.query.postcode;
  const selectedPostcodes = postcodeQuery
    ? (Array.isArray(postcodeQuery) ? postcodeQuery : [postcodeQuery]).filter((p): p is string => typeof p === "string")
    : [];

  const filters = {
    searchQuery: req.query.search as string | undefined,
    postcodes: selectedPostcodes.length > 0 ? selectedPostcodes : undefined,
    prosecutors: selectedProsecutors.length > 0 ? selectedProsecutors : undefined
  };

  const { cases, totalCases } = await getSjpPressCases(artefactId, filters, page);
  const prosecutors = await getUniqueProsecutors(artefactId);
  const postcodeData = await getUniquePostcodes(artefactId);
  const pagination = calculatePagination(page, totalCases, 200);

  res.render("sjp-press-list", {
    ...t,
    en,
    cy,
    locale,
    list,
    cases,
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
    errors: undefined
  });
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

  // No validation needed for postcode/prosecutor as they come from predefined checkboxes

  const queryParams = new URLSearchParams({ artefactId });
  if (filters.searchQuery) queryParams.set("search", filters.searchQuery);

  // Handle multiple postcodes
  if (filters.postcodes) {
    const postcodeArray = Array.isArray(filters.postcodes) ? filters.postcodes : [filters.postcodes];
    for (const postcode of postcodeArray) {
      const trimmedPostcode = postcode.trim();
      if (trimmedPostcode) {
        queryParams.append("postcode", trimmedPostcode);
      }
    }
  }

  // Handle multiple prosecutors
  if (filters.prosecutors) {
    const prosecutorArray = Array.isArray(filters.prosecutors) ? filters.prosecutors : [filters.prosecutors];
    for (const prosecutor of prosecutorArray) {
      queryParams.append("prosecutor", prosecutor);
    }
  }

  res.redirect(`/sjp-press-list?${queryParams.toString()}`);
};
