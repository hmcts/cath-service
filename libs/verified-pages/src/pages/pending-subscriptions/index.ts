import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import { createCaseSubscription, getAllSubscriptionsByUserId, replaceUserSubscriptions } from "@hmcts/subscription";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  console.log("[pending-subscriptions] Session data:", JSON.stringify(req.session.emailSubscriptions, null, 2));

  const pendingLocationIds = req.session.emailSubscriptions?.pendingSubscriptions || [];
  const pendingCases = req.session.emailSubscriptions?.pendingCaseSubscriptions || [];

  console.log(`[pending-subscriptions] Found ${pendingLocationIds.length} pending locations`);
  console.log(`[pending-subscriptions] Found ${pendingCases.length} pending cases`);

  if (pendingLocationIds.length === 0 && pendingCases.length === 0) {
    console.log("[pending-subscriptions] No pending subscriptions, showing error");
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
      cases: [],
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

  // Sort locations by name
  const sortedLocations = [...pendingLocations].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));

  // Sort cases by case name
  const sortedCases = [...pendingCases].sort((a: any, b: any) => (a.caseName || "").localeCompare(b.caseName || ""));

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  const totalCount = pendingLocations.length + pendingCases.length;
  const isPlural = totalCount > 1;

  res.render("pending-subscriptions/index", {
    ...t,
    locations: sortedLocations,
    cases: sortedCases,
    isPlural,
    confirmButton: isPlural ? t.confirmButtonPlural : t.confirmButton,
    csrfToken: (req as any).csrfToken?.() || ""
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  const userId = req.user.id;
  const { action, locationId, caseId } = req.body;

  const pendingLocationIds = req.session.emailSubscriptions?.pendingSubscriptions || [];
  const pendingCases = req.session.emailSubscriptions?.pendingCaseSubscriptions || [];

  if (action === "remove" && locationId) {
    req.session.emailSubscriptions.pendingSubscriptions = pendingLocationIds.filter((id: string) => id !== locationId);

    const remainingLocationCount = req.session.emailSubscriptions.pendingSubscriptions.length;
    const remainingCaseCount = pendingCases.length;

    if (remainingLocationCount === 0 && remainingCaseCount === 0) {
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
        cases: [],
        showBackToSearch: true
      });
    }

    return res.redirect("/pending-subscriptions");
  }

  if (action === "removeCase" && caseId) {
    req.session.emailSubscriptions.pendingCaseSubscriptions = pendingCases.filter((c: any) => c.id !== caseId);

    const remainingLocationCount = pendingLocationIds.length;
    const remainingCaseCount = req.session.emailSubscriptions.pendingCaseSubscriptions.length;

    if (remainingLocationCount === 0 && remainingCaseCount === 0) {
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
        cases: [],
        showBackToSearch: true
      });
    }

    return res.redirect("/pending-subscriptions");
  }

  if (action === "confirm") {
    if (pendingLocationIds.length === 0 && pendingCases.length === 0) {
      return res.redirect("/subscription-add");
    }

    try {
      if (pendingLocationIds.length > 0) {
        const existingSubscriptions = await getAllSubscriptionsByUserId(userId);
        const existingLocationIds = existingSubscriptions.filter((sub) => sub.locationId !== undefined).map((sub) => sub.locationId!.toString());
        const allLocationIds = [...new Set([...existingLocationIds, ...pendingLocationIds])];

        await replaceUserSubscriptions(userId, allLocationIds);
      }

      if (pendingCases.length > 0) {
        await Promise.all(
          pendingCases.map((caseItem: any) => {
            const searchType = caseItem.searchType || "CASE_NUMBER"; // Default to CASE_NUMBER for backward compatibility
            const searchValue = searchType === "CASE_NAME" ? caseItem.caseName : caseItem.caseNumber;
            return createCaseSubscription(userId, searchType, searchValue, caseItem.caseNumber, caseItem.caseName);
          })
        );
      }

      req.session.emailSubscriptions.confirmationComplete = true;
      req.session.emailSubscriptions.confirmedLocations = pendingLocationIds;
      req.session.emailSubscriptions.confirmedCases = pendingCases;
      delete req.session.emailSubscriptions.pendingSubscriptions;
      delete req.session.emailSubscriptions.pendingCaseSubscriptions;

      res.redirect("/subscription-confirmed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

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

      const totalCount = pendingLocations.length + pendingCases.length;
      const isPlural = totalCount > 1;

      res.render("pending-subscriptions/index", {
        ...t,
        errors: {
          titleText: t.errorSummaryTitle,
          errorList: [{ text: errorMessage }]
        },
        locations: pendingLocations,
        cases: pendingCases,
        isPlural,
        confirmButton: isPlural ? t.confirmButtonPlural : t.confirmButton
      });
    }
  }
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
