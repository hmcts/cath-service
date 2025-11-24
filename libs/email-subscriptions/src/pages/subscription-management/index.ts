import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { getSubscriptionsByUserId, removeSubscription } from "../../subscription/service.js";

const en = {
  title: "Your email subscriptions",
  heading: "Your email subscriptions",
  noSubscriptions: "You have no email subscriptions",
  noSubscriptionsMessage: "Subscribe to courts and tribunals to receive email notifications when new hearing publications are available.",
  subscribedCount: "You are subscribed to {count} courts and tribunals",
  addButton: "Add subscription",
  subscribedLabel: "Subscribed:",
  removeLink: "Remove",
  successMessage: "Subscription removed successfully",
  errorSummaryTitle: "There is a problem"
};

const cy = {
  title: "Eich tanysgrifiadau e-bost",
  heading: "Eich tanysgrifiadau e-bost",
  noSubscriptions: "Nid oes gennych unrhyw danysgrifiadau e-bost",
  noSubscriptionsMessage: "Tanysgrifiwch i lysoedd a thribiwnlysoedd i dderbyn hysbysiadau e-bost pan fydd cyhoeddiadau gwrandawiad newydd ar gael.",
  subscribedCount: "Rydych wedi tanysgrifio i {count} llys a thribiwnlys",
  addButton: "Ychwanegu tanysgrifiad",
  subscribedLabel: "Tanysgrifiwyd:",
  removeLink: "Dileu",
  successMessage: "Tanysgrifiad wedi'i ddileu yn llwyddiannus",
  errorSummaryTitle: "Mae problem wedi codi"
};

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const userId = req.user?.id;

  if (!userId) {
    return res.redirect("/login");
  }

  const subscriptions = await getSubscriptionsByUserId(userId);

  const subscriptionsWithDetails = subscriptions.map((sub) => {
    const location = getLocationById(Number.parseInt(sub.locationId, 10));
    return {
      ...sub,
      locationName: location ? (locale === "cy" ? location.welshName : location.name) : sub.locationId
    };
  });

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  const successMessage = req.session.successMessage;
  delete req.session.successMessage;

  res.render("subscription-management/index", {
    ...t,
    subscriptions: subscriptionsWithDetails,
    count: subscriptions.length,
    successBanner: successMessage ? { text: successMessage } : undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const userId = req.user?.id;
  const { subscriptionId } = req.body;

  if (!userId) {
    return res.redirect("/login");
  }

  if (!subscriptionId) {
    return res.redirect("/subscription-management");
  }

  try {
    await removeSubscription(subscriptionId, userId);
    req.session.successMessage = t.successMessage;
    res.redirect("/subscription-management");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const subscriptions = await getSubscriptionsByUserId(userId);
    const subscriptionsWithDetails = subscriptions.map((sub) => {
      const location = getLocationById(Number.parseInt(sub.locationId, 10));
      return {
        ...sub,
        locationName: location ? (locale === "cy" ? location.welshName : location.name) : sub.locationId
      };
    });

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    res.render("subscription-management/index", {
      ...t,
      subscriptions: subscriptionsWithDetails,
      count: subscriptions.length,
      errors: {
        titleText: t.errorSummaryTitle || "There is a problem",
        errorList: [{ text: errorMessage }]
      }
    });
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
