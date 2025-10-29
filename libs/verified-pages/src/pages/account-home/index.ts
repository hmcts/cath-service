import { cy as coreLocales, en as coreLocalesEn } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const coreAuthNavigation = locale === "cy" ? coreLocales.authenticatedNavigation : coreLocalesEn.authenticatedNavigation;
  const pageLocales = locale === "cy" ? cy : en;

  const navigation = {
    signOut: coreAuthNavigation.signOut,
    verifiedItems: pageLocales.navigationItems
  };

  res.render("account-home/index", {
    en,
    cy,
    navigation
  });
};
