import { addJurisdictionSuccessCy as cy, addJurisdictionSuccessEn as en } from "@hmcts/system-admin-pages";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  // Get the success data from session
  const jurisdictionSuccess = req.session.jurisdictionSuccess;

  // Clear the session data
  delete req.session.jurisdictionSuccess;

  // If no success data, redirect to add-jurisdiction page
  if (!jurisdictionSuccess) {
    return res.redirect(`/add-jurisdiction${language === "cy" ? "?lng=cy" : ""}`);
  }

  res.render("add-jurisdiction-success/index", {
    ...content,
    jurisdictionSuccess,
    locale: language
  });
};
