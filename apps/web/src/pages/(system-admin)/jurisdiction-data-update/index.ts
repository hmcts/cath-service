import { requireRole, USER_ROLES } from "@hmcts/auth";
import {
  jurisdictionDataUpdateCy as cy,
  jurisdictionDataUpdateEn as en,
  getAllJurisdictions,
  type JurisdictionDataSession,
  updateJurisdictionData
} from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const buildJurisdictionItems = async (t: typeof en, selectedId?: number) => {
  const jurisdictions = await getAllJurisdictions();
  return [
    { value: "", text: t.jurisdictionPlaceholder },
    ...jurisdictions.map((j) => ({ value: j.jurisdictionId.toString(), text: j.displayName, selected: j.jurisdictionId === selectedId }))
  ];
};

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  if (!session.jurisdictionData) {
    return res.redirect("/jurisdiction-data-list");
  }

  const { name, welshName, type, jurisdictionId } = session.jurisdictionData;
  const jurisdictionItems = type === "Sub-Jurisdiction" ? await buildJurisdictionItems(t, jurisdictionId) : undefined;

  res.render("jurisdiction-data-update/index", {
    en,
    cy,
    t,
    type,
    jurisdictionItems,
    data: { name, welshName, type, jurisdictionId: jurisdictionId?.toString() ?? "" },
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  if (!session.jurisdictionData) {
    return res.redirect("/jurisdiction-data-list");
  }

  const { id, type } = session.jurisdictionData;

  const formData = {
    name: (req.body.name || "").trim(),
    welshName: (req.body.welshName || "").trim(),
    jurisdictionId: req.body.jurisdictionId || ""
  };

  const jurisdictionId = type === "Sub-Jurisdiction" ? Number.parseInt(formData.jurisdictionId, 10) || undefined : undefined;

  const errors = await updateJurisdictionData(id, type, { name: formData.name, welshName: formData.welshName, jurisdictionId });

  if (errors.length > 0) {
    const jurisdictionItems = type === "Sub-Jurisdiction" ? await buildJurisdictionItems(t, jurisdictionId) : undefined;
    return res.render("jurisdiction-data-update/index", {
      en,
      cy,
      t,
      type,
      jurisdictionItems,
      data: { ...formData, type },
      errors
    });
  }

  res.redirect("/jurisdiction-data-update-success");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
