import { requireRole, USER_ROLES } from "@hmcts/auth";
import { AuditLogAction, findAllListTypes, findThirdPartyUserById, updateThirdPartySubscriptions, validateSensitivity } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
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
  const locale = res.locals.locale || "en";
  const content = locale === "cy" ? cy : en;
  const userId = req.query.id as string | undefined;

  if (!userId) {
    return res.redirect(`/manage-third-party-users${locale === "cy" ? "?lng=cy" : ""}`);
  }

  const user = await findThirdPartyUserById(userId);

  if (!user) {
    return res.render("manage-third-party-subscriptions/index", {
      ...content,
      en,
      cy,
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
    en,
    cy,
    listTypes,
    currentChannel: "API",
    currentSensitivity,
    currentListTypeIds,
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const content = locale === "cy" ? cy : en;
  const session = req.session as ManageThirdPartyUserSession;

  if (!session.manageThirdPartyUser) {
    return res.redirect(`/manage-third-party-users${locale === "cy" ? "?lng=cy" : ""}`);
  }

  const channel = (req.body.channel as string) || "API";
  const sensitivity = req.body.sensitivity as string | undefined;
  const listTypeIds = Array.isArray(req.body.listTypes) ? req.body.listTypes.map(Number) : req.body.listTypes ? [Number(req.body.listTypes)] : [];

  const validationError = validateSensitivity(sensitivity);
  if (validationError) {
    const listTypes = await findAllListTypes();
    return res.render("manage-third-party-subscriptions/index", {
      ...content,
      en,
      cy,
      listTypes,
      currentChannel: channel,
      currentSensitivity: sensitivity || "",
      currentListTypeIds: listTypeIds,
      errors: [{ ...validationError, text: content.sensitivityRequired }]
    });
  }

  const subscriptions = listTypeIds.map((listTypeId: number) => ({
    listTypeId,
    channel,
    sensitivity: sensitivity!
  }));

  await updateThirdPartySubscriptions(session.manageThirdPartyUser.userId, subscriptions);

  const listTypes = await findAllListTypes();
  const getListTypeNames = (ids: number[]) =>
    ids
      .map((id) => {
        const lt = listTypes.find((l) => l.id === id);
        return lt?.friendlyName || lt?.name;
      })
      .filter(Boolean)
      .join(", ") || "None";

  const previousListTypes = getListTypeNames(session.manageThirdPartyUser.originalSubscriptions);
  const currentListTypes = getListTypeNames(listTypeIds);

  req.auditMetadata = {
    shouldLog: true,
    action: AuditLogAction.UPDATE_THIRD_PARTY_SUBSCRIPTIONS,
    entityInfo: `ID: ${session.manageThirdPartyUser.userId}, Name: ${session.manageThirdPartyUser.userName}, Sensitivity: ${sensitivity}, Previous List Types: [${previousListTypes}], Current List Types: [${currentListTypes}]`
  };

  delete session.manageThirdPartyUser;

  res.redirect(`/third-party-subscriptions-updated${locale === "cy" ? "?lng=cy" : ""}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
