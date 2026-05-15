import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

const getHandler = async (req: Request, res: Response) => {
  const locale = (req.query.lng === "cy" ? "cy" : "en") as "en" | "cy";
  const t = getTranslations(locale);

  // Validation: require upload confirmation in session
  if (!req.session?.nonStrategicUploadConfirmed) {
    return res.redirect("/non-strategic-upload");
  }

  const hasLangParam = req.query.lng !== undefined;
  const previousLang = req.session.nonStrategicViewedLanguage;

  // If page has been viewed and this is not a first-time language change, redirect
  if (req.session.nonStrategicSuccessPageViewed && (!hasLangParam || previousLang === locale)) {
    delete req.session.nonStrategicUploadConfirmed;
    delete req.session.nonStrategicSuccessPageViewed;
    delete req.session.nonStrategicViewedLanguage;
    return res.redirect("/non-strategic-upload");
  }

  // Track which language was viewed and mark page as viewed
  req.session.nonStrategicViewedLanguage = locale;
  req.session.nonStrategicSuccessPageViewed = true;

  res.render("non-strategic-upload-success/index", {
    ...t
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
