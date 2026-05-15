import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

/**
 * Renders the session expired page
 */
export const GET = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;

  res.render("session-expired/index", {
    pageTitle: lang.pageTitle,
    heading: lang.heading,
    bodyText: lang.bodyText,
    signInAgainLink: lang.signInAgainLink
  });
};
