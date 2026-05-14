import { cftRejectedCy as cy, cftRejectedEn as en } from "@hmcts/auth";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  res.render("cft-rejected/index", { en, cy });
};
