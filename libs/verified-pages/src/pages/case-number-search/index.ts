import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { searchByCaseReference } from "@hmcts/subscription";
import type { Request, RequestHandler, Response } from "express";
import { getCsrfToken } from "../../utils/csrf.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("case-number-search/index", {
    ...t,
    csrfToken: getCsrfToken(req)
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const { referenceNumber } = req.body;

  if (!referenceNumber || referenceNumber.trim().length === 0) {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("case-number-search/index", {
      ...t,
      errors: [{ text: t.errorNoResults, href: "#referenceNumber" }],
      errorSummary: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: t.errorNoResults, href: "#referenceNumber" }]
      },
      fieldErrors: {
        referenceNumber: { text: t.errorNoResultsField }
      },
      data: { referenceNumber },
      csrfToken: getCsrfToken(req)
    });
  }

  try {
    const results = await searchByCaseReference(referenceNumber);

    if (results.length === 0) {
      if (!res.locals.navigation) {
        res.locals.navigation = {};
      }
      res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

      return res.render("case-number-search/index", {
        ...t,
        errors: [{ text: t.errorNoResults, href: "#referenceNumber" }],
        errorSummary: {
          titleText: t.errorSummaryTitle,
          errorList: [{ text: t.errorNoResults, href: "#referenceNumber" }]
        },
        fieldErrors: {
          referenceNumber: { text: t.errorNoResultsField }
        },
        data: { referenceNumber },
        csrfToken: getCsrfToken(req)
      });
    }

    // Store results in session
    if (!req.session.caseSearch) {
      req.session.caseSearch = {};
    }
    req.session.caseSearch.numberResults = results;

    return res.redirect("/case-number-search-results");
  } catch (error) {
    console.error("Error searching for case by reference:", error);

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("case-number-search/index", {
      ...t,
      errors: [{ text: "An error occurred while searching", href: "#referenceNumber" }],
      errorSummary: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: "An error occurred while searching", href: "#referenceNumber" }]
      },
      data: { referenceNumber },
      csrfToken: getCsrfToken(req)
    });
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
