import type { Request, Response } from "express";
import { cy, en } from "../locales/index.js";

export const GET = async (_req: Request, res: Response) => {
  res.render("index", { en, cy });
};
