import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { getCsrfToken } from "../../utils/csrf.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const searchResults = req.session.caseSearch?.numberResults || [];

  if (searchResults.length === 0) {
    return res.redirect("/case-number-search");
  }

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("case-number-search-results/index", {
    ...t,
    results: searchResults,
    csrfToken: getCsrfToken(req)
  });
};

const postHandler = async (req: Request, res: Response) => {
  const searchResults = req.session.caseSearch?.numberResults || [];

  if (!req.session.emailSubscriptions) {
    req.session.emailSubscriptions = {};
  }

  if (!req.session.emailSubscriptions.pendingCaseSubscriptions) {
    req.session.emailSubscriptions.pendingCaseSubscriptions = [];
  }

  // Add searchType to indicate this was found by case number
  const casesWithSearchType = searchResults.map((c: any) => ({
    ...c,
    searchType: "CASE_NUMBER"
  }));

  // Add all results from search (deduplicate by id)
  const existingIds = req.session.emailSubscriptions.pendingCaseSubscriptions.map((c: any) => c.id);
  const newCases = casesWithSearchType.filter((c: any) => !existingIds.includes(c.id));
  req.session.emailSubscriptions.pendingCaseSubscriptions.push(...newCases);

  res.redirect("/pending-subscriptions");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
