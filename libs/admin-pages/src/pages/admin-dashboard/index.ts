import type { Request, Response } from "express";
import cy from "./cy.js";
import en from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  res.render("admin-dashboard/index", {
    pageTitle: lang.pageTitle,
    tiles: lang.tiles,
    navigation: {
      signOut: lang.signOut
    },
    hideLanguageToggle: true
  });
};
