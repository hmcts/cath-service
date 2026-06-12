import { errorViewsCy, errorViewsEn } from "@hmcts/web-core";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? errorViewsCy.error400 : errorViewsEn.error400;
  res.status(400).render("errors/400", {
    en: errorViewsEn.error400,
    cy: errorViewsCy.error400,
    t
  });
};
