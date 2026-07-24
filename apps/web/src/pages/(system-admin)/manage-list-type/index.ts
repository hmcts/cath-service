import { requireRole, USER_ROLES } from "@hmcts/auth";
import { findListTypeById } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const t = language === "cy" ? cy : en;

  const rawId = req.query.id as string;
  const id = Number.parseInt(rawId, 10);

  if (!rawId || Number.isNaN(id)) {
    return res.status(400).render("errors/common", { status: 400 });
  }

  const listType = await findListTypeById(id);

  if (!listType) {
    return res.status(404).render("errors/common", { status: 404 });
  }

  const subJurisdictionsText =
    listType.subJurisdictions.length > 0
      ? listType.subJurisdictions.map((sj) => (language === "cy" ? sj.subJurisdiction.welshName : sj.subJurisdiction.name)).join(", ")
      : t.noneSelected;

  res.render("manage-list-type/index", {
    t,
    listType,
    subJurisdictionsText
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
