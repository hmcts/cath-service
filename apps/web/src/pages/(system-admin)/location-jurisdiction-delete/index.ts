import { requireRole, USER_ROLES } from "@hmcts/auth";
import { deleteLocationJurisdictionData, type JurisdictionDataSession } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

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
  const user = {
    userId: req.user?.id || "unknown",
    userEmail: req.user?.email || "unknown",
    userRole: req.user?.role || "SYSTEM_ADMIN",
    userProvenance: req.user?.provenance || "azure-ad"
  };

  await deleteLocationJurisdictionData(locationId, user);

  res.redirect("/location-jurisdiction-delete-success");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
