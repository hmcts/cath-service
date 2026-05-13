import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationsByIds } from "@hmcts/location";
import { getAllSubscriptionsByUserId, replaceUserSubscriptions } from "@hmcts/subscriptions";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (req.session.emailSubscriptions?.confirmedCaseSubscriptions?.length) {
    const merged = [...req.session.emailSubscriptions.confirmedCaseSubscriptions, ...(req.session.emailSubscriptions.pendingCaseSubscriptions || [])];
    const seen = new Set<string>();
    req.session.emailSubscriptions.pendingCaseSubscriptions = merged.filter((sub) => {
      const key = sub.caseNumber ?? `${sub.searchType}:${sub.searchValue}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    delete req.session.emailSubscriptions.confirmedCaseSubscriptions;
  }

  const pendingLocationIds = [
    ...new Set([...(req.session.emailSubscriptions?.pendingSubscriptions || []), ...(req.session.emailSubscriptions?.confirmedLocations || [])])
  ];
  const pendingCaseSubscriptions = req.session.emailSubscriptions?.pendingCaseSubscriptions;

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  const fetchLocations = async () => {
    if (pendingLocationIds.length === 0) return [];
    return (
      await Promise.all(
        pendingLocationIds.map(async (id: string) => {
          const location = await getLocationById(Number.parseInt(id, 10));
          return location ? { locationId: id, name: locale === "cy" ? location.welshName : location.name } : null;
        })
      )
    ).filter(Boolean) as { locationId: string; name: string }[];
  };

  if (pendingCaseSubscriptions?.length) {
    const locations = await fetchLocations();
    return res.render("pending-subscriptions/index", {
      ...t,
      locations,
      pendingCaseSubscriptions,
      confirmButton: locations.length > 0 ? t.confirmButton : t.confirmSubscription
    });
  }

  if (pendingLocationIds.length === 0) {
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

  const locationIds = pendingLocationIds.map((id: string) => Number.parseInt(id, 10));
  const locations = await getLocationsByIds(locationIds);

  const pendingLocations = locations.map((location) => ({
    locationId: location.locationId.toString(),
    name: locale === "cy" ? location.welshName : location.name
  }));

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

  const pendingLocationIds = [
    ...new Set([...(req.session.emailSubscriptions?.pendingSubscriptions || []), ...(req.session.emailSubscriptions?.confirmedLocations || [])])
  ];
  const pendingCaseSubscriptions = req.session.emailSubscriptions?.pendingCaseSubscriptions;

  if (action === "remove-case") {
    const caseIndex = Number.parseInt(req.body.caseIndex, 10);
    if (!req.session.emailSubscriptions) {
      req.session.emailSubscriptions = {};
    }
    const updated = [...(pendingCaseSubscriptions || [])];
    if (!Number.isNaN(caseIndex)) {
      updated.splice(caseIndex, 1);
    }
    req.session.emailSubscriptions.pendingCaseSubscriptions = updated;

    if (req.user?.id) {
      if (updated.length > 0) {
        await savePendingCaseSubscriptions(req.app.locals.redisClient, req.user.id, updated);
      } else {
        await deletePendingCaseSubscriptions(req.app.locals.redisClient, req.user.id);
      }
    }

    return res.redirect("/pending-subscriptions");
  }

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

      if (pendingCaseSubscriptions?.length) {
        return res.redirect("/pending-subscriptions");
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
    if (!req.user?.id) {
      return res.redirect("/sign-in");
    }

    const userId = req.user.id;

    if (pendingLocationIds.length === 0) {
      return res.redirect("/location-name-search");
    }

    if (!req.session.emailSubscriptions) {
      req.session.emailSubscriptions = {};
    }

    try {
      const existingSubscriptions = await getAllSubscriptionsByUserId(userId);
      const existingLocationIds = existingSubscriptions
        .filter((sub): sub is { locationId: number } => "locationId" in sub)
        .map((sub) => sub.locationId.toString());
      const allLocationIds = [...new Set([...existingLocationIds, ...pendingLocationIds])];

      await replaceUserSubscriptions(userId, allLocationIds);

      req.session.emailSubscriptions.confirmationComplete = true;
      req.session.emailSubscriptions.confirmedLocations = pendingLocationIds;
      delete req.session.emailSubscriptions.pendingSubscriptions;

      res.redirect("/subscription-confirmed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      const locationIds = pendingLocationIds.map((id: string) => Number.parseInt(id, 10));
      const locations = await getLocationsByIds(locationIds);

      const pendingLocations = locations.map((location) => ({
        locationId: location.locationId.toString(),
        name: locale === "cy" ? location.welshName : location.name
      }));

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

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
