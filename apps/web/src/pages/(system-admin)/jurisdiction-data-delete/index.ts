import { requireRole, USER_ROLES } from "@hmcts/auth";
import {
  jurisdictionDataDeleteCy as cy,
  deleteJurisdictionData,
  jurisdictionDataDeleteEn as en,
  type JurisdictionDataSession
} from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  if (!session.jurisdictionData) {
    return res.redirect("/jurisdiction-data-list");
  }

  res.render("jurisdiction-data-delete/index", {
    en,
    cy,
    t,
    record: { name: session.jurisdictionData.name, type: session.jurisdictionData.type },
    radioError: undefined,
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

  const selection = req.body.confirmation;

  if (!selection) {
    const errors = [{ text: t.noSelectionError, href: "#confirmation" }];
    return res.render("jurisdiction-data-delete/index", {
      en,
      cy,
      t,
      record: { name: session.jurisdictionData.name, type: session.jurisdictionData.type },
      radioError: { text: t.noSelectionError },
      errors
    });
  }

  if (selection === "no") {
    return res.redirect(`/jurisdiction-data-modify?id=${session.jurisdictionData.id}&type=${encodeURIComponent(session.jurisdictionData.type)}`);
  }

  const { id, type } = session.jurisdictionData;
  const performedBy = (req as any).user?.email || "unknown";

  const deleteErrors = await deleteJurisdictionData(id, type, performedBy);

  if (deleteErrors.length > 0) {
    return res.render("jurisdiction-data-delete/index", {
      en,
      cy,
      t,
      record: { name: session.jurisdictionData.name, type: session.jurisdictionData.type },
      radioError: undefined,
      errors: deleteErrors
    });
  }

  res.redirect("/jurisdiction-data-delete-success");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
