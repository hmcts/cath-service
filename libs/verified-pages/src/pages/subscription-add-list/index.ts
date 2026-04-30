import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import { prisma } from "@hmcts/postgres-prisma";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

function buildListTypeGroups(listTypes: { listTypeId: number; name: string }[]): ListTypeGroup[] {
  const map = new Map<string, { listTypeId: number; name: string }[]>();
  for (const lt of listTypes) {
    const letter = lt.name.charAt(0).toUpperCase();
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(lt);
  }
  return [...map.entries()].map(([letter, items]) => ({ letter, items }));
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const confirmedLocationIds = req.session.emailSubscriptions?.confirmedLocations || [];

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  if (confirmedLocationIds.length === 0) {
    return res.render("subscription-add-list/index", {
      ...t,
      listTypeGroups: []
    });
  }

  const locations = await Promise.all(confirmedLocationIds.map((id) => getLocationById(Number.parseInt(id, 10))));

  const subJurisdictionIds = [...new Set(locations.flatMap((l) => l?.subJurisdictions ?? []))];

  if (subJurisdictionIds.length === 0) {
    return res.render("subscription-add-list/index", {
      ...t,
      listTypeGroups: []
    });
  }

  const listTypeRecords = await prisma.listType.findMany({
    where: {
      deletedAt: null,
      subJurisdictions: {
        some: { subJurisdictionId: { in: subJurisdictionIds } }
      }
    }
  });

  const listTypes = listTypeRecords
    .map((lt) => ({
      listTypeId: lt.id,
      name: (locale === "cy" ? lt.welshFriendlyName : lt.friendlyName) ?? lt.friendlyName ?? lt.name
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  res.render("subscription-add-list/index", {
    ...t,
    listTypeGroups: buildListTypeGroups(listTypes)
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const raw = req.body.selectedListTypes;
  const selectedListTypes = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (selectedListTypes.length === 0) {
    const confirmedLocationIds = req.session.emailSubscriptions?.confirmedLocations || [];

    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    const locations = await Promise.all(confirmedLocationIds.map((id) => getLocationById(Number.parseInt(id, 10))));

    const subJurisdictionIds = [...new Set(locations.flatMap((l) => l?.subJurisdictions ?? []))];

    let listTypeGroups: ListTypeGroup[] = [];

    if (subJurisdictionIds.length > 0) {
      const listTypeRecords = await prisma.listType.findMany({
        where: {
          deletedAt: null,
          subJurisdictions: {
            some: { subJurisdictionId: { in: subJurisdictionIds } }
          }
        }
      });

      const listTypes = listTypeRecords
        .map((lt) => ({
          listTypeId: lt.id,
          name: (locale === "cy" ? lt.welshFriendlyName : lt.friendlyName) ?? lt.friendlyName ?? lt.name
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      listTypeGroups = buildListTypeGroups(listTypes);
    }

    return res.render("subscription-add-list/index", {
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

  res.redirect("/subscription-add-list-language");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];

interface ListTypeGroup {
  letter: string;
  items: { listTypeId: number; name: string }[];
}
