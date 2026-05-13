import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationsByIds } from "@hmcts/location";
import { Prisma } from "@hmcts/postgres-prisma";
import { createCaseSubscription } from "@hmcts/subscriptions";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  // Merge confirmed case subscriptions into pending if present
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

  // Fetch location data if there are pending location IDs
  let pendingLocations: { locationId: string; name: string }[] = [];
  if (pendingLocationIds.length > 0) {
    const locationIds = pendingLocationIds.map((id: string) => Number.parseInt(id, 10));
    const locations = await getLocationsByIds(locationIds);
    pendingLocations = locations.map((location) => ({
      locationId: location.locationId.toString(),
      name: locale === "cy" ? location.welshName : location.name
    }));
  }

  // If there are case subscriptions, render with them (and any locations)
  if (pendingCaseSubscriptions?.length) {
    return res.render("pending-subscriptions/index", {
      ...t,
      locations: pendingLocations,
      pendingCaseSubscriptions,
      confirmButton: pendingLocations.length > 0 ? t.confirmButton : t.confirmSubscription
    });
  }

  // If no locations and no cases, show error
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

  // Render with just locations
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
    if (!req.user?.id) {
      return res.redirect("/sign-in");
    }

    if (!req.session.emailSubscriptions) {
      req.session.emailSubscriptions = {};
    }

    const hasCases = pendingCaseSubscriptions && pendingCaseSubscriptions.length > 0;
    const hasLocations = pendingLocationIds.length > 0;

    // If there are case subscriptions
    if (hasCases) {
      // If also locations, move both to confirmed state and go to list type selection
      if (hasLocations) {
        req.session.emailSubscriptions.confirmedCaseSubscriptions = pendingCaseSubscriptions;
        delete req.session.emailSubscriptions.pendingCaseSubscriptions;
        delete req.session.emailSubscriptions.caseSearchResults;

        req.session.emailSubscriptions.confirmedLocations = pendingLocationIds;
        delete req.session.emailSubscriptions.pendingSubscriptions;

        return res.redirect("/subscription-add-list");
      }

      // Case-only: create immediately and redirect to confirmation
      for (const sub of pendingCaseSubscriptions) {
        try {
          await createCaseSubscription(req.user.id, sub.searchType, sub.searchValue, sub.caseName, sub.caseNumber);
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            // Already subscribed — treat as success and continue
          } else {
            throw error;
          }
        }
      }

      delete req.session.emailSubscriptions.pendingCaseSubscriptions;
      delete req.session.emailSubscriptions.caseSearchResults;

      req.session.emailSubscriptions.confirmationComplete = true;
      return res.redirect("/subscription-confirmed");
    }

    // If only locations, move to confirmed and go to list type selection
    if (hasLocations) {
      req.session.emailSubscriptions.confirmedLocations = pendingLocationIds;
      delete req.session.emailSubscriptions.pendingSubscriptions;
      return res.redirect("/subscription-add-list");
    }

    // No subscriptions at all
    return res.redirect("/location-name-search");
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
