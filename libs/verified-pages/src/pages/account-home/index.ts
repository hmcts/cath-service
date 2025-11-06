import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const pageLocales = locale === "cy" ? cy : en;

  // Set page-specific navigation items
  if (!res.locals.navigation) {
    res.locals.navigation = {};
  }
  res.locals.navigation.verifiedItems = pageLocales.navigationItems;

  res.render("account-home/index", { en, cy });
};
