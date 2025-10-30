import type { Request, Response } from "express";
import { en } from "./en.js";

export const GET = async (_req: Request, res: Response) => {
  res.render("system-admin-dashboard/index", en);
};
