import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, Response } from "express";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const user = req.user;
  res.render("system-admin-dashboard/index", { ...en, user });
};

export const GET = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
