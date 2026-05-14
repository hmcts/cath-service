import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationsByIds } from "@hmcts/location";
import { subscriptionConfirmedCy as cy, subscriptionConfirmedEn as en } from "@hmcts/verified-pages";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.session.emailSubscriptions?.confirmationComplete) {
    return res.redirect("/subscription-management");
  }

  const confirmedLocationIds = req.session.emailSubscriptions.confirmedLocations || [];

  const locationIds = confirmedLocationIds.map((id: string) => Number.parseInt(id, 10));
  const locations = await getLocationsByIds(locationIds);

  const confirmedLocations = locations.map((location) => (locale === "cy" ? location.welshName : location.name));

  delete req.session.emailSubscriptions.confirmationComplete;
  delete req.session.emailSubscriptions.confirmedLocations;

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  const isPlural = confirmedLocations.length > 1;

  res.render("subscription-confirmed/index", {
    ...t,
    locations: confirmedLocations,
    isPlural,
    panelTitle: isPlural ? t.panelTitlePlural : t.panelTitle
  });
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
