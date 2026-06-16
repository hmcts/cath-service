import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { searchByCaseName } from "@hmcts/subscriptions";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("case-name-search/index", { ...t, caseName: "" });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const { caseName } = req.body as { caseName: string };

  const trimmed = caseName?.trim() ?? "";

  if (trimmed.length < 3) {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("case-name-search/index", {
      ...t,
      caseName,
      errors: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: t.errorMinLength, href: "#caseName" }]
      }
    });
  }

  const results = await searchByCaseName(trimmed);

  if (results.length === 0) {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("case-name-search/index", {
      ...t,
      caseName,
      errors: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: t.errorNoResultsSummary, href: "#caseName" }],
        inlineError: t.errorNoResultsInline
      }
    });
  }

  if (!req.session.emailSubscriptions) {
    req.session.emailSubscriptions = {};
  }
  req.session.emailSubscriptions.caseNameSearch = caseName.trim();
  req.session.emailSubscriptions.caseSearchResults = results;
  req.session.emailSubscriptions.searchSource = "/case-name-search";

  return res.redirect("/case-search-results");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
