import { requireRole, USER_ROLES } from "@hmcts/auth";
import "@hmcts/web-core";
import { blobExplorerResubmissionSuccessCy as cy, blobExplorerResubmissionSuccessEn as en } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

const getHandler = async (req: Request, res: Response) => {
  const locale = (req.query.lng === "cy" ? "cy" : "en") as "en" | "cy";
  const t = getTranslations(locale);

  res.render("blob-explorer-resubmission-success/index", {
    ...t,
    locale
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
