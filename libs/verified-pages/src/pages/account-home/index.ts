import { cy as coreLocales, en as coreLocalesEn } from "@hmcts/web-core";
import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const coreAuthNavigation = locale === "cy" ? coreLocales.authenticatedNavigation : coreLocalesEn.authenticatedNavigation;
  const pageLocales = locale === "cy" ? cy : en;

  // Merge SSO admin navigation (if present) with page-specific navigation
  const ssoNavigation = res.locals.navigation?.verifiedItems || [];
  const combinedNavigationItems = [...ssoNavigation, ...pageLocales.navigationItems];

  // Update res.locals.navigation so renderInterceptorMiddleware can merge it
  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.signOut = coreAuthNavigation.signOut;
  res.locals.navigation.verifiedItems = combinedNavigationItems;

  // Don't pass navigation in render - let renderInterceptorMiddleware merge res.locals
  res.render("account-home/index", {
    en,
    cy
  });
};
