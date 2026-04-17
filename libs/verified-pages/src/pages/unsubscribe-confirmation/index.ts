import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { removeSubscription } from "@hmcts/subscription";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  const userId = req.user.id;
  const subscriptionIds = req.session.emailSubscriptions?.subscriptionToRemove;

  if (!subscriptionIds) {
    return res.redirect("/subscription-management");
  }

  // Split comma-separated IDs if present
  const idsArray = subscriptionIds.split(",").map((id: string) => id.trim());

  try {
    // Delete all subscriptions
    for (const id of idsArray) {
      await removeSubscription(id, userId);
    }

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

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
