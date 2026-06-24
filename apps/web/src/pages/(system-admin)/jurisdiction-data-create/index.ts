import { requireRole, USER_ROLES } from "@hmcts/auth";
import {
  createJurisdictionData,
  jurisdictionDataCreateCy as cy,
  jurisdictionDataCreateEn as en,
  getAllJurisdictions,
  type JurisdictionDataSession
} from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const typeItems = [{ value: "", text: t.typePlaceholder }, ...t.typeOptions];
  const jurisdictions = await getAllJurisdictions();
  const jurisdictionItems = [
    { value: "", text: t.jurisdictionPlaceholder },
    ...jurisdictions.map((j) => ({ value: j.jurisdictionId.toString(), text: j.displayName }))
  ];

  res.render("jurisdiction-data-create/index", {
    en,
    cy,
    t,
    typeItems,
    jurisdictionItems,
    data: { name: "", welshName: "", type: "", jurisdictionId: "" },
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

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
    const typeItems = [{ value: "", text: t.typePlaceholder }, ...t.typeOptions];
    const jurisdictions = await getAllJurisdictions();
    const jurisdictionItems = [
      { value: "", text: t.jurisdictionPlaceholder },
      ...jurisdictions.map((j) => ({ value: j.jurisdictionId.toString(), text: j.displayName }))
    ];
    return res.render("jurisdiction-data-create/index", {
      en,
      cy,
      t,
      typeItems,
      jurisdictionItems,
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

  res.redirect("/jurisdiction-data-create-success");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
