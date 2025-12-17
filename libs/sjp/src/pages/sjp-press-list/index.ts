import type { Request, Response } from "express";
import "@hmcts/auth";
import { calculatePagination } from "../../sjp-paginator.js";
import { getSjpListById, getSjpPressCases, getUniquePostcodes, getUniqueProsecutors } from "../../sjp-service.js";
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

  const filters = {
    searchQuery: req.query.search as string | undefined,
    postcode: req.query.postcode as string | undefined,
    prosecutor: req.query.prosecutor as string | undefined
  };

  const { cases, totalCases } = await getSjpPressCases(artefactId, filters, page);
  const prosecutors = await getUniqueProsecutors(artefactId);
  const postcodeData = await getUniquePostcodes(artefactId);
  const pagination = calculatePagination(page, totalCases, 50);

  res.render("sjp-press-list/index", {
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
    filters,
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
    postcode: req.body.postcode,
    prosecutor: req.body.prosecutor
  };

  // No validation needed for postcode/prosecutor as they come from predefined checkboxes

  const queryParams = new URLSearchParams({ artefactId });
  if (filters.searchQuery) queryParams.set("search", filters.searchQuery);
  if (filters.postcode) queryParams.set("postcode", filters.postcode);
  if (filters.prosecutor) queryParams.set("prosecutor", filters.prosecutor);

  res.redirect(`/sjp-press-list?${queryParams.toString()}`);
};
