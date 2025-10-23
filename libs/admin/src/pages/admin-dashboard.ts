import type { Request, Response } from "express";
import en from "./en.js";
import cy from "./cy.js";

export const GET = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  res.render("admin-dashboard", {
    pageTitle: lang.pageTitle,
    tiles: lang.tiles,
    navigation: {
      signOut: lang.signOut
    },
    hideLanguageToggle: true
  });
};
