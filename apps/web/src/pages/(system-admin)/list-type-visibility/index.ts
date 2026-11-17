import { requireRole, USER_ROLES } from "@hmcts/auth";
import { AuditLogAction, findListTypeById, setListTypeVisibility, validateVisibilityConfirmation } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const TEMPLATE = "list-type-visibility/index";
const TARGET_STATES = ["hidden", "visible"] as const;

const getHandler = async (req: Request, res: Response) => {
  const t = res.locals.locale === "cy" ? cy : en;
  const id = parseId(req.query.id);

  if (id === null) {
    return res.status(400).render("errors/common", { status: 400 });
  }

  const listType = await findListTypeById(id);

  if (!listType || listType.deletedAt) {
    return res.status(404).render("errors/common", { status: 404 });
  }

  res.render(TEMPLATE, buildViewModel(t, { id, listType, targetState: oppositeState(listType.isHidden), confirmVisibility: undefined }));
};

const postHandler = async (req: Request, res: Response) => {
  const t = res.locals.locale === "cy" ? cy : en;
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
    return res.render(TEMPLATE, buildViewModel(t, viewModelInput, { text: message, href: "#confirmVisibility" }));
  }

  if (confirmVisibility === "no") {
    return res.redirect(`/manage-list-type?id=${id}`);
  }

  const result = await setListTypeVisibility(id, targetState === "hidden");

  if (result === "NOT_FOUND") {
    return res.status(404).render("errors/common", { status: 404 });
  }

  // Another admin (or another tab) changed the state first. Re-render from the current state so the
  // page asks the question that still makes sense, and keep the error off the radios.
  if (result === "ALREADY_IN_STATE") {
    const message = targetState === "hidden" ? t.errorAlreadyHidden : t.errorAlreadyVisible;
    const currentListType = { ...listType, isHidden: targetState === "hidden" };
    const currentInput = { id, listType: currentListType, targetState: oppositeState(currentListType.isHidden), confirmVisibility: undefined };
    return res.render(TEMPLATE, buildViewModel(t, currentInput, { text: message }, false));
  }

  req.auditMetadata = {
    shouldLog: true,
    action: targetState === "hidden" ? AuditLogAction.HIDE_LIST_TYPE : AuditLogAction.SHOW_LIST_TYPE,
    entityInfo: `Name: ${listType.name}, ID: ${id}`
  };

  res.redirect(`/list-type-visibility-success?state=${targetState}`);
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

function oppositeState(isHidden: boolean): TargetState {
  return isHidden ? "visible" : "hidden";
}

function buildViewModel(t: typeof en, input: ViewModelInput, error?: PageError, isFieldError = true) {
  const { id, listType, targetState, confirmVisibility } = input;
  const title = targetState === "hidden" ? t.hideTitle : t.showTitle;

  return {
    t,
    id,
    pageTitle: error ? `${t.errorPrefix} ${title}` : title,
    title,
    hint: targetState === "hidden" ? t.hideHint : t.showHint,
    listTypeName: listType.friendlyName || listType.name,
    isHidden: listType.isHidden,
    targetState,
    errors: error ? [error] : undefined,
    fieldError: error && isFieldError ? error.text : undefined,
    data: { confirmVisibility }
  };
}

type TargetState = (typeof TARGET_STATES)[number];

interface PageError {
  text: string;
  href?: string;
}

interface ViewModelInput {
  id: number;
  listType: { name: string; friendlyName: string | null; isHidden: boolean };
  targetState: TargetState;
  confirmVisibility: unknown;
}

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
