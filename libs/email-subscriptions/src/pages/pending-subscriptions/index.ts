import { buildVerifiedUserNavigation } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { replaceUserSubscriptions } from "../../subscription/repository/service.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const pendingLocationIds = req.session.emailSubscriptions?.pendingSubscriptions || [];

  if (pendingLocationIds.length === 0) {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("pending-subscriptions/index", {
      ...t,
      errors: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: t.errorAtLeastOne, href: "#" }]
      },
      locations: [],
      showBackToSearch: true
    });
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
    confirmButton: isPlural ? t.confirmButtonPlural : t.confirmButton
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  // TODO: Remove this mock user ID - for testing only
  const userId = req.user?.id || "test-user-id";
  const { action, locationId } = req.body;

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
          titleText: t.errorSummaryTitle,
          errorList: [{ text: t.errorAtLeastOne, href: "#" }]
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
      await replaceUserSubscriptions(userId, pendingLocationIds);

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
          titleText: t.errorSummaryTitle,
          errorList: [{ text: errorMessage }]
        },
        locations: pendingLocations,
        isPlural,
        confirmButton: isPlural ? t.confirmButtonPlural : t.confirmButton
      });
    }
  }
};

// TODO: Restore auth middleware - temporarily removed for testing
export const GET: RequestHandler[] = [getHandler];
export const POST: RequestHandler[] = [postHandler];
