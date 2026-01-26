import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getAllSubscriptionsByUserId, getCaseSubscriptionsByUserId } from "@hmcts/subscription";
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
  const view = (req.query.view as string) || "all";

  try {
    const [courtSubscriptions, caseSubscriptions] = await Promise.all([getAllSubscriptionsByUserId(userId, locale), getCaseSubscriptionsByUserId(userId)]);

    const courtSubscriptionsWithDetails = sortCourtSubscriptions(courtSubscriptions);
    const sortedCaseSubscriptions = sortCaseSubscriptions(caseSubscriptions);

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    const totalCount = courtSubscriptions.length + caseSubscriptions.length;

    res.render("subscription-management/index", {
      ...t,
      courtSubscriptions: courtSubscriptionsWithDetails,
      caseSubscriptions: sortedCaseSubscriptions,
      courtCount: courtSubscriptions.length,
      caseCount: caseSubscriptions.length,
      totalCount,
      currentView: view,
      csrfToken: (req as any).csrfToken?.() || ""
    });
  } catch (error) {
    console.error(`Error retrieving subscriptions for user ${userId}:`, error);

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    res.render("subscription-management/index", {
      ...t,
      courtSubscriptions: [],
      caseSubscriptions: [],
      courtCount: 0,
      caseCount: 0,
      totalCount: 0,
      currentView: view,
      csrfToken: (req as any).csrfToken?.() || ""
    });
  }
};

const sortCourtSubscriptions = (subscriptions: any[]): any[] => {
  return subscriptions
    .map((sub) => ({
      ...sub,
      locationName: sub.courtOrTribunalName
    }))
    .sort((a, b) => (a.locationName || "").localeCompare(b.locationName || ""));
};

const sortCaseSubscriptions = (subscriptions: any[]): any[] => {
  return [...subscriptions].sort((a, b) => (a.caseName || "").localeCompare(b.caseName || ""));
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
