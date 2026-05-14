import { accountRequestSubmittedCy as cy, accountRequestSubmittedEn as en } from "@hmcts/public-pages";
import type { Request, Response } from "express";

export const GET = async (req: Request, res: Response) => {
  const locale = (req.query.lng as string) || "en";
  const content = locale === "cy" ? cy : en;

  res.render("account-request-submitted/index", {
    ...content,
    locale
  });
};
