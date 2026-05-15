import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { ListTypeSession } from "@hmcts/system-admin-pages";
import * as cy from "@hmcts/system-admin-pages";
import * as en from "@hmcts/system-admin-pages";
import { findAllSubJurisdictions, validateSubJurisdictions } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";

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

  let subJurisdictionIds: number[] = [];
  if (Array.isArray(req.body.subJurisdictions)) {
    subJurisdictionIds = req.body.subJurisdictions.map((id: string) => Number.parseInt(id, 10));
  } else if (req.body.subJurisdictions) {
    subJurisdictionIds = [Number.parseInt(req.body.subJurisdictions, 10)];
  }

  const errors = validateSubJurisdictions(subJurisdictionIds);

  if (errors.length > 0) {
    const language = req.query.lng === "cy" ? "cy" : "en";
    const content = language === "cy" ? cy : en;

    const subJurisdictions = await findAllSubJurisdictions();

    const items = subJurisdictions.map((subJurisdiction) => {
      const text = language === "cy" ? subJurisdiction.welshName : subJurisdiction.name;
      return {
        value: String(subJurisdiction.subJurisdictionId),
        text,
        checked: subJurisdictionIds.includes(subJurisdiction.subJurisdictionId)
      };
    });

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
