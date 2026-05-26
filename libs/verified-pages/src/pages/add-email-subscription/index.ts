import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
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

  res.render("add-email-subscription/index", { ...t });
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

    return res.render("add-email-subscription/index", {
      ...t,
      errors: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: t.errorSelectOption, href: "#subscriptionMethod" }]
      }
    });
  }

  if (subscriptionMethod === "courtOrTribunal") {
    return res.redirect("/location-name-search");
  }

  if (subscriptionMethod === "caseName") {
    return res.redirect("/case-name-search");
  }

  if (subscriptionMethod === "caseReference") {
    return res.redirect("/case-reference-search");
  }

  return res.redirect("/subscription-management");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
