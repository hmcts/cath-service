import { crimeRejectedCy as cy, crimeRejectedEn as en } from "@hmcts/auth";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  const locale = (req.query.lng as string) || res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  res.render("crime-rejected/index", { en, cy, t });
};
