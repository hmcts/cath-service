import { requireRole, USER_ROLES } from "@hmcts/auth";
import { findJurisdictionDataById, type JurisdictionDataSession } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const id = Number.parseInt(req.query.id as string, 10);

  if (Number.isNaN(id)) {
    return res.redirect("/region-data-list");
  }

  const record = await findJurisdictionDataById(id, "Region");
  if (!record) {
    return res.redirect("/region-data-list");
  }

  const name = "name" in record ? record.name : "";
  const welshName = "welshName" in record ? record.welshName : "";

  const session = req.session as JurisdictionDataSession;
  session.jurisdictionData = { id, type: "Region", name, welshName };

  res.render("region-data-modify/index", {
    en,
    cy,
    t,
    record: { name, type: "Region" },
    updateHref: "/region-data-update",
    deleteHref: "/region-data-delete"
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
