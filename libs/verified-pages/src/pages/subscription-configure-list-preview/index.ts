import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import { prisma } from "@hmcts/postgres-prisma";
import { replaceSubscriptionListTypes } from "@hmcts/subscriptions";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const LANGUAGE_DISPLAY: Record<string, { en: string; cy: string }> = {
  ENGLISH: { en: "English", cy: "Saesneg" },
  WELSH: { en: "Welsh", cy: "Cymraeg" },
  ENGLISH_AND_WELSH: { en: "English and Welsh", cy: "Saesneg a Chymraeg" }
};

async function resolveListTypeNames(listTypeIds: number[], locale: string) {
  const listTypeRecords = await prisma.listType.findMany({
    where: { id: { in: listTypeIds } }
  });
  return listTypeRecords.map((lt) => ({
    listTypeId: lt.id,
    name: (locale === "cy" ? lt.welshFriendlyName : lt.friendlyName) ?? lt.friendlyName ?? lt.name
  }));
}

async function renderPage(req: Request, res: Response, locale: string) {
  const t = locale === "cy" ? cy : en;

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  const pendingListTypeIds = req.session.emailSubscriptions?.pendingListTypeIds || [];
  const pendingLanguage = req.session.emailSubscriptions?.pendingLanguage;

  const listTypes = await resolveListTypeNames(pendingListTypeIds, locale);

  const localeKey = locale === "cy" ? "cy" : "en";
  const languageDisplay = pendingLanguage && LANGUAGE_DISPLAY[pendingLanguage] ? LANGUAGE_DISPLAY[pendingLanguage][localeKey] : t.noLanguageSelected;

  res.render("subscription-configure-list-preview/index", {
    ...t,
    listTypes,
    languageDisplay,
    pendingLanguage
  });
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  await renderPage(req, res, locale);
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const { action, listTypeId } = req.body;

  if (!req.user?.id) {
    return res.redirect("/sign-in");
  }

  const userId = req.user.id;

  if (action === "remove-list-type" && listTypeId) {
    const currentIds = req.session.emailSubscriptions?.pendingListTypeIds || [];
    const idToRemove = Number(listTypeId);

    if (!req.session.emailSubscriptions) {
      req.session.emailSubscriptions = {};
    }
    req.session.emailSubscriptions.pendingListTypeIds = currentIds.filter((id) => id !== idToRemove);

    return res.redirect("/subscription-configure-list-preview");
  }

  if (action === "change-language") {
    return res.redirect("/subscription-configure-list-language");
  }

  if (action === "confirm") {
    const pendingListTypeIds = req.session.emailSubscriptions?.pendingListTypeIds || [];
    const pendingLanguage = req.session.emailSubscriptions?.pendingLanguage;

    if (pendingListTypeIds.length === 0) {
      return renderPage(req, res, locale);
    }

    if (!pendingLanguage) {
      return res.redirect("/subscription-configure-list-language");
    }

    await replaceSubscriptionListTypes(userId, pendingListTypeIds, pendingLanguage);

    if (!req.session.emailSubscriptions) {
      req.session.emailSubscriptions = {};
    }
    delete req.session.emailSubscriptions.pendingListTypeIds;
    delete req.session.emailSubscriptions.pendingLanguage;

    return res.redirect("/subscription-confirmed");
  }

  res.redirect("/subscription-configure-list-preview");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
