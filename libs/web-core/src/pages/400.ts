import type { Request, Response } from "express";
import { cy } from "../views/errors/cy.js";
import { en } from "../views/errors/en.js";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  res.status(400).render("errors/400", {
    en: en.error400,
    cy: cy.error400,
    t: locale === "cy" ? cy.error400 : en.error400
  });
};
