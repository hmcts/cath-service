import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { type ListType, mockListTypes } from "@hmcts/list-types-common";
import type { Request, RequestHandler, Response } from "express";
import { getCsrfToken } from "../../utils/csrf.js";
import "../../types/session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface CheckboxItem {
  value: string;
  text: string;
  checked: boolean;
}

interface GroupedListTypes {
  letter: string;
  items: CheckboxItem[];
}

function groupListTypesByLetter(listTypes: ListType[], locale: string, selectedIds: number[] = []): GroupedListTypes[] {
  const grouped: Record<string, ListType[]> = {};

  for (const listType of listTypes) {
    const name = locale === "cy" ? listType.welshFriendlyName : listType.englishFriendlyName;
    const firstLetter = name.charAt(0).toUpperCase();

    if (!grouped[firstLetter]) {
      grouped[firstLetter] = [];
    }
    grouped[firstLetter].push(listType);
  }

  return Object.keys(grouped)
    .sort()
    .map((letter) => ({
      letter,
      items: grouped[letter]
        .sort((a, b) => {
          const aName = locale === "cy" ? a.welshFriendlyName : a.englishFriendlyName;
          const bName = locale === "cy" ? b.welshFriendlyName : b.englishFriendlyName;
          return aName.localeCompare(bName);
        })
        .map((listType) => ({
          value: listType.id.toString(),
          text: locale === "cy" ? listType.welshFriendlyName : listType.englishFriendlyName,
          checked: selectedIds.includes(listType.id)
        }))
    }));
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  const selectedIds = req.session.listTypeSubscription?.selectedListTypeIds || [];
  const groupedListTypes = groupListTypesByLetter(mockListTypes, locale, selectedIds);

  console.log("DEBUG subscription-list-types GET:");
  console.log("- mockListTypes length:", mockListTypes.length);
  console.log("- groupedListTypes length:", groupedListTypes.length);
  console.log("- groupedListTypes:", JSON.stringify(groupedListTypes, null, 2));

  res.render("subscription-list-types/index", {
    ...t,
    locale,
    groupedListTypes,
    data: req.session.listTypeSubscription || {},
    csrfToken: getCsrfToken(req)
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const { listTypes } = req.body;

  const selectedListTypeIds = Array.isArray(listTypes) ? listTypes : listTypes ? [listTypes] : [];

  if (selectedListTypeIds.length === 0) {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    const groupedListTypes = groupListTypesByLetter(mockListTypes, locale, []);

    return res.render("subscription-list-types/index", {
      ...t,
      locale,
      errors: [{ text: t.errorRequired, href: "#list-types" }],
      groupedListTypes,
      data: req.body,
      csrfToken: getCsrfToken(req)
    });
  }

  // Validate list type IDs against mockListTypes
  const validIds = selectedListTypeIds
    .map((id: string) => Number.parseInt(id, 10))
    .filter((id) => !Number.isNaN(id) && mockListTypes.some((lt) => lt.id === id));

  if (validIds.length === 0) {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    const groupedListTypes = groupListTypesByLetter(mockListTypes, locale, []);

    return res.render("subscription-list-types/index", {
      ...t,
      locale,
      errors: [{ text: t.errorInvalidListTypes, href: "#list-types" }],
      groupedListTypes,
      data: req.body,
      csrfToken: getCsrfToken(req)
    });
  }

  if (!req.session.listTypeSubscription) {
    req.session.listTypeSubscription = {};
  }

  req.session.listTypeSubscription.selectedListTypeIds = validIds;

  req.session.save((err: Error | null) => {
    if (err) {
      console.error("Error saving session", { errorMessage: err.message });

      if (!res.locals.navigation) {
        res.locals.navigation = {};
      }
      res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

      const groupedListTypes = groupListTypesByLetter(mockListTypes, locale, []);

      return res.render("subscription-list-types/index", {
        ...t,
        locale,
        errors: [{ text: t.errorSessionSave, href: "#list-types" }],
        groupedListTypes,
        data: req.body,
        csrfToken: getCsrfToken(req)
      });
    }
    res.redirect("/subscription-list-language");
  });
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
