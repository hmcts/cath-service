import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { savePendingCaseSubscriptions } from "@hmcts/subscriptions";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const COMPOSITE_DELIMITER = "|||";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const results = req.session.emailSubscriptions?.caseSearchResults;
  const searchSource = req.session.emailSubscriptions?.searchSource;

  if (!results || results.length === 0) {
    return res.redirect(searchSource || "/add-email-subscription");
  }

  const sortedResults = [...results].sort((a, b) => (a.caseName ?? "").localeCompare(b.caseName ?? ""));

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("case-search-results/index", { ...t, results: sortedResults, searchSource });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const rawSelected = req.body.selectedCase as string | string[] | undefined;
  const results = req.session.emailSubscriptions?.caseSearchResults;
  const searchSource = req.session.emailSubscriptions?.searchSource;

  if (!rawSelected || (Array.isArray(rawSelected) && rawSelected.length === 0)) {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("case-search-results/index", {
      ...t,
      results: results || [],
      searchSource,
      errors: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: t.errorNoSelection, href: "#selectedCase-1" }]
      }
    });
  }

  const selectedCases = Array.isArray(rawSelected) ? rawSelected : [rawSelected];
  const searchType: "CASE_NAME" | "CASE_NUMBER" = searchSource === "/case-reference-search" ? "CASE_NUMBER" : "CASE_NAME";

  const pendingCaseSubscriptions = selectedCases.map((value) => {
    const [caseName, caseNumber] = value.split(COMPOSITE_DELIMITER);
    const searchValue = searchType === "CASE_NUMBER" ? caseNumber || caseName : caseName;
    return {
      caseName: caseName || "",
      caseNumber: caseNumber || null,
      searchType,
      searchValue
    };
  });

  if (!req.session.emailSubscriptions) {
    req.session.emailSubscriptions = {};
  }

  const existingPending = req.session.emailSubscriptions.pendingCaseSubscriptions || [];
  const existingConfirmed = req.session.emailSubscriptions.confirmedCaseSubscriptions || [];
  const allExisting = [...existingConfirmed, ...existingPending];
  if (allExisting.length > 0) {
    req.session.emailSubscriptions.confirmedCaseSubscriptions = allExisting;
  }

  req.session.emailSubscriptions.pendingCaseSubscriptions = pendingCaseSubscriptions;

  if (req.user?.id) {
    await savePendingCaseSubscriptions(req.app.locals.redisClient, req.user.id, pendingCaseSubscriptions);
  }

  return res.redirect("/pending-subscriptions");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
