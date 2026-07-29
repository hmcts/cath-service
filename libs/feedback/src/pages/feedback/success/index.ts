import type { Request, Response, RequestHandler } from "express";
import { en } from "../en.js";
import { cy } from "../cy.js";

const getHandler: RequestHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  if (!req.query.submitted) {
    res.redirect("/feedback");
    return;
  }

  res.render("feedback/success", {
    ...t,
    t,
    en,
    cy,
  });
};

export const GET = getHandler;
