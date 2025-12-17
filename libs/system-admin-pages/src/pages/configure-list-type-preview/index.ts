import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import type { Session } from "express-session";
import { findAllSubJurisdictions } from "../../list-type/queries.js";
import { saveListType } from "../../list-type/service.js";
import * as cy from "./cy.js";
import * as en from "./en.js";

interface ListTypeSession extends Session {
  configureListType?: {
    name: string;
    friendlyName: string;
    welshFriendlyName: string;
    shortenedFriendlyName: string;
    url: string;
    defaultSensitivity: string;
    allowedProvenance: string[];
    isNonStrategic: boolean;
    subJurisdictionIds: number[];
    editId?: number;
  };
}

const getHandler = async (req: Request, res: Response) => {
  const session = req.session as ListTypeSession;

  if (!session.configureListType) {
    return res.redirect("/configure-list-type-enter-details");
  }

  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;

  const allSubJurisdictions = await findAllSubJurisdictions();
  const selectedSubJurisdictions = allSubJurisdictions.filter((sj) => session.configureListType?.subJurisdictionIds.includes(sj.subJurisdictionId));

  const subJurisdictionsText = selectedSubJurisdictions.map((sj) => (language === "cy" ? sj.welshName : sj.name)).join(", ");

  res.render("configure-list-type-preview/index", {
    t: content,
    data: session.configureListType,
    subJurisdictionsText
  });
};

const postHandler = async (req: Request, res: Response) => {
  const session = req.session as ListTypeSession;

  if (!session.configureListType) {
    return res.redirect("/configure-list-type-enter-details");
  }

  try {
    await saveListType(
      {
        name: session.configureListType.name,
        friendlyName: session.configureListType.friendlyName,
        welshFriendlyName: session.configureListType.welshFriendlyName,
        shortenedFriendlyName: session.configureListType.shortenedFriendlyName,
        url: session.configureListType.url,
        defaultSensitivity: session.configureListType.defaultSensitivity,
        allowedProvenance: session.configureListType.allowedProvenance,
        isNonStrategic: session.configureListType.isNonStrategic,
        subJurisdictionIds: session.configureListType.subJurisdictionIds
      },
      session.configureListType.editId
    );

    delete session.configureListType;

    res.redirect(303, "/configure-list-type-success");
  } catch (error) {
    const language = req.query.lng === "cy" ? "cy" : "en";
    const content = language === "cy" ? cy : en;

    const allSubJurisdictions = await findAllSubJurisdictions();
    const selectedSubJurisdictions = allSubJurisdictions.filter((sj) => session.configureListType?.subJurisdictionIds.includes(sj.subJurisdictionId));

    const subJurisdictionsText = selectedSubJurisdictions.map((sj) => (language === "cy" ? sj.welshName : sj.name)).join(", ");

    res.render("configure-list-type-preview/index", {
      t: content,
      data: session.configureListType,
      subJurisdictionsText,
      error: error instanceof Error ? error.message : "Failed to save list type"
    });
  }
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
