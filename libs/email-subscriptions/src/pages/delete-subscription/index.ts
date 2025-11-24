import { buildVerifiedUserNavigation } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const subscriptionId = req.query.subscriptionId as string;

  if (!subscriptionId) {
    return res.redirect("/subscription-management");
  }

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  res.render("delete-subscription/index", {
    ...t,
    subscriptionId
  });
};

const postHandler = async (req: Request, res: Response) => {
  const { subscription, "unsubscribe-confirm": unsubscribeConfirm } = req.body;

  if (!unsubscribeConfirm) {
    return res.redirect("/subscription-management");
  }

  if (unsubscribeConfirm === "no") {
    return res.redirect("/subscription-management");
  }

  if (unsubscribeConfirm === "yes" && subscription) {
    req.session.emailSubscriptions = req.session.emailSubscriptions || {};
    req.session.emailSubscriptions.subscriptionToRemove = subscription;
    return res.redirect("/unsubscribe-confirmation");
  }

  res.redirect("/subscription-management");
};

export const GET: RequestHandler[] = [getHandler];
export const POST: RequestHandler[] = [postHandler];
