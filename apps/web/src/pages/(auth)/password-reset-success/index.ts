import { passwordResetSuccessCy as cy, passwordResetSuccessEn as en } from "@hmcts/auth";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  res.render("password-reset-success/index", { en, cy });
};
