import { requireRole, USER_ROLES } from "@hmcts/auth";
import { cy as coreLocales, en as coreLocalesEn } from "@hmcts/web-core";
import type { Request, Response } from "express";
import cy from "./cy.js";
import en from "./en.js";

const getHandler = async (req: Request, res: Response) => {
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

export const GET = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
