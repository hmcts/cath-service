import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const locale = (req.query.lng as string) || "en";
  const content = locale === "cy" ? cy : en;

  res.render("account-request-submitted/index", {
    ...content,
    locale
  });
};
