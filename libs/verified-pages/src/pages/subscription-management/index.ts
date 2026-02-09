import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { mockListTypes } from "@hmcts/list-types-common";
import { getAllSubscriptionsByUserId, getCaseSubscriptionsByUserId } from "@hmcts/subscription";
import { getListTypeSubscriptionsByUserId } from "@hmcts/subscription-list-types";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  // Clear any existing list type subscription session data when returning to management page
  if (req.session.listTypeSubscription) {
    delete req.session.listTypeSubscription;
  }

  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  const userId = req.user.id;
  const view = (req.query.view as string) || "all";

  try {
    const [courtSubscriptions, caseSubscriptions, listTypeSubscriptions] = await Promise.all([
      getAllSubscriptionsByUserId(userId, locale),
      getCaseSubscriptionsByUserId(userId),
      getListTypeSubscriptionsByUserId(userId)
    ]);

    const courtSubscriptionsWithDetails = sortCourtSubscriptions(courtSubscriptions);
    const deduplicatedCaseSubscriptions = deduplicateCaseSubscriptions(caseSubscriptions);
    const sortedCaseSubscriptions = sortCaseSubscriptions(deduplicatedCaseSubscriptions);

    const listTypeSubscriptionsWithDetails = listTypeSubscriptions.map((sub) => {
      const listType = mockListTypes.find((lt) => lt.id === sub.listTypeId);
      const languageDisplay = {
        ENGLISH: locale === "cy" ? "Saesneg" : "English",
        WELSH: locale === "cy" ? "Cymraeg" : "Welsh",
        BOTH: locale === "cy" ? "Cymraeg a Saesneg" : "English and Welsh"
      };

      return {
        ...sub,
        listTypeName: listType ? (locale === "cy" ? listType.welshFriendlyName : listType.englishFriendlyName) : "Unknown",
        languageDisplay: languageDisplay[sub.language as keyof typeof languageDisplay] || sub.language
      };
    });

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    const totalCount = courtSubscriptions.length + deduplicatedCaseSubscriptions.length;

    res.render("subscription-management/index", {
      ...t,
      courtSubscriptions: courtSubscriptionsWithDetails,
      caseSubscriptions: sortedCaseSubscriptions,
      courtCount: courtSubscriptions.length,
      caseCount: deduplicatedCaseSubscriptions.length,
      totalCount,
      currentView: view,
      listTypeSubscriptions: listTypeSubscriptionsWithDetails,
      listTypeCount: listTypeSubscriptions.length,
      csrfToken: (req as any).csrfToken?.() || ""
    });
  } catch (error) {
    console.error(`Error retrieving subscriptions for user ${userId}:`, error);

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    res.render("subscription-management/index", {
      ...t,
      courtSubscriptions: [],
      caseSubscriptions: [],
      courtCount: 0,
      caseCount: 0,
      totalCount: 0,
      currentView: view,
      listTypeSubscriptions: [],
      listTypeCount: 0,
      csrfToken: (req as any).csrfToken?.() || ""
    });
  }
};

const sortCourtSubscriptions = (subscriptions: any[]): any[] => {
  return subscriptions
    .map((sub) => ({
      ...sub,
      locationName: sub.courtOrTribunalName
    }))
    .sort((a, b) => (a.locationName || "").localeCompare(b.locationName || ""));
};

const deduplicateCaseSubscriptions = (subscriptions: any[]): any[] => {
  const seen = new Map<string, any>();

  for (const sub of subscriptions) {
    const caseNumber = sub.caseNumber || "";
    const caseName = sub.caseName || "";
    const key = `${caseNumber}:${caseName}`;

    if (!seen.has(key)) {
      seen.set(key, { ...sub, allSubscriptionIds: [sub.subscriptionId] });
    } else {
      const existing = seen.get(key);
      existing.allSubscriptionIds.push(sub.subscriptionId);
    }
  }

  return Array.from(seen.values());
};

const sortCaseSubscriptions = (subscriptions: any[]): any[] => {
  return [...subscriptions].sort((a, b) => (a.caseName || "").localeCompare(b.caseName || ""));
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
