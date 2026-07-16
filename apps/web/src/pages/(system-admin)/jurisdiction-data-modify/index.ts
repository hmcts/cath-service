import { requireRole, USER_ROLES } from "@hmcts/auth";
import { findJurisdictionDataById, type JurisdictionDataSession, type JurisdictionDataType } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const VALID_TYPES: JurisdictionDataType[] = ["Jurisdiction", "Sub-Jurisdiction", "Region"];

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const id = Number.parseInt(req.query.id as string, 10);
  const type = req.query.type as JurisdictionDataType;

  if (Number.isNaN(id) || !VALID_TYPES.includes(type)) {
    return res.redirect("/jurisdiction-data-list");
  }

  const record = await findJurisdictionDataById(id, type);
  if (!record) {
    return res.redirect("/jurisdiction-data-list");
  }

  const name = "name" in record ? record.name : "";
  const welshName = "welshName" in record ? record.welshName : "";
  const jurisdictionId =
    type === "Sub-Jurisdiction" && "jurisdictionId" in record && record.jurisdictionId != null ? (record.jurisdictionId as number) : undefined;

  let parentJurisdictionName: string | undefined;
  if (type === "Sub-Jurisdiction" && jurisdictionId !== undefined) {
    const parentRecord = await findJurisdictionDataById(jurisdictionId, "Jurisdiction");
    parentJurisdictionName = parentRecord && "name" in parentRecord ? parentRecord.name : undefined;
  }

  const session = req.session as JurisdictionDataSession;
  session.jurisdictionData = { id, type, name, welshName, jurisdictionId };

  res.render("jurisdiction-data-modify/index", {
    en,
    cy,
    t,
    record: { name, type, parentJurisdictionName },
    updateHref: "/jurisdiction-data-update",
    deleteHref: "/jurisdiction-data-delete"
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
