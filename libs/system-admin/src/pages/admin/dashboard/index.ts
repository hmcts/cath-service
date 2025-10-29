import type { Request, Response } from "express";
import { requireSystemAdmin } from "../../../admin-auth-middleware.js";
import { en } from "./en.js";

export const GET = [
  requireSystemAdmin(),
  async (_req: Request, res: Response) => {
    res.render("admin/dashboard/index", en);
  }
];
