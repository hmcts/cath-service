import { requireRole, USER_ROLES } from "@hmcts/auth";
import { listSearchConfigSuccessCy as cy, listSearchConfigSuccessEn as en } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

export const getHandler = async (req: Request, res: Response) => {
  const lang = req.query.lng === "cy" ? cy : en;

  res.render("list-search-config-success/index", {
    pageTitle: lang.pageTitle,
    heading: lang.heading,
    body: lang.body,
    returnLink: lang.returnLink
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
