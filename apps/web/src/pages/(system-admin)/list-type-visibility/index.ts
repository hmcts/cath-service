import { requireRole, USER_ROLES } from "@hmcts/auth";
import { AuditLogAction, findListTypeById, setListTypeVisibility, validateVisibilityConfirmation } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const TEMPLATE = "list-type-visibility/index";
const TARGET_STATES = ["hidden", "visible"] as const;

const getHandler = async (req: Request, res: Response) => {
  const t = req.query.lng === "cy" ? cy : en;
  const id = parseId(req.query.id);

  if (id === null) {
    return res.status(400).render("errors/common", { status: 400 });
  }

  const listType = await findListTypeById(id);

  if (!listType || listType.deletedAt) {
    return res.status(404).render("errors/common", { status: 404 });
  }

  const targetState: TargetState = listType.isHidden ? "visible" : "hidden";
  res.render(TEMPLATE, buildViewModel(t, { id, listType, targetState, confirmVisibility: undefined }));
};

const postHandler = async (req: Request, res: Response) => {
  const isWelsh = req.query.lng === "cy";
  const t = isWelsh ? cy : en;
  const id = parseId(req.query.id);
  const targetState = req.body.targetState;
  const confirmVisibility = req.body.confirmVisibility;

  if (id === null || !isTargetState(targetState)) {
    return res.status(400).render("errors/common", { status: 400 });
  }

  const listType = await findListTypeById(id);

  if (!listType || listType.deletedAt) {
    return res.status(404).render("errors/common", { status: 404 });
  }

  const viewModelInput = { id, listType, targetState, confirmVisibility };

  if (!validateVisibilityConfirmation(confirmVisibility)) {
    const message = targetState === "hidden" ? t.errorHideConfirmationRequired : t.errorShowConfirmationRequired;
    return res.render(TEMPLATE, buildViewModel(t, viewModelInput, message));
  }

  const lngQuery = isWelsh ? "lng=cy" : "";

  if (confirmVisibility === "no") {
    return res.redirect(`/manage-list-type?id=${id}${lngQuery ? `&${lngQuery}` : ""}`);
  }

  const result = await setListTypeVisibility(id, targetState === "hidden");

  if (result === "NOT_FOUND") {
    return res.status(404).render("errors/common", { status: 404 });
  }

  if (result === "ALREADY_IN_STATE") {
    const message = targetState === "hidden" ? t.errorAlreadyHidden : t.errorAlreadyVisible;
    return res.render(TEMPLATE, buildViewModel(t, viewModelInput, message));
  }

  req.auditMetadata = {
    shouldLog: true,
    action: targetState === "hidden" ? AuditLogAction.HIDE_LIST_TYPE : AuditLogAction.SHOW_LIST_TYPE,
    entityInfo: `Name: ${listType.name}, ID: ${id}`
  };

  res.redirect(`/list-type-visibility-success?state=${targetState}${lngQuery ? `&${lngQuery}` : ""}`);
};

function parseId(rawId: unknown): number | null {
  if (typeof rawId !== "string" || !/^\d+$/.test(rawId)) {
    return null;
  }
  return Number.parseInt(rawId, 10);
}

function isTargetState(value: unknown): value is TargetState {
  return TARGET_STATES.includes(value as never);
}

function buildViewModel(t: typeof en, input: ViewModelInput, errorMessage?: string) {
  const { id, listType, targetState, confirmVisibility } = input;
  const title = targetState === "hidden" ? t.hideTitle : t.showTitle;

  return {
    t,
    id,
    pageTitle: errorMessage ? `${t.errorPrefix} ${title}` : title,
    title,
    hint: targetState === "hidden" ? t.hideHint : t.showHint,
    listTypeName: listType.friendlyName || listType.name,
    isHidden: listType.isHidden,
    targetState,
    errors: errorMessage ? [{ text: errorMessage, href: "#confirmVisibility" }] : undefined,
    fieldError: errorMessage,
    data: { confirmVisibility }
  };
}

type TargetState = (typeof TARGET_STATES)[number];

interface ViewModelInput {
  id: number;
  listType: { name: string; friendlyName: string | null; isHidden: boolean };
  targetState: TargetState;
  confirmVisibility: unknown;
}

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
