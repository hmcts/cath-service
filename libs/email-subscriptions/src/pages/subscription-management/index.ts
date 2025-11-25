import { buildVerifiedUserNavigation } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { getSubscriptionsByUserId } from "../../subscription/repository/service.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  // TODO: Remove this mock user ID - for testing only
  const userId = req.user?.id || "test-user-id";

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
    count: subscriptions.length
  });
};

// TODO: Restore auth middleware - temporarily removed for testing
export const GET: RequestHandler[] = [getHandler];
