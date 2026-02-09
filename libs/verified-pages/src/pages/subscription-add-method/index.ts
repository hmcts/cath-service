import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  // Clear any existing list type subscription session data when starting a new journey
  if (req.session.listTypeSubscription) {
    delete req.session.listTypeSubscription;
  }

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("subscription-add-method/index", {
    ...t,
    data: {}
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

    return res.render("subscription-add-method/index", {
      ...t,
      errors: [{ text: t.errorRequired, href: "#subscription-method" }],
      data: req.body
    });
  }

  if (subscriptionMethod === "court") {
    return res.redirect("/subscription-by-location");
  }

  if (subscriptionMethod === "case") {
    return res.redirect("/subscription-management");
  }

  if (subscriptionMethod === "reference") {
    return res.redirect("/subscription-management");
  }

  return res.redirect("/subscription-management");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
