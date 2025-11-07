import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const user = req.user;
  // Navigation comes from res.locals via authNavigationMiddleware
  // renderInterceptorMiddleware automatically merges res.locals into render options
  res.render("system-admin-dashboard/index", { ...en, user });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
