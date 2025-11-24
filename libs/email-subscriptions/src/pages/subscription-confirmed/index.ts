import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";

const en = {
  title: "Subscription confirmed",
  panelTitle: "Subscription confirmed",
  panelTitlePlural: "Subscriptions confirmed",
  message: "You have subscribed to email notifications for:",
  notificationMessage: "You will receive an email when new hearing publications are available for this court.",
  notificationMessagePlural: "You will receive emails when new hearing publications are available for these courts.",
  viewSubscriptionsButton: "View your subscriptions",
  homeLink: "Back to service home"
};

const cy = {
  title: "Tanysgrifiad wedi'i gadarnhau",
  panelTitle: "Tanysgrifiad wedi'i gadarnhau",
  panelTitlePlural: "Tanysgrifiadau wedi'u cadarnhau",
  message: "Rydych wedi tanysgrifio i hysbysiadau e-bost ar gyfer:",
  notificationMessage: "Byddwch yn derbyn e-bost pan fydd cyhoeddiadau gwrandawiad newydd ar gael ar gyfer y llys hwn.",
  notificationMessagePlural: "Byddwch yn derbyn e-byst pan fydd cyhoeddiadau gwrandawiad newydd ar gael ar gyfer y llysoedd hyn.",
  viewSubscriptionsButton: "Gweld eich tanysgrifiadau",
  homeLink: "Yn ôl i hafan y gwasanaeth"
};

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.session.emailSubscriptions?.confirmationComplete) {
    return res.redirect("/subscription-management");
  }

  const confirmedLocationIds = req.session.emailSubscriptions.confirmedLocations || [];

  const confirmedLocations = confirmedLocationIds
    .map((id: string) => {
      const location = getLocationById(Number.parseInt(id, 10));
      return location ? (locale === "cy" ? location.welshName : location.name) : null;
    })
    .filter(Boolean);

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
    panelTitle: isPlural ? t.panelTitlePlural : t.panelTitle,
    notificationMessage: isPlural ? t.notificationMessagePlural : t.notificationMessage
  });
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
