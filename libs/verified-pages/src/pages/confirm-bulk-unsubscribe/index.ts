import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { deleteSubscriptionsByIds, getSubscriptionDetailsForConfirmation } from "@hmcts/subscriptions";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  const selectedIds = req.session.bulkUnsubscribe?.selectedIds || [];

  if (selectedIds.length === 0) {
    return res.redirect("/bulk-unsubscribe");
  }

  try {
    const subscriptions = await getSubscriptionDetailsForConfirmation(selectedIds, locale);

    const caseSubscriptions: typeof subscriptions = [];
    const courtSubscriptions = subscriptions;

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    res.render("confirm-bulk-unsubscribe/index", {
      ...t,
      caseSubscriptions,
      courtSubscriptions,
      hasCaseSubscriptions: caseSubscriptions.length > 0,
      hasCourtSubscriptions: courtSubscriptions.length > 0,
      csrfToken: (req as any).csrfToken?.() || ""
    });
  } catch (error) {
    console.error("Error retrieving subscription details for confirmation:", error);
    return res.redirect("/bulk-unsubscribe");
  }
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  const userId = req.user.id;
  const selectedIds = req.session.bulkUnsubscribe?.selectedIds || [];
  const confirm = req.body.confirm;

  if (!confirm) {
    try {
      const subscriptions = await getSubscriptionDetailsForConfirmation(selectedIds, locale);

      const caseSubscriptions: typeof subscriptions = [];
      const courtSubscriptions = subscriptions;

      if (!res.locals.navigation) {
        res.locals.navigation = {};
      }
      res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

      return res.render("confirm-bulk-unsubscribe/index", {
        ...t,
        caseSubscriptions,
        courtSubscriptions,
        hasCaseSubscriptions: caseSubscriptions.length > 0,
        hasCourtSubscriptions: courtSubscriptions.length > 0,
        errors: [
          {
            text: t.errorNoRadioMessage,
            href: t.errorNoRadioHref
          }
        ],
        csrfToken: (req as any).csrfToken?.() || ""
      });
    } catch (error) {
      console.error("Error rendering validation error:", error);
      return res.redirect("/bulk-unsubscribe");
    }
  }

  if (confirm === "no") {
    if (req.session.bulkUnsubscribe) {
      req.session.bulkUnsubscribe = {};
    }
    return res.redirect("/subscription-management");
  }

  if (confirm === "yes") {
    try {
      await deleteSubscriptionsByIds(selectedIds, userId);

      if (req.session.bulkUnsubscribe) {
        req.session.bulkUnsubscribe = {};
      }

      return res.redirect("/bulk-unsubscribe-success");
    } catch (error) {
      console.error("Error deleting subscriptions:", error);
      return res.redirect("/bulk-unsubscribe");
    }
  }

  return res.redirect("/bulk-unsubscribe");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
