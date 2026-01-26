import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { searchByCaseName } from "@hmcts/subscription";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface SessionData {
  caseSearch?: {
    nameResults?: Array<{
      id: string;
      caseNumber: string | null;
      caseName: string | null;
      artefactId: string;
    }>;
  };
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("case-name-search/index", {
    ...t,
    csrfToken: (req as any).csrfToken?.() || ""
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const { caseName } = req.body;

  if (!caseName || caseName.trim().length < 3) {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("case-name-search/index", {
      ...t,
      errors: [{ text: t.errorRequired, href: "#caseName" }],
      errorSummary: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: t.errorRequired, href: "#caseName" }]
      },
      fieldErrors: {
        caseName: { text: t.errorRequired }
      },
      data: { caseName },
      csrfToken: (req as any).csrfToken?.() || ""
    });
  }

  try {
    console.log(`[case-name-search] Searching for case name: "${caseName}"`);
    const results = await searchByCaseName(caseName);
    console.log(`[case-name-search] Found ${results.length} results`);

    if (results.length === 0) {
      if (!res.locals.navigation) {
        res.locals.navigation = {};
      }
      res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

      return res.render("case-name-search/index", {
        ...t,
        errors: [{ text: t.errorNoResults, href: "#caseName" }],
        errorSummary: {
          titleText: t.errorSummaryTitle,
          errorList: [{ text: t.errorNoResults, href: "#caseName" }]
        },
        fieldErrors: {
          caseName: { text: t.errorNoResultsField }
        },
        data: { caseName },
        csrfToken: (req as any).csrfToken?.() || ""
      });
    }

    // Store results in session
    const session = req.session as SessionData;
    if (!session.caseSearch) {
      session.caseSearch = {};
    }
    session.caseSearch.nameResults = results;

    return res.redirect("/case-name-search-results");
  } catch (error) {
    console.error(`[case-name-search] Error searching for case name "${caseName}":`, error);

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("case-name-search/index", {
      ...t,
      errors: [{ text: "An error occurred while searching", href: "#caseName" }],
      errorSummary: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: "An error occurred while searching", href: "#caseName" }]
      },
      data: { caseName },
      csrfToken: (req as any).csrfToken?.() || ""
    });
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
