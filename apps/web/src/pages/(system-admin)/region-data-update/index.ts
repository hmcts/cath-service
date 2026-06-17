import { requireRole, USER_ROLES } from "@hmcts/auth";
import { regionDataUpdateCy as cy, regionDataUpdateEn as en, type JurisdictionDataSession, updateJurisdictionData } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  if (!session.jurisdictionData) {
    return res.redirect("/region-data-list");
  }

  const { name, welshName } = session.jurisdictionData;

  res.render("region-data-update/index", {
    en,
    cy,
    t,
    data: { name, welshName },
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  if (!session.jurisdictionData) {
    return res.redirect("/region-data-list");
  }

  const { id } = session.jurisdictionData;

  const formData = {
    name: (req.body.name || "").trim(),
    welshName: (req.body.welshName || "").trim()
  };

  const errors = await updateJurisdictionData(id, "Region", { name: formData.name, welshName: formData.welshName });

  if (errors.length > 0) {
    return res.render("region-data-update/index", {
      en,
      cy,
      t,
      data: formData,
      errors
    });
  }

  res.redirect("/region-data-update-success");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
