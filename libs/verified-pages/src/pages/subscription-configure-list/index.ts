import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import { prisma } from "@hmcts/postgres-prisma";
import { getAllSubscriptionsByUserId, getSubscriptionListTypesByUserId } from "@hmcts/subscriptions";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

function buildListTypeGroups(listTypes: { listTypeId: number; name: string; checked: boolean }[]): ListTypeGroup[] {
  const map = new Map<string, { listTypeId: number; name: string; checked: boolean }[]>();
  for (const lt of listTypes) {
    const letter = lt.name.charAt(0).toUpperCase();
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(lt);
  }
  return [...map.entries()].map(([letter, items]) => ({ letter, items }));
}

async function fetchListTypeGroups(userId: string, locale: string): Promise<ListTypeGroup[]> {
  const [subscriptions, existingListTypeSubscription] = await Promise.all([getAllSubscriptionsByUserId(userId), getSubscriptionListTypesByUserId(userId)]);

  if (subscriptions.length === 0) {
    return [];
  }

  const locations = await Promise.all(subscriptions.map((s) => getLocationById(s.locationId)));
  const subJurisdictionIds = [...new Set(locations.flatMap((l) => l?.subJurisdictions ?? []))];

  if (subJurisdictionIds.length === 0) {
    return [];
  }

  const listTypeRecords = await prisma.listType.findMany({
    where: {
      deletedAt: null,
      subJurisdictions: {
        some: { subJurisdictionId: { in: subJurisdictionIds } }
      }
    },
    orderBy: { friendlyName: "asc" }
  });

  const subscribedListTypeIds = new Set(existingListTypeSubscription?.listTypeIds ?? []);

  const listTypes = listTypeRecords.map((lt) => ({
    listTypeId: lt.id,
    name: (locale === "cy" ? lt.welshFriendlyName : lt.friendlyName) ?? lt.friendlyName ?? lt.name,
    checked: subscribedListTypeIds.has(lt.id)
  }));

  return buildListTypeGroups(listTypes);
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  const listTypeGroups = await fetchListTypeGroups(req.user.id, locale);

  res.render("subscription-configure-list/index", {
    ...t,
    listTypeGroups
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const raw = req.body.selectedListTypes;
  let selectedListTypes: string[];
  if (Array.isArray(raw)) {
    selectedListTypes = raw;
  } else {
    selectedListTypes = raw ? [raw] : [];
  }

  if (selectedListTypes.length === 0) {
    if (!req.user?.id) {
      return res.redirect("/sign-in");
    }

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    const listTypeGroups = await fetchListTypeGroups(req.user.id, locale);

    return res.render("subscription-configure-list/index", {
      ...t,
      listTypeGroups,
      errors: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: t.errorSelectListType, href: "#list-types-table" }]
      }
    });
  }

  if (!req.session.emailSubscriptions) {
    req.session.emailSubscriptions = {};
  }

  req.session.emailSubscriptions.pendingListTypeIds = selectedListTypes.map(Number);

  res.redirect("/subscription-configure-list-language");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];

interface ListTypeGroup {
  letter: string;
  items: { listTypeId: number; name: string; checked: boolean }[];
}
