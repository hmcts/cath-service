import { blockUserAccess, buildVerifiedUserNavigation, requireAuth } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const LANGUAGE_VALUES = ["ENGLISH", "WELSH", "ENGLISH_AND_WELSH"] as const;
type LanguageValue = (typeof LANGUAGE_VALUES)[number];

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

  const pendingLanguage = req.session.emailSubscriptions?.pendingLanguage;

  res.render("subscription-configure-list-language/index", {
    ...t,
    selectedLanguage: pendingLanguage
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const { language } = req.body;

  if (!language || !LANGUAGE_VALUES.includes(language as LanguageValue)) {
    if (!res.locals.navigation) {
      res.locals.navigation = {};
    }
    res.locals.navigation.verifiedItems = buildVerifiedUserNavigation(req.path, locale);

    return res.render("subscription-configure-list-language/index", {
      ...t,
      selectedLanguage: language,
      errors: {
        titleText: t.errorSummaryTitle,
        errorList: [{ text: t.errorSelectVersion, href: "#language" }]
      }
    });
  }

  if (!req.session.emailSubscriptions) {
    req.session.emailSubscriptions = {};
  }

  req.session.emailSubscriptions.pendingLanguage = language as LanguageValue;

  res.redirect("/subscription-configure-list-preview");
};

export const GET: RequestHandler[] = [requireAuth(), blockUserAccess(), getHandler];
export const POST: RequestHandler[] = [requireAuth(), blockUserAccess(), postHandler];
