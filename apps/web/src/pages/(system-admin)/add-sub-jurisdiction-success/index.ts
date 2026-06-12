import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  // Get the success flag from session
  const subJurisdictionSuccess = req.session.subJurisdictionSuccess;

  // Clear the session data
  delete req.session.subJurisdictionSuccess;

  // If no success data, redirect to add-sub-jurisdiction page
  if (!subJurisdictionSuccess) {
    return res.redirect(`/add-sub-jurisdiction${language === "cy" ? "?lng=cy" : ""}`);
  }

  res.render("add-sub-jurisdiction-success/index", {
    ...content
  });
};
