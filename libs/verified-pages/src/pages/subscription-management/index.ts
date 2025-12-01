import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import { getSubscriptionsByUserId } from "@hmcts/subscriptions";
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

  try {
    const subscriptions = await getSubscriptionsByUserId(userId);

    const subscriptionsWithDetails = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const location = await getLocationById(sub.locationId);
          return {
            ...sub,
            locationName: location ? (locale === "cy" ? location.welshName : location.name) : sub.locationId.toString()
          };
        } catch (error) {
          console.error(`Failed to lookup location ${sub.locationId} for user ${userId}:`, error);
          return {
            ...sub,
            locationName: sub.locationId.toString()
          };
        }
      })
    );

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    res.render("subscription-management/index", {
      ...t,
      subscriptions: subscriptionsWithDetails,
      count: subscriptions.length,
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
      subscriptions: [],
      count: 0,
      csrfToken: (req as any).csrfToken?.() || ""
    });
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
