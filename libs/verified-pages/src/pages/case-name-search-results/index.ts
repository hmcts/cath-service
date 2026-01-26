import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const searchResults = req.session.caseSearch?.nameResults || [];
  console.log(`[case-name-search-results] Loading ${searchResults.length} results from session`);

  if (searchResults.length === 0) {
    console.log(`[case-name-search-results] No results found, redirecting to search page`);
    return res.redirect("/case-name-search");
  }

  // Sort results by case name
  const sortedResults = [...searchResults].sort((a: any, b: any) => (a.caseName || "").localeCompare(b.caseName || ""));

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  console.log(`[case-name-search-results] Rendering results page with ${searchResults.length} results`);
  res.render("case-name-search-results/index", {
    ...t,
    results: sortedResults,
    csrfToken: (req as any).csrfToken?.() || ""
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const selectedCaseIds = req.body.selectedCases;

  if (!selectedCaseIds || (Array.isArray(selectedCaseIds) && selectedCaseIds.length === 0)) {
    const searchResults = req.session.caseSearch?.nameResults || [];

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("case-name-search-results/index", {
      ...t,
      results: searchResults,
      errors: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: t.errorNoSelection, href: "#selectedCases" }]
      },
      csrfToken: (req as any).csrfToken?.() || ""
    });
  }

  const selectedIds = Array.isArray(selectedCaseIds) ? selectedCaseIds : [selectedCaseIds];
  const searchResults = req.session.caseSearch?.nameResults || [];
  const selectedCases = searchResults.filter((result: any) => selectedIds.includes(result.id));

  if (!req.session.emailSubscriptions) {
    req.session.emailSubscriptions = {};
  }

  if (!req.session.emailSubscriptions.pendingCaseSubscriptions) {
    req.session.emailSubscriptions.pendingCaseSubscriptions = [];
  }

  // Add searchType to indicate this was found by case name
  const casesWithSearchType = selectedCases.map((c: any) => ({
    ...c,
    searchType: "CASE_NAME"
  }));

  // Add only cases that don't already exist (deduplicate by id)
  const existingIds = req.session.emailSubscriptions.pendingCaseSubscriptions.map((c: any) => c.id);
  const newCases = casesWithSearchType.filter((c: any) => !existingIds.includes(c.id));
  req.session.emailSubscriptions.pendingCaseSubscriptions.push(...newCases);

  res.redirect("/pending-subscriptions");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
