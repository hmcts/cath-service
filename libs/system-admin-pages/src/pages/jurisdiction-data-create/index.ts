import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { createJurisdictionData } from "../../jurisdiction-management/jurisdiction-management-service.js";
import type { JurisdictionDataSession } from "../jurisdiction-data-session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  res.render("jurisdiction-data-create/index", {
    ...content,
    back: language === "cy" ? "Yn ôl" : "Back",
    data: { name: "", welshName: "", type: "" },
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const langSuffix = language === "cy" ? "?lng=cy" : "";

  const formData = {
    name: (req.body.name || "").trim(),
    welshName: (req.body.welshName || "").trim(),
    type: req.body.type || ""
  };

  const errors = await createJurisdictionData({
    name: formData.name,
    welshName: formData.welshName,
    type: formData.type
  });

  if (errors.length > 0) {
    return res.render("jurisdiction-data-create/index", {
      ...content,
      back: language === "cy" ? "Yn ôl" : "Back",
      data: formData,
      errors
    });
  }

  const session = req.session as JurisdictionDataSession;
  session.jurisdictionData = {
    id: 0,
    type: formData.type as "Jurisdiction" | "Sub-Jurisdiction" | "Region",
    name: formData.name,
    welshName: formData.welshName
  };

  res.redirect(`/jurisdiction-data-create-success${langSuffix}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
