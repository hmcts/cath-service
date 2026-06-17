import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { deleteJurisdictionData } from "../../jurisdiction-management/jurisdiction-management-service.js";
import type { JurisdictionDataSession } from "../jurisdiction-data-session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const langSuffix = language === "cy" ? "?lng=cy" : "";
  const session = req.session as JurisdictionDataSession;

  if (!session.jurisdictionData) {
    return res.redirect(`/jurisdiction-data-list${langSuffix}`);
  }

  res.render("jurisdiction-data-delete/index", {
    ...content,
    back: language === "cy" ? "Yn ôl" : "Back",
    record: { name: session.jurisdictionData.name, type: session.jurisdictionData.type },
    radioError: undefined,
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const langSuffix = language === "cy" ? "?lng=cy" : "";
  const session = req.session as JurisdictionDataSession;

  if (!session.jurisdictionData) {
    return res.redirect(`/jurisdiction-data-list${langSuffix}`);
  }

  const selection = req.body.confirmation;

  if (!selection) {
    const errors = [{ text: content.noSelectionError, href: "#confirmation" }];
    return res.render("jurisdiction-data-delete/index", {
      ...content,
      back: language === "cy" ? "Yn ôl" : "Back",
      record: { name: session.jurisdictionData.name, type: session.jurisdictionData.type },
      radioError: { text: content.noSelectionError },
      errors
    });
  }

  if (selection === "no") {
    return res.redirect(
      `/jurisdiction-data-modify?id=${session.jurisdictionData.id}&type=${encodeURIComponent(session.jurisdictionData.type)}${langSuffix ? `&lng=cy` : ""}`
    );
  }

  const { id, type } = session.jurisdictionData;
  const performedBy = (req as any).user?.email || "unknown";

  const deleteErrors = await deleteJurisdictionData(id, type, performedBy);

  if (deleteErrors.length > 0) {
    return res.render("jurisdiction-data-delete/index", {
      ...content,
      back: language === "cy" ? "Yn ôl" : "Back",
      record: { name: session.jurisdictionData.name, type: session.jurisdictionData.type },
      radioError: undefined,
      errors: deleteErrors
    });
  }

  res.redirect(`/jurisdiction-data-delete-success${langSuffix}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
