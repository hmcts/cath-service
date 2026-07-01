import { requireRole, USER_ROLES } from "@hmcts/auth";
import { locationJurisdictionDeleteSuccessCy as cy, locationJurisdictionDeleteSuccessEn as en, type JurisdictionDataSession } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  if (!session.locationJurisdiction) {
    return res.redirect("/location-jurisdiction-search");
  }

  delete session.locationJurisdiction;

  res.render("location-jurisdiction-delete-success/index", { en, cy, t });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
