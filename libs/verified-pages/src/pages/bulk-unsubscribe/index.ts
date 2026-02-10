import { getCsrfToken } from "../../utils/csrf.js";
import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getCaseSubscriptionsByUserId, getCourtSubscriptionsByUserId } from "@hmcts/subscriptions";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface BulkUnsubscribeSession {
  selectedIds?: string[];
}

declare module "express-session" {
  interface SessionData {
    bulkUnsubscribe?: BulkUnsubscribeSession;
  }
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  const userId = req.user.id;
  const currentView = (req.query.view as string) || "all";

  try {
    const caseSubscriptions = await getCaseSubscriptionsByUserId(userId);
    const courtSubscriptions = await getCourtSubscriptionsByUserId(userId, locale);

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    const previouslySelected = req.session.bulkUnsubscribe?.selectedIds || [];

    res.render("bulk-unsubscribe/index", {
      ...t,
      caseSubscriptions,
      courtSubscriptions,
      previouslySelected,
      currentView,
      hasCaseSubscriptions: caseSubscriptions.length > 0,
      hasCourtSubscriptions: courtSubscriptions.length > 0,
      showEmptyState: caseSubscriptions.length === 0 && courtSubscriptions.length === 0,
      caseSubscriptionsCount: caseSubscriptions.length,
      courtSubscriptionsCount: courtSubscriptions.length,
      allSubscriptionsCount: caseSubscriptions.length + courtSubscriptions.length,
      csrfToken: getCsrfToken(req)
    });
  } catch (error) {
    console.error(`Error retrieving subscriptions for bulk unsubscribe for user ${userId}:`, error);

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    res.render("bulk-unsubscribe/index", {
      ...t,
      caseSubscriptions: [],
      courtSubscriptions: [],
      previouslySelected: [],
      currentView,
      hasCaseSubscriptions: false,
      hasCourtSubscriptions: false,
      showEmptyState: true,
      caseSubscriptionsCount: 0,
      courtSubscriptionsCount: 0,
      allSubscriptionsCount: 0,
      csrfToken: getCsrfToken(req)
    });
  }
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  const currentView = req.body.view || "all";

  let selectedIds: string[] = [];
  if (Array.isArray(req.body.subscriptions)) {
    selectedIds = [...new Set(req.body.subscriptions as string[])];
  } else if (req.body.subscriptions) {
    selectedIds = [req.body.subscriptions];
  }

  if (selectedIds.length === 0) {
    const userId = req.user.id;

    try {
      const caseSubscriptions = await getCaseSubscriptionsByUserId(userId);
      const courtSubscriptions = await getCourtSubscriptionsByUserId(userId, locale);

      if (!res.locals.navigation) {
        res.locals.navigation = {};
      }
      res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

      return res.render("bulk-unsubscribe/index", {
        ...t,
        caseSubscriptions,
        courtSubscriptions,
        previouslySelected: [],
        currentView,
        hasCaseSubscriptions: caseSubscriptions.length > 0,
        hasCourtSubscriptions: courtSubscriptions.length > 0,
        showEmptyState: caseSubscriptions.length === 0 && courtSubscriptions.length === 0,
        caseSubscriptionsCount: caseSubscriptions.length,
        courtSubscriptionsCount: courtSubscriptions.length,
        allSubscriptionsCount: caseSubscriptions.length + courtSubscriptions.length,
        errors: [
          {
            text: t.errorNoSelectionMessage,
            href: t.errorNoSelectionHref
          }
        ],
        csrfToken: getCsrfToken(req)
      });
    } catch (error) {
      console.error("Error rendering validation error:", error);
      return res.redirect(`/bulk-unsubscribe?view=${currentView}`);
    }
  }

  if (!req.session.bulkUnsubscribe) {
    req.session.bulkUnsubscribe = {};
  }
  req.session.bulkUnsubscribe.selectedIds = selectedIds;

  req.session.save((err?: any) => {
    if (err) {
      return res.redirect(`/bulk-unsubscribe?view=${currentView}`);
    }
    res.redirect("/confirm-bulk-unsubscribe");
  });
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
