import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import { createCaseSubscription, getAllSubscriptionsByUserId, replaceUserSubscriptions } from "@hmcts/subscriptions";
import type { Request, RequestHandler, Response } from "express";
import { getCsrfToken } from "../../utils/csrf.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const pendingLocationIds = req.session.emailSubscriptions?.pendingSubscriptions || [];
  const pendingCases = req.session.emailSubscriptions?.pendingCaseSubscriptions || [];

  if (pendingLocationIds.length === 0 && pendingCases.length === 0) {
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
    csrfToken: getCsrfToken(req)
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
    return handleRemoveLocation(req, res, locationId, pendingLocationIds, pendingCases, locale, t);
  }

  if (action === "removeCase" && caseId) {
    return handleRemoveCase(req, res, caseId, pendingLocationIds, pendingCases, locale, t);
  }

  if (action === "confirm") {
    return handleConfirm(req, res, userId, pendingLocationIds, pendingCases, locale, t);
  }
};

const handleRemoveLocation = (
  req: Request,
  res: Response,
  locationId: string,
  pendingLocationIds: string[],
  pendingCases: any[],
  locale: string,
  t: typeof en
) => {
  req.session.emailSubscriptions.pendingSubscriptions = pendingLocationIds.filter((id: string) => id !== locationId);

  const remainingLocationCount = req.session.emailSubscriptions.pendingSubscriptions.length;
  const remainingCaseCount = pendingCases.length;

  if (remainingLocationCount === 0 && remainingCaseCount === 0) {
    return renderEmptyPendingSubscriptions(res, req.path, locale, t);
  }

  return res.redirect("/pending-subscriptions");
};

const handleRemoveCase = (req: Request, res: Response, caseId: string, pendingLocationIds: string[], pendingCases: any[], locale: string, t: typeof en) => {
  req.session.emailSubscriptions.pendingCaseSubscriptions = pendingCases.filter((c: any) => c.id !== caseId);

  const remainingLocationCount = pendingLocationIds.length;
  const remainingCaseCount = req.session.emailSubscriptions.pendingCaseSubscriptions.length;

  if (remainingLocationCount === 0 && remainingCaseCount === 0) {
    return renderEmptyPendingSubscriptions(res, req.path, locale, t);
  }

  return res.redirect("/pending-subscriptions");
};

const handleConfirm = async (req: Request, res: Response, userId: string, pendingLocationIds: string[], pendingCases: any[], locale: string, t: typeof en) => {
  if (pendingLocationIds.length === 0 && pendingCases.length === 0) {
    return res.redirect("/subscription-add");
  }

  try {
    if (pendingLocationIds.length > 0) {
      await createLocationSubscriptions(userId, pendingLocationIds);
    }

    if (pendingCases.length > 0) {
      await createCaseSubscriptions(userId, pendingCases);
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
      isPlural
    });
  }
};

const createLocationSubscriptions = async (userId: string, pendingLocationIds: string[]): Promise<void> => {
  const existingSubscriptions = await getAllSubscriptionsByUserId(userId);
  const existingLocationIds = existingSubscriptions.filter((sub) => sub.locationId !== undefined).map((sub) => sub.locationId!.toString());
  const allLocationIds = [...new Set([...existingLocationIds, ...pendingLocationIds])];

  await replaceUserSubscriptions(userId, allLocationIds);
};

const createCaseSubscriptions = async (userId: string, pendingCases: any[]): Promise<void> => {
  const uniqueCases = deduplicateCases(pendingCases);

  await Promise.all(
    uniqueCases.map((caseItem: any) => {
      const searchType = caseItem.searchType || "CASE_NUMBER";
      const searchValue = searchType === "CASE_NAME" ? caseItem.caseName : caseItem.caseNumber;
      return createCaseSubscription(userId, searchType, searchValue, caseItem.caseNumber, caseItem.caseName);
    })
  );
};

const deduplicateCases = (pendingCases: any[]): any[] => {
  return pendingCases.reduce((acc: any[], caseItem: any) => {
    const searchType = caseItem.searchType || "CASE_NUMBER";
    const searchValue = searchType === "CASE_NAME" ? caseItem.caseName : caseItem.caseNumber;
    const key = `${searchType}:${searchValue}`;

    if (
      !acc.some((c: any) => {
        const cSearchType = c.searchType || "CASE_NUMBER";
        const cSearchValue = cSearchType === "CASE_NAME" ? c.caseName : c.caseNumber;
        return `${cSearchType}:${cSearchValue}` === key;
      })
    ) {
      acc.push(caseItem);
    }
    return acc;
  }, []);
};

const renderEmptyPendingSubscriptions = (res: Response, path: string, locale: string, t: typeof en) => {
  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(path, locale);

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
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
