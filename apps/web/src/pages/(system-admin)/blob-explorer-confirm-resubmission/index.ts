import { requireRole, USER_ROLES } from "@hmcts/auth";
import {
  type ArtefactMetadata,
  getArtefactMetadata,
  getArtefactType,
  parseResendAction,
  type ResendAction,
  type ResendResult,
  resendPublication
} from "@hmcts/publication";
import "@hmcts/web-core";
import { buildPublicationPageUrl, buildResendSuccessUrl, formatDateTime, recordBlobExplorerResend } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const TEMPLATE = "blob-explorer-confirm-resubmission/index";
const LOCATIONS_PATH = "/blob-explorer-locations";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getHandler = async (req: Request, res: Response) => {
  const params = parseParams(req);
  if (!params) {
    return res.redirect(LOCATIONS_PATH);
  }

  const t = getTranslations(params.locale);

  try {
    const page = await loadPublication(params.artefactId, params.locale);
    renderConfirmPage(res, params, page, page ? undefined : t.actions.resubmit.error);
  } catch (error) {
    console.error("Error loading confirmation:", error);
    renderConfirmPage(res, params, null, t.actions.resubmit.error);
  }
};

const postHandler = async (req: Request, res: Response) => {
  const params = parseParams(req);
  if (!params) {
    return res.redirect(LOCATIONS_PATH);
  }

  const { artefactId, action, locale } = params;

  // The resend writes its own audit entry, so the middleware must not add a generic one
  req.auditMetadata = { shouldLog: false };

  const result = await sendSafely(artefactId, action);
  await recordBlobExplorerResend(req.user, artefactId, action, result);

  if (result.status === "sent") {
    return res.redirect(buildResendSuccessUrl(action, locale));
  }

  const page = result.status === "not-found" ? null : await loadPublicationSafely(artefactId, locale);
  renderConfirmPage(res, params, page, getErrorMessage(params, result));
};

function getTranslations(locale: string) {
  return locale === "cy" ? cy : en;
}

function parseParams(req: Request): ConfirmParams | null {
  const artefactId = typeof req.query.artefactId === "string" ? req.query.artefactId : "";
  const action = parseResendAction(req.query.action);
  if (!UUID_REGEX.test(artefactId) || !action) {
    return null;
  }
  return { artefactId, action, locale: req.query.lng === "cy" ? "cy" : "en" };
}

async function loadPublication(artefactId: string, locale: string): Promise<PublicationPage | null> {
  const [metadata, artefactType] = await Promise.all([getArtefactMetadata(artefactId), getArtefactType(artefactId)]);
  if (!metadata || !artefactType) {
    return null;
  }
  return { metadata, cancelHref: buildPublicationPageUrl(artefactId, artefactType, locale) };
}

function renderConfirmPage(res: Response, { artefactId, action, locale }: ConfirmParams, page: PublicationPage | null, error?: string) {
  const t = getTranslations(locale);
  const { actions, ...content } = t;
  const actionContent = actions[action];

  res.render(TEMPLATE, {
    ...content,
    title: error ? `${t.errorTitlePrefix} ${actionContent.title}` : actionContent.title,
    header: actionContent.header,
    error,
    metadata: page?.metadata,
    cancelHref: page?.cancelHref ?? LOCATIONS_PATH,
    artefactId,
    formatDateTime,
    locale
  });
}

async function sendSafely(artefactId: string, action: ResendAction): Promise<ResendResult> {
  try {
    return await resendPublication(artefactId, action);
  } catch (error) {
    console.error("Error resending publication:", { artefactId, action, error: error instanceof Error ? error.message : String(error) });
    return { status: "failed", channels: {} };
  }
}

async function loadPublicationSafely(artefactId: string, locale: string): Promise<PublicationPage | null> {
  try {
    return await loadPublication(artefactId, locale);
  } catch (error) {
    console.error("Error reloading publication after resend:", error);
    return null;
  }
}

function getErrorMessage({ action, locale }: ConfirmParams, result: ResendResult): string {
  const { actions } = getTranslations(locale);
  if (result.status === "not-found") {
    return actions.resubmit.error;
  }
  const actionContent: { error: string; noRecipientsError?: string } = actions[action];
  if (result.status === "no-recipients" && actionContent.noRecipientsError) {
    return actionContent.noRecipientsError;
  }
  return actionContent.error;
}

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];

interface ConfirmParams {
  artefactId: string;
  action: ResendAction;
  locale: "en" | "cy";
}

interface PublicationPage {
  metadata: ArtefactMetadata;
  cancelHref: string;
}
