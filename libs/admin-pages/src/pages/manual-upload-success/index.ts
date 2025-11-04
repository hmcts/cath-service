import { cy as coreLocales, en as coreLocalesEn } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

export const GET = async (req: Request, res: Response) => {
  const locale = (req.query.lng === "cy" ? "cy" : "en") as "en" | "cy";
  const t = getTranslations(locale);
  const coreAuthNavigation = locale === "cy" ? coreLocales.authenticatedNavigation : coreLocalesEn.authenticatedNavigation;

  // Validation: require upload confirmation in session
  if (!req.session?.uploadConfirmed) {
    return res.redirect("/manual-upload");
  }

  res.render("manual-upload-success/index", {
    ...t,
    navigation: {
      signOut: coreAuthNavigation.signOut
    },
    hideLanguageToggle: true
  });
};
