import { requireRole, USER_ROLES } from "@hmcts/auth";
import { cy as coreLocales, en as coreLocalesEn } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

const getHandler = async (req: Request, res: Response) => {
  const locale = (req.query.lng === "cy" ? "cy" : "en") as "en" | "cy";
  const t = getTranslations(locale);
  const coreLocalesData = locale === "cy" ? coreLocales : coreLocalesEn;

  // Validation: require upload confirmation in session
  if (!req.session?.uploadConfirmed) {
    return res.redirect("/manual-upload");
  }

  const hasLangParam = req.query.lng !== undefined;
  const previousLang = req.session.viewedLanguage;

  // If page has been viewed and this is not a first-time language change, redirect
  if (req.session.successPageViewed && (!hasLangParam || previousLang === locale)) {
    delete req.session.uploadConfirmed;
    delete req.session.successPageViewed;
    delete req.session.viewedLanguage;
    return res.redirect("/manual-upload");
  }

  // Track which language was viewed and mark page as viewed
  req.session.viewedLanguage = locale;
  req.session.successPageViewed = true;

  res.render("manual-upload-success/index", {
    ...t,
    navigation: {
      signIn: coreLocalesData.navigation.signIn,
      signOut: coreLocalesData.authenticatedNavigation.signOut
    },
    hideLanguageToggle: true
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
