import { requireRole, USER_ROLES } from "@hmcts/auth";
import { deleteJurisdictionData, findLocationsByRegionId, type JurisdictionDataSession } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  if (!session.jurisdictionData) {
    return res.redirect("/region-data-list");
  }

  res.render("region-data-delete/index", {
    en,
    cy,
    t,
    record: { name: session.jurisdictionData.name },
    radioError: undefined,
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

  const selection = req.body.confirmation;

  if (!selection) {
    const errors = [{ text: t.noSelectionError, href: "#confirmation" }];
    return res.render("region-data-delete/index", {
      en,
      cy,
      t,
      record: { name: session.jurisdictionData.name },
      radioError: { text: t.noSelectionError },
      errors
    });
  }

  if (selection === "no") {
    return res.redirect(`/region-data-modify?id=${session.jurisdictionData.id}&type=Region`);
  }

  const { id } = session.jurisdictionData;
  const user = {
    userId: req.user?.id || "unknown",
    userEmail: req.user?.email || "unknown",
    userRole: req.user?.role || "SYSTEM_ADMIN",
    userProvenance: req.user?.provenance || "azure-ad"
  };

  const deleteErrors = await deleteJurisdictionData(id, "Region", user);

  if (deleteErrors.length > 0) {
    const linkedLocations = await findLocationsByRegionId(id);
    return res.render("region-data-delete/index", {
      en,
      cy,
      t,
      record: { name: session.jurisdictionData.name },
      radioError: undefined,
      errors: deleteErrors,
      linkedLocations
    });
  }

  res.redirect("/region-data-delete-success");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
