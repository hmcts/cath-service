import { getCsrfToken } from "../../utils/csrf.js";
import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const searchResults = req.session.caseSearch?.nameResults || [];

  if (searchResults.length === 0) {
    return res.redirect("/case-name-search");
  }

  // Sort results by case name
  const sortedResults = [...searchResults].sort((a: any, b: any) => (a.caseName || "").localeCompare(b.caseName || ""));

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("case-name-search-results/index", {
    ...t,
    results: sortedResults,
    csrfToken: getCsrfToken(req)
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
      csrfToken: getCsrfToken(req)
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
