import { requireRole, USER_ROLES } from "@hmcts/auth";
import { createJurisdictionData, regionDataCreateCy as cy, regionDataCreateEn as en, type JurisdictionDataSession } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  res.render("region-data-create/index", {
    en,
    cy,
    t,
    data: { name: "", welshName: "" },
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const formData = {
    name: (req.body.name || "").trim(),
    welshName: (req.body.welshName || "").trim()
  };

  const errors = await createJurisdictionData({
    name: formData.name,
    welshName: formData.welshName,
    type: "Region"
  });

  if (errors.length > 0) {
    return res.render("region-data-create/index", {
      en,
      cy,
      t,
      data: formData,
      errors
    });
  }

  const session = req.session as JurisdictionDataSession;
  session.jurisdictionData = {
    id: 0,
    type: "Region",
    name: formData.name,
    welshName: formData.welshName
  };

  res.redirect("/region-data-create-success");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
