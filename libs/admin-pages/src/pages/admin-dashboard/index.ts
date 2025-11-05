import { requireRole, USER_ROLES } from "@hmcts/auth";
import { cy as coreLocales, en as coreLocalesEn } from "@hmcts/web-core";
import type { Request, RequestHandler, Response } from "express";
import cy from "./cy.js";
import en from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const coreAuthNavigation = req.query.lng === "cy" ? coreLocales.authenticatedNavigation : coreLocalesEn.authenticatedNavigation;

  // Add signOut to res.locals.navigation (if it exists) so renderInterceptorMiddleware will merge it
  if (res.locals.navigation) {
    res.locals.navigation.signOut = coreAuthNavigation.signOut;
  } else {
    // If no navigation from middleware, create one with just signOut
    res.locals.navigation = {
      signOut: coreAuthNavigation.signOut
    };
  }

  // Don't pass navigation in render options - let renderInterceptorMiddleware merge res.locals
  res.render("admin-dashboard/index", {
    pageTitle: lang.pageTitle,
    tiles: lang.tiles,
    hideLanguageToggle: true
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
