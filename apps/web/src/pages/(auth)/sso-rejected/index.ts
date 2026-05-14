import { ssoRejectedCy as cy, ssoRejectedEn as en } from "@hmcts/auth";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  res.render("sso-rejected/index", { en, cy });
};
