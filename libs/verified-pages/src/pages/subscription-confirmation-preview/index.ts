import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import { Prisma, prisma } from "@hmcts/postgres-prisma";
import {
  createCaseSubscription,
  createSubscriptionListTypes,
  getAllowedListTypeIdsForLocations,
  getAllSubscriptionsByUserId,
  replaceUserSubscriptions
} from "@hmcts/subscriptions";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const LANGUAGE_DISPLAY: Record<string, { en: string; cy: string }> = {
  ENGLISH: { en: "English", cy: "Saesneg" },
  WELSH: { en: "Welsh", cy: "Cymraeg" },
  ENGLISH_AND_WELSH: { en: "English and Welsh", cy: "Saesneg a Chymraeg" }
};

async function resolveLocationRows(locationIds: string[], locale: string) {
  const rows = await Promise.all(
    locationIds.map(async (id) => {
      const location = await getLocationById(Number.parseInt(id, 10));
      if (!location) return null;
      return { locationId: id, name: locale === "cy" ? location.welshName : location.name };
    })
  );
  return rows.filter(Boolean) as { locationId: string; name: string }[];
}

async function resolveListTypeNames(listTypeIds: number[], locale: string) {
  const listTypeRecords = await prisma.listType.findMany({
    where: { id: { in: listTypeIds } }
  });
  return listTypeRecords.map((lt) => ({
    listTypeId: lt.id,
    name: (locale === "cy" ? lt.welshFriendlyName : lt.friendlyName) ?? lt.friendlyName ?? lt.name
  }));
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const confirmedLocations = req.session.emailSubscriptions?.confirmedLocations || [];
  const pendingListTypeIds = req.session.emailSubscriptions?.pendingListTypeIds || [];
  const pendingLanguage = req.session.emailSubscriptions?.pendingLanguage;
  const confirmedCaseSubscriptions = req.session.emailSubscriptions?.confirmedCaseSubscriptions || [];

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  if (confirmedLocations.length === 0) {
    if (confirmedCaseSubscriptions.length > 0) {
      return res.render("subscription-confirmation-preview/index", {
        ...t,
        confirmedCaseSubscriptions,
        locationRows: [],
        listTypes: [],
        languageDisplay: t.noLanguageSelected
      });
    }

    return res.render("subscription-confirmation-preview/index", {
      ...t,
      confirmedCaseSubscriptions: [],
      locationRows: [],
      listTypes: [],
      languageDisplay: t.noLanguageSelected,
      errors: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: t.errorNoSubscription, href: "#" }]
      }
    });
  }

  const locationRows = await resolveLocationRows(confirmedLocations, locale);
  const listTypes = await resolveListTypeNames(pendingListTypeIds, locale);

  const localeKey = locale === "cy" ? "cy" : "en";
  const languageDisplay = pendingLanguage && LANGUAGE_DISPLAY[pendingLanguage] ? LANGUAGE_DISPLAY[pendingLanguage][localeKey] : t.noLanguageSelected;

  const errors =
    pendingListTypeIds.length === 0 ? { titleText: t.errorSummaryTitle, errorList: [{ text: t.errorNoListType, href: "#select-list-types-link" }] } : undefined;

  res.render("subscription-confirmation-preview/index", {
    ...t,
    confirmedCaseSubscriptions,
    locationRows,
    listTypes,
    languageDisplay,
    pendingLanguage,
    errors
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const { action, listTypeId } = req.body;

  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  const userId = req.user.id;

  if (action === "remove-location" && req.body.locationId) {
    const currentLocations = req.session.emailSubscriptions?.confirmedLocations || [];
    if (!req.session.emailSubscriptions) {
      req.session.emailSubscriptions = {};
    }
    const updatedLocations = currentLocations.filter((id) => id !== req.body.locationId);
    req.session.emailSubscriptions.confirmedLocations = updatedLocations;

    if (updatedLocations.length === 0) {
      delete req.session.emailSubscriptions.pendingListTypeIds;
      delete req.session.emailSubscriptions.pendingLanguage;
    }

    return res.redirect("/subscription-confirmation-preview");
  }

  if (action === "remove-list-type" && listTypeId) {
    const currentIds = req.session.emailSubscriptions?.pendingListTypeIds || [];
    const idToRemove = Number(listTypeId);

    if (!req.session.emailSubscriptions) {
      req.session.emailSubscriptions = {};
    }
    req.session.emailSubscriptions.pendingListTypeIds = currentIds.filter((id) => id !== idToRemove);

    return res.redirect("/subscription-confirmation-preview");
  }

  if (action === "remove-case-subscription") {
    const caseIndex = Number.parseInt(req.body.caseIndex, 10);
    const currentCases = req.session.emailSubscriptions?.confirmedCaseSubscriptions || [];

    if (!req.session.emailSubscriptions) {
      req.session.emailSubscriptions = {};
    }
    if (!Number.isNaN(caseIndex)) {
      const updated = [...currentCases];
      updated.splice(caseIndex, 1);
      req.session.emailSubscriptions.confirmedCaseSubscriptions = updated;
    }

    return res.redirect("/subscription-confirmation-preview");
  }

  if (action === "change-version") {
    return res.redirect("/subscription-add-list-language");
  }

  if (action === "confirm") {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    const t = locale === "cy" ? cy : en;
    const localeKey = locale === "cy" ? "cy" : "en";
    const confirmedLocations = req.session.emailSubscriptions?.confirmedLocations || [];
    const pendingListTypeIds = req.session.emailSubscriptions?.pendingListTypeIds || [];
    const pendingLanguage = req.session.emailSubscriptions?.pendingLanguage;
    const confirmedCaseSubscriptions = req.session.emailSubscriptions?.confirmedCaseSubscriptions || [];

    if (confirmedLocations.length === 0 && confirmedCaseSubscriptions.length > 0) {
      for (const sub of confirmedCaseSubscriptions) {
        try {
          await createCaseSubscription(userId, sub.searchType, sub.searchValue, sub.caseName, sub.caseNumber);
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            // Already subscribed — treat as success and continue
          } else {
            throw error;
          }
        }
      }

      if (!req.session.emailSubscriptions) {
        req.session.emailSubscriptions = {};
      }
      delete req.session.emailSubscriptions.confirmedCaseSubscriptions;
      req.session.emailSubscriptions.confirmationComplete = true;

      return res.redirect("/subscription-confirmed");
    }

    if (pendingListTypeIds.length === 0 || !pendingLanguage) {
      const locationRows = await resolveLocationRows(confirmedLocations, locale);
      const listTypes = await resolveListTypeNames(pendingListTypeIds, locale);

      return res.render("subscription-confirmation-preview/index", {
        ...t,
        confirmedCaseSubscriptions,
        locationRows,
        listTypes,
        languageDisplay: t.noLanguageSelected,
        errors: {
          titleText: t.errorSummaryTitle,
          errorList: [{ text: t.errorNoData, href: "#" }]
        }
      });
    }

    const resolvedLocationIds = (
      await Promise.all(
        confirmedLocations.map(async (id) => {
          const location = await getLocationById(Number.parseInt(id, 10));
          return location ? id : null;
        })
      )
    ).filter((id): id is string => id !== null);

    if (resolvedLocationIds.length === 0) {
      const listTypes = await resolveListTypeNames(pendingListTypeIds, locale);
      const languageDisplay = LANGUAGE_DISPLAY[pendingLanguage] ? LANGUAGE_DISPLAY[pendingLanguage][localeKey] : t.noLanguageSelected;

      return res.render("subscription-confirmation-preview/index", {
        ...t,
        confirmedCaseSubscriptions,
        locationRows: [],
        listTypes,
        languageDisplay,
        errors: {
          titleText: t.errorSummaryTitle,
          errorList: [{ text: t.errorNoSubscription, href: "#" }]
        }
      });
    }

    const allowedListTypeIds = await getAllowedListTypeIdsForLocations(resolvedLocationIds.map((id) => Number.parseInt(id, 10)));
    const validListTypeIds = pendingListTypeIds.filter((id) => allowedListTypeIds.includes(id));

    if (validListTypeIds.length === 0) {
      const locationRows = await resolveLocationRows(resolvedLocationIds, locale);
      const languageDisplay = LANGUAGE_DISPLAY[pendingLanguage] ? LANGUAGE_DISPLAY[pendingLanguage][localeKey] : t.noLanguageSelected;

      return res.render("subscription-confirmation-preview/index", {
        ...t,
        confirmedCaseSubscriptions,
        locationRows,
        listTypes: [],
        languageDisplay,
        errors: {
          titleText: t.errorSummaryTitle,
          errorList: [{ text: t.errorNoListType, href: "#select-list-types-link" }]
        }
      });
    }

    for (const sub of confirmedCaseSubscriptions) {
      try {
        await createCaseSubscription(userId, sub.searchType, sub.searchValue, sub.caseName, sub.caseNumber);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          // Already subscribed — treat as success and continue
        } else {
          throw error;
        }
      }
    }

    const existingSubscriptions = await getAllSubscriptionsByUserId(userId);
    const existingLocationIds = existingSubscriptions.map((sub) => sub.locationId.toString());
    const allLocationIds = [...new Set([...existingLocationIds, ...resolvedLocationIds])];
    await replaceUserSubscriptions(userId, allLocationIds);

    await createSubscriptionListTypes(userId, validListTypeIds, pendingLanguage);

    if (!req.session.emailSubscriptions) {
      req.session.emailSubscriptions = {};
    }
    delete req.session.emailSubscriptions.pendingListTypeIds;
    delete req.session.emailSubscriptions.pendingLanguage;
    delete req.session.emailSubscriptions.confirmedCaseSubscriptions;
    req.session.emailSubscriptions.confirmationComplete = true;

    return res.redirect("/subscription-confirmed");
  }

  res.redirect("/subscription-confirmation-preview");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
