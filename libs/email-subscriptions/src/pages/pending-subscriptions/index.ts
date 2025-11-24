import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { createMultipleSubscriptions } from "../../subscription/service.js";

const en = {
  title: "Confirm your email subscriptions",
  heading: "Confirm your email subscriptions",
  reviewMessage: "Review your subscription before confirming:",
  reviewMessagePlural: "Review your subscriptions before confirming:",
  confirmButton: "Confirm subscription",
  confirmButtonPlural: "Confirm subscriptions",
  cancelLink: "Cancel",
  removeLink: "Remove",
  notificationMessage: "You will receive email notifications when new hearing publications are available for this court.",
  notificationMessagePlural: "You will receive email notifications when new hearing publications are available for these courts.",
  errorAtLeastOne: "You must subscribe to at least one court or tribunal",
  backToSearch: "Back to search",
  back: "Back"
};

const cy = {
  title: "Cadarnhau eich tanysgrifiadau e-bost",
  heading: "Cadarnhau eich tanysgrifiadau e-bost",
  reviewMessage: "Adolygu eich tanysgrifiad cyn cadarnhau:",
  reviewMessagePlural: "Adolygu eich tanysgrifiadau cyn cadarnhau:",
  confirmButton: "Cadarnhau tanysgrifiad",
  confirmButtonPlural: "Cadarnhau tanysgrifiadau",
  cancelLink: "Canslo",
  removeLink: "Dileu",
  notificationMessage: "Byddwch yn derbyn hysbysiadau e-bost pan fydd cyhoeddiadau gwrandawiad newydd ar gael ar gyfer y llys hwn.",
  notificationMessagePlural: "Byddwch yn derbyn hysbysiadau e-bost pan fydd cyhoeddiadau gwrandawiad newydd ar gael ar gyfer y llysoedd hyn.",
  errorAtLeastOne: "Mae'n rhaid i chi danysgrifio i o leiaf un llys neu dribiwnlys",
  backToSearch: "Yn ôl i chwilio",
  back: "Yn ôl"
};

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const userId = req.user?.id;

  if (!userId) {
    return res.redirect("/login");
  }

  const pendingLocationIds = req.session.emailSubscriptions?.pendingSubscriptions || [];

  if (pendingLocationIds.length === 0) {
    return res.redirect("/location-name-search");
  }

  const pendingLocations = pendingLocationIds
    .map((id: string) => {
      const location = getLocationById(Number.parseInt(id, 10));
      return location
        ? {
            locationId: id,
            name: locale === "cy" ? location.welshName : location.name
          }
        : null;
    })
    .filter(Boolean);

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  const isPlural = pendingLocations.length > 1;

  res.render("pending-subscriptions/index", {
    ...t,
    locations: pendingLocations,
    isPlural,
    reviewMessage: isPlural ? t.reviewMessagePlural : t.reviewMessage,
    confirmButton: isPlural ? t.confirmButtonPlural : t.confirmButton,
    notificationMessage: isPlural ? t.notificationMessagePlural : t.notificationMessage
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const userId = req.user?.id;
  const { action, locationId } = req.body;

  if (!userId) {
    return res.redirect("/login");
  }

  const pendingLocationIds = req.session.emailSubscriptions?.pendingSubscriptions || [];

  if (action === "remove" && locationId) {
    req.session.emailSubscriptions.pendingSubscriptions = pendingLocationIds.filter((id: string) => id !== locationId);

    if (req.session.emailSubscriptions.pendingSubscriptions.length === 0) {
      if (!res.locals.navigation) {
        res.locals.navigation = {};
      }
      res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

      return res.render("pending-subscriptions/index", {
        ...t,
        errors: {
          titleText: "There is a problem",
          errorList: [{ text: t.errorAtLeastOne }]
        },
        locations: [],
        showBackToSearch: true
      });
    }

    return res.redirect("/pending-subscriptions");
  }

  if (action === "confirm") {
    if (pendingLocationIds.length === 0) {
      return res.redirect("/location-name-search");
    }

    try {
      await createMultipleSubscriptions(userId, pendingLocationIds);

      req.session.emailSubscriptions.confirmationComplete = true;
      req.session.emailSubscriptions.confirmedLocations = pendingLocationIds;
      delete req.session.emailSubscriptions.pendingSubscriptions;

      res.redirect("/subscription-confirmed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      const pendingLocations = pendingLocationIds
        .map((id: string) => {
          const location = getLocationById(Number.parseInt(id, 10));
          return location
            ? {
                locationId: id,
                name: locale === "cy" ? location.welshName : location.name
              }
            : null;
        })
        .filter(Boolean);

      if (!res.locals.navigation) {
        res.locals.navigation = {};
      }
      res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

      const isPlural = pendingLocations.length > 1;

      res.render("pending-subscriptions/index", {
        ...t,
        errors: {
          titleText: "There is a problem",
          errorList: [{ text: errorMessage }]
        },
        locations: pendingLocations,
        isPlural,
        reviewMessage: isPlural ? t.reviewMessagePlural : t.reviewMessage,
        confirmButton: isPlural ? t.confirmButtonPlural : t.confirmButton,
        notificationMessage: isPlural ? t.notificationMessagePlural : t.notificationMessage
      });
    }
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
