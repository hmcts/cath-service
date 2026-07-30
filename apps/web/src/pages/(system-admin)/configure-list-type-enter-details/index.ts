import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { RequestHandler } from "express";

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), (_req, res) => res.redirect(301, "/manage-list-types")];
