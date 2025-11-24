import { buildVerifiedUserNavigation } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { removeSubscription } from "../../subscription/service.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const userId = req.user?.id || "test-user-id";

  const subscriptionId = req.session.emailSubscriptions?.subscriptionToRemove;

  if (!subscriptionId) {
    return res.redirect("/subscription-management");
  }

  try {
    await removeSubscription(subscriptionId, userId);

    if (req.session.emailSubscriptions) {
      delete req.session.emailSubscriptions.subscriptionToRemove;
    }

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    res.render("unsubscribe-confirmation/index", {
      ...t
    });
  } catch (error) {
    console.error("Error removing subscription:", error);
    return res.redirect("/subscription-management");
  }
};

export const GET: RequestHandler[] = [getHandler];
