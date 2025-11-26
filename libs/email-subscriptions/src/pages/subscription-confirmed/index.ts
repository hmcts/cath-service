import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.session.emailSubscriptions?.confirmationComplete) {
    return res.redirect("/subscription-management");
  }

  const confirmedLocationIds = req.session.emailSubscriptions.confirmedLocations || [];

  const confirmedLocations = (
    await Promise.all(
      confirmedLocationIds.map(async (id: string) => {
        const location = await getLocationById(Number.parseInt(id, 10));
        return location ? (locale === "cy" ? location.welshName : location.name) : null;
      })
    )
  ).filter(Boolean);

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
