import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import type { JurisdictionDataSession } from "../jurisdiction-data-session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const langSuffix = language === "cy" ? "?lng=cy" : "";

  const session = req.session as JurisdictionDataSession;

  if (!session.jurisdictionData) {
    return res.redirect(`/jurisdiction-data-create${langSuffix}`);
  }

  delete session.jurisdictionData;

  res.render("jurisdiction-data-create-success/index", {
    ...content
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
