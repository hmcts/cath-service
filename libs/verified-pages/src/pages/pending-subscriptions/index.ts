import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Request, RequestHandler, Response } from "express";
import { deletePendingSubscriptions, savePendingSubscriptions } from "../../pending-subscriptions-store.js";
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

  const pendingLocations = (
    await Promise.all(
      pendingLocationIds.map(async (id: string) => {
        const location = await getLocationById(Number.parseInt(id, 10));
        return location
          ? {
              locationId: id,
              name: locale === "cy" ? location.welshName : location.name
            }
          : null;
      })
    )
  ).filter(Boolean);

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

  const { action, locationId } = req.body;

  const pendingLocationIds = req.session.emailSubscriptions?.pendingSubscriptions || [];

  if (action === "remove" && locationId) {
    if (!req.session.emailSubscriptions) {
      req.session.emailSubscriptions = {};
    }
    const updatedPending = pendingLocationIds.filter((id: string) => id !== locationId);
    req.session.emailSubscriptions.pendingSubscriptions = updatedPending;

    const confirmedLocations = req.session.emailSubscriptions.confirmedLocations || [];
    req.session.emailSubscriptions.confirmedLocations = confirmedLocations.filter((id: string) => id !== locationId);

    if (updatedPending.length === 0) {
      if (req.user?.id) {
        await deletePendingSubscriptions(req.app.locals.redisClient, req.user.id);
      }

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

    if (req.user?.id) {
      await savePendingSubscriptions(req.app.locals.redisClient, req.user.id, updatedPending);
    }

    return res.redirect("/pending-subscriptions");
  }

  if (action === "confirm") {
    if (pendingLocationIds.length === 0) {
      return res.redirect("/location-name-search");
    }

    if (!req.session.emailSubscriptions) {
      req.session.emailSubscriptions = {};
    }
    req.session.emailSubscriptions.confirmedLocations = pendingLocationIds;
    delete req.session.emailSubscriptions.pendingSubscriptions;

    if (req.user?.id) {
      await deletePendingSubscriptions(req.app.locals.redisClient, req.user.id);
    }

    res.redirect("/subscription-add-list");
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
