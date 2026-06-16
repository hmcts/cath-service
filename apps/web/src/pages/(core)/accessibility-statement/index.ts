import { accessibilityStatementCy, accessibilityStatementEn } from "@hmcts/web-core";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  res.render("accessibility-statement/index", {
    en: accessibilityStatementEn,
    cy: accessibilityStatementCy
  });
};
