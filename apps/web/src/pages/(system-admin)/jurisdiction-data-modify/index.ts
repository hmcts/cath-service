import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { findJurisdictionDataById, type JurisdictionDataType } from "../../jurisdiction-management/jurisdiction-management-queries.js";
import type { JurisdictionDataSession } from "../jurisdiction-data-session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const VALID_TYPES: JurisdictionDataType[] = ["Jurisdiction", "Sub-Jurisdiction", "Region"];

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const langSuffix = language === "cy" ? "?lng=cy" : "";

  const id = Number.parseInt(req.query.id as string, 10);
  const type = req.query.type as JurisdictionDataType;

  if (Number.isNaN(id) || !VALID_TYPES.includes(type)) {
    return res.redirect(`/jurisdiction-data-list${langSuffix}`);
  }

  const record = await findJurisdictionDataById(id, type);
  if (!record) {
    return res.redirect(`/jurisdiction-data-list${langSuffix}`);
  }

  const name = "name" in record ? record.name : "";
  const welshName = "welshName" in record ? record.welshName : "";

  const session = req.session as JurisdictionDataSession;
  session.jurisdictionData = { id, type, name, welshName };

  res.render("jurisdiction-data-modify/index", {
    ...content,
    back: language === "cy" ? "Yn ôl" : "Back",
    record: { name, type },
    updateHref: `/jurisdiction-data-update${langSuffix}`,
    deleteHref: `/jurisdiction-data-delete${langSuffix}`
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
