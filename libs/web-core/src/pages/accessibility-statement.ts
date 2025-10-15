import type { Request, Response } from "express";
import { cy, en } from "../locales/accessibility-statement.js";

export const GET = async (_req: Request, res: Response) => {
  res.render("accessibility-statement", {
    backLink: "/",
    en,
    cy
  });
};
