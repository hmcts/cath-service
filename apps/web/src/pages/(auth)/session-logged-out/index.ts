import { sessionLoggedOutCy as cy, sessionLoggedOutEn as en } from "@hmcts/auth";
import type { Request, Response } from "express";

export const GET = async (_req: Request, res: Response) => {
  res.render("session-logged-out/index", { en, cy });
};
