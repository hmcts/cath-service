import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { deleteLocationJurisdictionData } from "../../jurisdiction-management/jurisdiction-management-service.js";
import type { JurisdictionDataSession } from "../jurisdiction-data-session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const langSuffix = language === "cy" ? "?lng=cy" : "";
  const session = req.session as JurisdictionDataSession;

  if (!session.locationJurisdiction) {
    return res.redirect(`/location-jurisdiction-search${langSuffix}`);
  }

  res.render("location-jurisdiction-delete/index", {
    ...content,
    back: language === "cy" ? "Yn ôl" : "Back",
    radioError: undefined,
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const langSuffix = language === "cy" ? "?lng=cy" : "";
  const session = req.session as JurisdictionDataSession;

  if (!session.locationJurisdiction) {
    return res.redirect(`/location-jurisdiction-search${langSuffix}`);
  }

  const selection = req.body.confirmation;

  if (!selection) {
    const errors = [{ text: content.noSelectionError, href: "#confirmation" }];
    return res.render("location-jurisdiction-delete/index", {
      ...content,
      back: language === "cy" ? "Yn ôl" : "Back",
      radioError: { text: content.noSelectionError },
      errors
    });
  }

  if (selection === "no") {
    return res.redirect(`/location-jurisdiction-manage${langSuffix}`);
  }

  const { locationId } = session.locationJurisdiction;
  const performedBy = (req as any).user?.email || "unknown";

  await deleteLocationJurisdictionData(locationId, performedBy);

  res.redirect(`/location-jurisdiction-delete-success${langSuffix}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
