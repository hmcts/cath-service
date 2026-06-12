import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getCaseSubscriptionsByUserId, getCourtSubscriptionsByUserId } from "@hmcts/subscriptions";
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

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  try {
    const [caseSubscriptions, courtSubscriptions] = await Promise.all([
      getCaseSubscriptionsByUserId(userId, locale),
      getCourtSubscriptionsByUserId(userId, locale)
    ]);

    const count = caseSubscriptions.length + courtSubscriptions.length;

    res.render("subscription-management/index", {
      ...t,
      caseSubscriptions,
      courtSubscriptions,
      count,
      hasCaseSubscriptions: caseSubscriptions.length > 0,
      hasCourtSubscriptions: courtSubscriptions.length > 0,
      caseSubscriptionsCount: caseSubscriptions.length,
      courtSubscriptionsCount: courtSubscriptions.length,
      allSubscriptionsCount: count,
      csrfToken: (req as any).csrfToken?.() || ""
    });
  } catch (error) {
    console.error(`Error retrieving subscriptions for user ${userId}:`, error);

    res.render("subscription-management/index", {
      ...t,
      caseSubscriptions: [],
      courtSubscriptions: [],
      count: 0,
      hasCaseSubscriptions: false,
      hasCourtSubscriptions: false,
      caseSubscriptionsCount: 0,
      courtSubscriptionsCount: 0,
      allSubscriptionsCount: 0,
      csrfToken: (req as any).csrfToken?.() || ""
    });
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
