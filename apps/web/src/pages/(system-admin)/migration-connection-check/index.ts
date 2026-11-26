import { requireRole, USER_ROLES } from "@hmcts/auth";
import {
  checkPipConnection,
  getPipApiHostPatterns,
  isAllowedPipHost,
  isPipConnectionCheckConfigured,
  type PipConnectionResult,
  type TokenFailureReason,
  type UrlValidationError,
  validatePipUrl
} from "@hmcts/pip-api-client";
import { AuditLogAction } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const TEMPLATE = "migration-connection-check/index";

const ERROR_KEY_BY_VALIDATION_ERROR: Record<UrlValidationError, keyof Locale["errorMessages"]> = {
  required: "required",
  "too-long": "tooLong",
  "invalid-format": "invalidFormat",
  "host-not-allowed": "hostNotAllowed"
};

const getHandler = async (_req: Request, res: Response) => {
  renderPage(res, { url: "" });
};

const postHandler = async (req: Request, res: Response) => {
  const t = getLocale(res);
  const input = typeof req.body?.url === "string" ? req.body.url : "";

  if (!isConfigured()) {
    req.auditMetadata = { shouldLog: false };
    return renderPage(res, { url: input });
  }

  const validation = validatePipUrl(input, isAllowedPipHost);
  if (validation.kind === "invalid") {
    req.auditMetadata = { action: AuditLogAction.PIP_CONNECTION_CHECK };
    return renderPage(res, { url: input, errors: [{ text: t.errorMessages[ERROR_KEY_BY_VALIDATION_ERROR[validation.error]], href: "#url" }] });
  }

  const result = await checkPipConnection(validation.url);
  const outcome = toOutcome(result);

  req.auditMetadata = {
    shouldLog: true,
    action: AuditLogAction.PIP_CONNECTION_CHECK,
    entityInfo: describeForAudit(validation.url, outcome, result)
  };

  renderPage(res, { url: input, connectionResult: toResultView(validation.url, outcome, result, t) });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];

function renderPage(res: Response, { url, errors, connectionResult }: PageState) {
  const t = getLocale(res);
  const lngParam = t === cy ? "?lng=cy" : "";

  res.render(TEMPLATE, {
    ...t,
    en,
    cy,
    lngParam,
    isConfigured: isConfigured(),
    allowedHosts: getPipApiHostPatterns(),
    data: { url },
    errors,
    connectionResult
  });
}

function getLocale(res: Response): Locale {
  return res.locals.locale === "cy" ? cy : en;
}

function isConfigured(): boolean {
  return getPipApiHostPatterns().length > 0 && isPipConnectionCheckConfigured();
}

function toOutcome(result: PipConnectionResult): Outcome {
  switch (result.kind) {
    case "not-configured":
      return "notConfigured";
    case "token-failure":
      return "tokenFailure";
    case "network-error":
      return "unreachable";
    case "timeout":
      return "timeout";
    case "response":
      return outcomeForStatus(result.status);
  }
}

function outcomeForStatus(status: number): Outcome {
  if (status >= 200 && status < 300) return "connected";
  if (status >= 300 && status < 400) return "redirected";
  if (status === 401) return "unauthorised";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 429) return "rateLimited";
  if (status >= 500) return "serverError";
  return "unexpectedStatus";
}

function toResultView(url: URL, outcome: Outcome, result: PipConnectionResult, t: Locale): ResultView {
  const isSuccess = outcome === "connected";
  const rows: SummaryRow[] = [
    { key: t.result.urlTested, value: url.toString() },
    { key: t.result.outcome, value: t.outcomes[outcome] }
  ];

  if (result.kind === "response") {
    rows.push({ key: t.result.httpStatus, value: String(result.status) });
    if (result.bodyPreview) {
      rows.push({ key: t.result.responsePreview, value: result.bodyPreview });
    }
  }
  if ("durationMs" in result) {
    rows.push({ key: t.result.responseTime, value: `${result.durationMs} ${t.result.milliseconds}` });
  }
  if (result.kind === "token-failure") {
    rows.push({ key: t.result.reason, value: describeTokenFailure(result.reason, t) });
  }
  if (result.kind === "network-error" && result.code) {
    rows.push({ key: t.result.errorCode, value: result.code });
  }
  if (result.kind !== "not-configured") {
    rows.push({ key: t.result.tokenObtained, value: result.kind === "token-failure" ? t.result.no : t.result.yes });
  }

  return { isSuccess, title: isSuccess ? t.result.succeededTitle : t.result.failedTitle, rows };
}

function describeTokenFailure(reason: TokenFailureReason, t: Locale): string {
  switch (reason.kind) {
    case "http-status":
      return `${t.tokenReasons.httpStatus} ${reason.status}`;
    case "invalid-token-response":
      return t.tokenReasons.invalidTokenResponse;
    case "timeout":
      return t.tokenReasons.timeout;
    case "network-error":
    case "invalid-url":
      return t.tokenReasons.connectionFailed;
  }
}

function describeForAudit(url: URL, outcome: Outcome, result: PipConnectionResult): string {
  const status = result.kind === "response" ? `; Status: ${result.status}` : "";
  return `Host: ${url.hostname}; Path: ${url.pathname}; Result: ${outcome}${status}`;
}

type Locale = typeof en | typeof cy;

type Outcome = keyof Locale["outcomes"];

interface SummaryRow {
  key: string;
  value: string;
}

interface ResultView {
  isSuccess: boolean;
  title: string;
  rows: SummaryRow[];
}

interface PageState {
  url: string;
  errors?: { text: string; href: string }[];
  connectionResult?: ResultView;
}
