import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { findSubscriptionById } from "../../repository/queries.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const rawSubscriptionId = req.query.subscriptionId as string;
  const subscriptionId = rawSubscriptionId?.trim();

  if (!subscriptionId) {
    return res.redirect("/subscription-management");
  }

  if (!isValidUUID(subscriptionId)) {
    return res.status(400).send("Invalid subscription ID format");
  }

  const userId = req.user?.id || "test-user-id";

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
      subscriptionId
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return res.redirect("/subscription-management");
  }
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const { subscription, "unsubscribe-confirm": unsubscribeConfirm } = req.body;

  if (!unsubscribeConfirm) {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("delete-subscription/index", {
      ...t,
      subscriptionId: subscription,
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

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
