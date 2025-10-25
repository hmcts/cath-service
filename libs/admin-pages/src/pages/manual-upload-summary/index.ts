import type { Request, Response } from "express";
import cy from "./cy.js";
import en from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  res.render("manual-upload-summary/index", {
    pageTitle: lang.pageTitle,
    subHeading: lang.subHeading,
    courtName: lang.courtName,
    file: lang.file,
    listType: lang.listType,
    hearingStartDate: lang.hearingStartDate,
    sensitivity: lang.sensitivity,
    language: lang.language,
    displayFileDates: lang.displayFileDates,
    change: lang.change,
    confirmButton: lang.confirmButton,
    hideLanguageToggle: true
  });
};

export const POST = async (_req: Request, res: Response) => {
  res.redirect("/manual-upload-confirmation");
};
