import { requireRole, USER_ROLES } from "@hmcts/auth";
import { referenceDataUploadConfirmationCy as cy, referenceDataUploadConfirmationEn as en } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const getTranslations = (locale: string) => (locale === "cy" ? cy : en);

const getHandler = async (_req: Request, res: Response) => {
  const locale = "en";
  const t = getTranslations(locale);

  res.render("reference-data-upload-confirmation/index", {
    ...t,
    locale
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
