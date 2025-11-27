import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { findSubscriptionById } from "@hmcts/subscriptions";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  const rawSubscriptionId = req.query.subscriptionId as string;
  const subscriptionId = rawSubscriptionId?.trim();

  if (!subscriptionId) {
    return res.redirect("/subscription-management");
  }

  if (!isValidUUID(subscriptionId)) {
    return res.redirect("/subscription-management");
  }

  const userId = req.user.id;

  try {
    const subscription = await findSubscriptionById(subscriptionId);

    if (!subscription) {
      return res.redirect("/subscription-management");
    }

    if (subscription.userId !== userId) {
      return res.redirect("/subscription-management");
    }

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    res.render("delete-subscription/index", {
      ...t,
      subscriptionId,
      csrfToken: (req as any).csrfToken?.() || ""
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return res.redirect("/subscription-management");
  }
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  const { subscription, subscriptionId: bodySubscriptionId, "unsubscribe-confirm": unsubscribeConfirm } = req.body;
  const subscriptionId = subscription || bodySubscriptionId;

  // If no subscriptionId in body, redirect to subscription management
  if (!subscriptionId) {
    return res.redirect("/subscription-management");
  }

  // Validate UUID format
  if (!isValidUUID(subscriptionId)) {
    return res.redirect("/subscription-management");
  }

  const userId = req.user.id;

  // Verify user owns the subscription
  try {
    const sub = await findSubscriptionById(subscriptionId);
    if (!sub || sub.userId !== userId) {
      return res.redirect("/subscription-management");
    }
  } catch (error) {
    console.error("Error validating subscription ownership:", error);
    return res.redirect("/subscription-management");
  }

  // If this is a direct POST from subscription-management (no confirmation yet)
  if (!unsubscribeConfirm) {
    // Redirect to GET to show confirmation page
    return res.redirect(`/delete-subscription?subscriptionId=${subscriptionId}`);
  }

  // Handle confirmation page submission
  if (unsubscribeConfirm === "no") {
    return res.redirect("/subscription-management");
  }

  if (unsubscribeConfirm === "yes") {
    req.session.emailSubscriptions = req.session.emailSubscriptions || {};
    req.session.emailSubscriptions.subscriptionToRemove = subscriptionId;
    return res.redirect("/unsubscribe-confirmation");
  }

  // If we get here with an invalid choice, show error
  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  return res.render("delete-subscription/index", {
    ...t,
    subscriptionId,
    csrfToken: (req as any).csrfToken?.() || "",
    errors: {
      titleText: t.errorSummaryTitle,
      errorList: [
        {
          text: t.errorNoSelection,
          href: "#unsubscribe-confirm"
        }
      ]
    }
  });
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
