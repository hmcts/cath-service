import { requireRole, USER_ROLES } from "@hmcts/auth";
import { AuditLogAction, findAllListTypes, findThirdPartyUserById, isFeatureEnabled, updateThirdPartySubscriptions } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const LD_FLAG_RADIO_BUTTONS = "third-party-subscriptions-radio-buttons";

interface ManageThirdPartyUserSession {
  manageThirdPartyUser?: {
    userId: string;
    userName: string;
    originalSubscriptions: Array<{ listTypeId: number; sensitivity: string }>;
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
    originalSubscriptions: user.subscriptions.map((s) => ({ listTypeId: s.listTypeId, sensitivity: s.sensitivity }))
  };

  const currentSensitivities: Record<string, string> = {};
  for (const sub of user.subscriptions) {
    currentSensitivities[sub.listTypeId] = sub.sensitivity;
  }

  const listTypes = await findAllListTypes();
  const useRadioButtons = await isFeatureEnabled(LD_FLAG_RADIO_BUTTONS, userId);

  res.render("manage-third-party-subscriptions/index", {
    ...content,
    en,
    cy,
    listTypes,
    currentSensitivities,
    useRadioButtons,
    errors: undefined
  });
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const session = req.session as ManageThirdPartyUserSession;

  if (!session.manageThirdPartyUser) {
    return res.redirect(`/manage-third-party-users${locale === "cy" ? "?lng=cy" : ""}`);
  }

  const listTypes = await findAllListTypes();

  const subscriptions: Array<{ listTypeId: number; channel: string; sensitivity: string }> = [];

  for (const listType of listTypes) {
    const sensitivity = req.body[`sensitivity_${listType.id}`] as string | undefined;
    if (sensitivity && ["PUBLIC", "PRIVATE", "CLASSIFIED"].includes(sensitivity)) {
      subscriptions.push({ listTypeId: listType.id, channel: "API", sensitivity });
    }
  }

  await updateThirdPartySubscriptions(session.manageThirdPartyUser.userId, subscriptions);

  const getListTypeSummary = (subs: Array<{ listTypeId: number; sensitivity: string }>) =>
    subs
      .map((sub) => {
        const listType = listTypes.find((lt) => lt.id === sub.listTypeId);
        const name = listType?.friendlyName || listType?.name;
        return name ? `${name}:${sub.sensitivity}` : null;
      })
      .filter((s): s is string => Boolean(s))
      .join(", ") || "None";

  const previousSummary = getListTypeSummary(session.manageThirdPartyUser.originalSubscriptions);
  const currentSummary = getListTypeSummary(subscriptions.map((s) => ({ listTypeId: s.listTypeId, sensitivity: s.sensitivity })));

  req.auditMetadata = {
    shouldLog: true,
    action: AuditLogAction.UPDATE_THIRD_PARTY_SUBSCRIPTIONS,
    entityInfo: `ID: ${session.manageThirdPartyUser.userId}, Name: ${session.manageThirdPartyUser.userName}, Previous: [${previousSummary}], Current: [${currentSummary}]`
  };

  delete session.manageThirdPartyUser;

  res.redirect(`/third-party-subscriptions-updated${locale === "cy" ? "?lng=cy" : ""}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
