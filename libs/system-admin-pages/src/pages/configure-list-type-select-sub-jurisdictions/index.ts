import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { findAllSubJurisdictions } from "../../list-type/queries.js";
import type { ListTypeSession } from "../../list-type/types.js";
import { validateSubJurisdictions } from "../../list-type/validation.js";
import * as cy from "./cy.js";
import * as en from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const session = req.session as ListTypeSession;

  if (!session.configureListType) {
    return res.redirect("/configure-list-type-enter-details");
  }

  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  const subJurisdictions = await findAllSubJurisdictions();
  const selectedIds = session.configureListType.subJurisdictionIds || [];

  const items = subJurisdictions.map((subJurisdiction) => ({
    value: String(subJurisdiction.subJurisdictionId),
    text: language === "cy" ? subJurisdiction.welshName : subJurisdiction.name,
    checked: selectedIds.includes(subJurisdiction.subJurisdictionId)
  }));

  res.render("configure-list-type-select-sub-jurisdictions/index", {
    t: content,
    items
  });
};

const postHandler = async (req: Request, res: Response) => {
  const session = req.session as ListTypeSession;

  if (!session.configureListType) {
    return res.redirect("/configure-list-type-enter-details");
  }

  const subJurisdictionIds = Array.isArray(req.body.subJurisdictions)
    ? req.body.subJurisdictions.map((id: string) => Number.parseInt(id, 10))
    : req.body.subJurisdictions
      ? [Number.parseInt(req.body.subJurisdictions, 10)]
      : [];

  const errors = validateSubJurisdictions(subJurisdictionIds);

  if (errors.length > 0) {
    const language = req.query.lng === "cy" ? "cy" : "en";
    const content = language === "cy" ? cy : en;

    const subJurisdictions = await findAllSubJurisdictions();

    const items = subJurisdictions.map((subJurisdiction) => ({
      value: String(subJurisdiction.subJurisdictionId),
      text: language === "cy" ? subJurisdiction.welshName : subJurisdiction.name,
      checked: subJurisdictionIds.includes(subJurisdiction.subJurisdictionId)
    }));

    return res.render("configure-list-type-select-sub-jurisdictions/index", {
      t: content,
      items,
      errors: {
        subJurisdictions: { text: errors[0].message }
      },
      errorList: errors.map((error) => ({
        text: error.message,
        href: error.href
      }))
    });
  }

  session.configureListType.subJurisdictionIds = subJurisdictionIds;

  res.redirect("/configure-list-type-preview");
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
