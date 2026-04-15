import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import { findAllListTypes } from "../../list-type/queries.js";
import { findThirdPartyUserById, updateThirdPartySubscriptions } from "../../third-party-user/queries.js";
import { validateSensitivity } from "../../third-party-user/validation.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface ManageThirdPartyUserSession {
  manageThirdPartyUser?: {
    userId: string;
    userName: string;
    originalSubscriptions: number[];
  };
}

const getHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const userId = req.query.id as string | undefined;

  if (!userId) {
    return res.redirect(`/manage-third-party-users${language === "cy" ? "?lng=cy" : ""}`);
  }

  const user = await findThirdPartyUserById(userId);

  if (!user) {
    return res.render("manage-third-party-subscriptions/index", {
      ...content,
      errors: [{ text: content.userNotFound }]
    });
  }

  const session = req.session as ManageThirdPartyUserSession;
  session.manageThirdPartyUser = {
    userId: user.id,
    userName: user.name,
    originalSubscriptions: user.subscriptions.map((s) => s.listTypeId)
  };

  const currentSensitivity = user.subscriptions.length > 0 ? user.subscriptions[0].sensitivity : "";
  const currentListTypeIds = user.subscriptions.map((s) => s.listTypeId);
  const listTypes = await findAllListTypes();

  res.render("manage-third-party-subscriptions/index", {
    ...content,
    listTypes,
    currentChannel: "API",
    currentSensitivity,
    currentListTypeIds,
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const language = req.query.lng === "cy" ? "cy" : "en";
  const content = language === "cy" ? cy : en;
  const session = req.session as ManageThirdPartyUserSession;

  if (!session.manageThirdPartyUser) {
    return res.redirect(`/manage-third-party-users${language === "cy" ? "?lng=cy" : ""}`);
  }

  const channel = req.body.channel as string;
  const sensitivity = req.body.sensitivity as string | undefined;
  const listTypeIds = Array.isArray(req.body.listTypes) ? req.body.listTypes.map(Number) : req.body.listTypes ? [Number(req.body.listTypes)] : [];
  const listTypes = await findAllListTypes();

  const validationError = validateSensitivity(sensitivity);
  if (validationError) {
    return res.render("manage-third-party-subscriptions/index", {
      ...content,
      listTypes,
      currentChannel: channel || "API",
      currentSensitivity: sensitivity || "",
      currentListTypeIds: listTypeIds,
      errors: [{ ...validationError, text: content.sensitivityRequired }]
    });
  }

  const subscriptions = listTypeIds.map((listTypeId: number) => ({
    listTypeId,
    channel: channel || "API",
    sensitivity: sensitivity!
  }));

  await updateThirdPartySubscriptions(session.manageThirdPartyUser.userId, subscriptions);

  const getListTypeNames = (ids: number[]) =>
    ids
      .map((id) => {
        const listType = listTypes.find((lt) => lt.id === id);
        return listType?.friendlyName || listType?.name;
      })
      .filter((name): name is string => Boolean(name))
      .join(", ") || "None";

  const previousListTypes = getListTypeNames(session.manageThirdPartyUser.originalSubscriptions);
  const currentListTypes = getListTypeNames(listTypeIds);

  req.auditMetadata = {
    shouldLog: true,
    action: "UPDATE_THIRD_PARTY_SUBSCRIPTIONS",
    entityInfo: `ID: ${session.manageThirdPartyUser.userId}, Name: ${session.manageThirdPartyUser.userName}, Sensitivity: ${sensitivity}, Previous List Types: [${previousListTypes}], Current List Types: [${currentListTypes}]`
  };

  delete session.manageThirdPartyUser;

  res.redirect(`/third-party-subscriptions-updated${language === "cy" ? "?lng=cy" : ""}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
