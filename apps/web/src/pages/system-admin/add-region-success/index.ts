import { addRegionSuccessCy as cy, addRegionSuccessEn as en } from "@hmcts/system-admin-pages";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  // Get the success data from session
  const regionSuccess = req.session.regionSuccess;

  // Clear the session data
  delete req.session.regionSuccess;

  // If no success data, redirect to add-region page
  if (!regionSuccess) {
    return res.redirect(`/add-region${language === "cy" ? "?lng=cy" : ""}`);
  }

  res.render("add-region-success/index", {
    ...content,
    regionSuccess,
    locale: language
  });
};
