import { requireRole, USER_ROLES } from "@hmcts/auth";
import {
  locationJurisdictionDeleteCy as cy,
  deleteLocationJurisdictionData,
  locationJurisdictionDeleteEn as en,
  type JurisdictionDataSession
} from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  if (!session.locationJurisdiction) {
    return res.redirect("/location-jurisdiction-search");
  }

  res.render("location-jurisdiction-delete/index", {
    en,
    cy,
    t,
    radioError: undefined,
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  if (!session.locationJurisdiction) {
    return res.redirect("/location-jurisdiction-search");
  }

  const selection = req.body.confirmation;

  if (!selection) {
    const errors = [{ text: t.noSelectionError, href: "#confirmation" }];
    return res.render("location-jurisdiction-delete/index", {
      en,
      cy,
      t,
      radioError: { text: t.noSelectionError },
      errors
    });
  }

  if (selection === "no") {
    return res.redirect("/location-jurisdiction-manage");
  }

  const { locationId } = session.locationJurisdiction;
  const performedBy = (req as any).user?.email || "unknown";

  await deleteLocationJurisdictionData(locationId, performedBy);

  res.redirect("/location-jurisdiction-delete-success");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
