import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
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

  res.render("subscription-add/index", {
    ...t,
    csrfToken: getCsrfToken(req)
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const { subscriptionMethod } = req.body;

  if (!subscriptionMethod) {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("subscription-add/index", {
      ...t,
      errors: [{ text: t.errorRequired, href: "#subscriptionMethod" }],
      errorSummary: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: t.errorRequired, href: "#subscriptionMethod" }]
      },
      fieldErrors: {
        subscriptionMethod: { text: t.errorRequired }
      },
      csrfToken: getCsrfToken(req)
    });
  }

  // Redirect based on selected method
  switch (subscriptionMethod) {
    case "courtOrTribunal":
      return res.redirect("/location-name-search");
    case "caseName":
      return res.redirect("/case-name-search");
    case "caseReference":
      return res.redirect("/case-number-search");
    default:
      return res.redirect("/subscription-add");
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
