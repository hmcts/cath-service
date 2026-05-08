import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { getPendingCount } from "../../media-application/queries.js";
import cy from "./cy.js";
import en from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;
  const userRole = req.user?.role;

  // Filter tiles based on user role
  // CTSC admins see all 4 tiles, Local admins see only first 3 tiles
  const tiles = userRole === USER_ROLES.INTERNAL_ADMIN_CTSC ? lang.tiles : lang.tiles.slice(0, 3);

  const pendingCount = userRole === USER_ROLES.INTERNAL_ADMIN_CTSC ? await getPendingCount() : 0;

  res.render("admin-dashboard/index", {
    pageTitle: lang.pageTitle,
    tiles,
    pendingCount,
    notificationText: lang.notificationText,
    notificationLink: lang.notificationLink
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]), getHandler];
