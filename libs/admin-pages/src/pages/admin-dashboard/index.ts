import { cy as coreLocales, en as coreLocalesEn } from "@hmcts/web-core";
import type { Request, Response } from "express";
import cy from "./cy.js";
import en from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const coreAuthNavigation = req.query.lng === "cy" ? coreLocales.authenticatedNavigation : coreLocalesEn.authenticatedNavigation;

  res.render("admin-dashboard/index", {
    pageTitle: lang.pageTitle,
    tiles: lang.tiles,
    navigation: {
      signOut: coreAuthNavigation.signOut
    },
    hideLanguageToggle: true
  });
};
