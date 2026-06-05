import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { updateJurisdictionData } from "../../jurisdiction-management/jurisdiction-management-service.js";
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

  const { name, welshName } = session.jurisdictionData;

  res.render("jurisdiction-data-update/index", {
    ...content,
    back: language === "cy" ? "Yn ôl" : "Back",
    data: { name, welshName },
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

  const { id, type } = session.jurisdictionData;

  const formData = {
    name: (req.body.name || "").trim(),
    welshName: (req.body.welshName || "").trim()
  };

  const errors = await updateJurisdictionData(id, type, formData);

  if (errors.length > 0) {
    return res.render("jurisdiction-data-update/index", {
      ...content,
      back: language === "cy" ? "Yn ôl" : "Back",
      data: formData,
      errors
    });
  }

  res.redirect(`/jurisdiction-data-update-success${langSuffix}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
