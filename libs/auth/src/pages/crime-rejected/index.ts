import type { Request, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const GET = async (req: Request, res: Response) => {
  const locale = (req.query.lng as string) || res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  res.render("crime-rejected/index", { en, cy, t });
};
