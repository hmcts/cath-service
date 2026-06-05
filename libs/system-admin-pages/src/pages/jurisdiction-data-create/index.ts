import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { createJurisdictionData } from "../../jurisdiction-management/jurisdiction-management-service.js";
import { getAllJurisdictions } from "../../reference-data-upload/repository/sub-jurisdiction-repository.js";
import type { JurisdictionDataSession } from "../jurisdiction-data-session.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const typeItems = [{ value: "", text: content.typePlaceholder }, ...content.typeOptions];
  const jurisdictions = await getAllJurisdictions();
  const jurisdictionItems = [
    { value: "", text: content.jurisdictionPlaceholder },
    ...jurisdictions.map((j) => ({ value: j.jurisdictionId.toString(), text: j.displayName }))
  ];

  res.render("jurisdiction-data-create/index", {
    ...content,
    typeItems,
    jurisdictionItems,
    back: language === "cy" ? "Yn ôl" : "Back",
    data: { name: "", welshName: "", type: "", jurisdictionId: "" },
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
    type: req.body.type || "",
    jurisdictionId: req.body.jurisdictionId || ""
  };

  const jurisdictionId = formData.type === "Sub-Jurisdiction" ? Number.parseInt(formData.jurisdictionId, 10) || undefined : undefined;

  const errors = await createJurisdictionData({
    name: formData.name,
    welshName: formData.welshName,
    type: formData.type,
    jurisdictionId
  });

  if (errors.length > 0) {
    const typeItems = [{ value: "", text: content.typePlaceholder }, ...content.typeOptions];
    const jurisdictions = await getAllJurisdictions();
    const jurisdictionItems = [
      { value: "", text: content.jurisdictionPlaceholder },
      ...jurisdictions.map((j) => ({ value: j.jurisdictionId.toString(), text: j.displayName }))
    ];
    return res.render("jurisdiction-data-create/index", {
      ...content,
      typeItems,
      jurisdictionItems,
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
