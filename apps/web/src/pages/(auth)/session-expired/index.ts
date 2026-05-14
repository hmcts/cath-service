import { sessionExpiredCy as cy, sessionExpiredEn as en } from "@hmcts/auth";
import type { Request, Response } from "express";

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
