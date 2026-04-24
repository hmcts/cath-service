import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import { Prisma } from "@hmcts/postgres";
import {
  createCaseSubscription,
  deletePendingCaseSubscriptions,
  deletePendingSubscriptions,
  savePendingCaseSubscriptions,
  savePendingSubscriptions
} from "@hmcts/subscriptions";
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

  const pendingLocations = await fetchLocations();
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
    if (pendingCaseSubscriptions?.length) {
      if (!req.user?.id) {
        return res.redirect("/sign-in");
      }

      if (!req.session.emailSubscriptions) {
        req.session.emailSubscriptions = {};
      }

      if (pendingLocationIds.length > 0) {
        // Defer case subscription creation to confirmation-preview so the user
        // can review both case and location subscriptions together.
        req.session.emailSubscriptions.confirmedCaseSubscriptions = pendingCaseSubscriptions;
        delete req.session.emailSubscriptions.pendingCaseSubscriptions;
        delete req.session.emailSubscriptions.caseSearchResults;

        if (req.user?.id) {
          await deletePendingCaseSubscriptions(req.app.locals.redisClient, req.user.id);
        }

        req.session.emailSubscriptions.confirmedLocations = pendingLocationIds;
        delete req.session.emailSubscriptions.pendingSubscriptions;

        if (req.user?.id) {
          await deletePendingSubscriptions(req.app.locals.redisClient, req.user.id);
        }

        return res.redirect("/subscription-add-list");
      }

      // Case-only: create immediately and redirect to confirmation.
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

      if (req.user?.id) {
        await deletePendingCaseSubscriptions(req.app.locals.redisClient, req.user.id);
      }

      req.session.emailSubscriptions.confirmationComplete = true;
      return res.redirect("/subscription-confirmed");
    }

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
