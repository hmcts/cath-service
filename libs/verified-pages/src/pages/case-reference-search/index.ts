import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { searchByCaseNumber } from "@hmcts/subscriptions";
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

  res.render("case-reference-search/index", { ...t, caseReference: "" });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const { caseReference } = req.body as { caseReference: string };

  const trimmed = caseReference?.trim() ?? "";

  const renderError = (value: string) => {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("case-reference-search/index", {
      ...t,
      caseReference: value,
      errors: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: t.errorSummary, href: "#caseReference" }],
        inlineError: t.errorInline
      }
    });
  };

  if (!trimmed) {
    return renderError(caseReference || "");
  }

  const results = await searchByCaseNumber(trimmed);

  if (results.length === 0) {
    return renderError(caseReference);
  }

  if (!req.session.emailSubscriptions) {
    req.session.emailSubscriptions = {};
  }
  req.session.emailSubscriptions.caseReferenceSearch = caseReference.trim();
  req.session.emailSubscriptions.caseSearchResults = results;
  req.session.emailSubscriptions.searchSource = "/case-reference-search";

  return res.redirect("/case-search-results");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
