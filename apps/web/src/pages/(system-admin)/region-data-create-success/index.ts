import { requireRole, USER_ROLES } from "@hmcts/auth";
import { regionDataCreateSuccessCy as cy, regionDataCreateSuccessEn as en, type JurisdictionDataSession } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  if (!session.jurisdictionData) {
    return res.redirect("/region-data-create");
  }

  delete session.jurisdictionData;

  res.render("region-data-create-success/index", { en, cy, t });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
