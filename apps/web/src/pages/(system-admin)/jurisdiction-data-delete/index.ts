import { requireRole, USER_ROLES } from "@hmcts/auth";
import { deleteJurisdictionData, findJurisdictionDataById, type JurisdictionDataSession } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

async function resolveParentJurisdictionName(type: string, jurisdictionId: number | undefined): Promise<string | undefined> {
  if (type !== "Sub-Jurisdiction" || jurisdictionId === undefined) return undefined;
  const parent = await findJurisdictionDataById(jurisdictionId, "Jurisdiction");
  return parent && "name" in parent ? parent.name : undefined;
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const session = req.session as JurisdictionDataSession;

  if (!session.jurisdictionData) {
    return res.redirect("/jurisdiction-data-list");
  }

  const { name, type, jurisdictionId } = session.jurisdictionData;
  const parentJurisdictionName = await resolveParentJurisdictionName(type, jurisdictionId);

  res.render("jurisdiction-data-delete/index", {
    en,
    cy,
    t,
    record: { name, type, parentJurisdictionName },
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

  const { id, type, name, jurisdictionId } = session.jurisdictionData;
  const selection = req.body.confirmation;

  if (!selection) {
    const parentJurisdictionName = await resolveParentJurisdictionName(type, jurisdictionId);
    const errors = [{ text: t.noSelectionError, href: "#confirmation" }];
    return res.render("jurisdiction-data-delete/index", {
      en,
      cy,
      t,
      record: { name, type, parentJurisdictionName },
      radioError: { text: t.noSelectionError },
      errors
    });
  }

  if (selection === "no") {
    return res.redirect(`/jurisdiction-data-modify?id=${id}&type=${encodeURIComponent(type)}`);
  }

  const user = {
    userId: req.user?.id || "unknown",
    userEmail: req.user?.email || "unknown",
    userRole: req.user?.role || "SYSTEM_ADMIN",
    userProvenance: req.user?.provenance || "azure-ad"
  };

  const deleteErrors = await deleteJurisdictionData(id, type, user);

  if (deleteErrors.length > 0) {
    const parentJurisdictionName = await resolveParentJurisdictionName(type, jurisdictionId);
    return res.render("jurisdiction-data-delete/index", {
      en,
      cy,
      t,
      record: { name, type, parentJurisdictionName },
      radioError: undefined,
      errors: deleteErrors
    });
  }

  res.redirect("/jurisdiction-data-delete-success");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
