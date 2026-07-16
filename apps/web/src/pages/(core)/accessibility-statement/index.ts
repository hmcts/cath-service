import { accessibilityStatementCy, accessibilityStatementEn } from "@hmcts/web-core";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? accessibilityStatementCy : accessibilityStatementEn;
  res.render("accessibility-statement/index", {
    en: accessibilityStatementEn,
    cy: accessibilityStatementCy,
    pageTitle: t.title
  });
};
