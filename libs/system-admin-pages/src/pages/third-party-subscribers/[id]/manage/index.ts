import { requireRole, USER_ROLES } from "@hmcts/auth";
import { type ConnectionTestResult, type FailureReason, findThirdPartyUserById, testThirdPartyConnection } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

export const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const lngParam = locale === "cy" ? "?lng=cy" : "";
  const id = req.params.id as string;

  const user = await findThirdPartyUserById(id);

  if (!user) {
    return res.redirect(`/third-party-subscribers${lngParam}`);
  }

  renderManagePage(res, user, t, lngParam);
};

export const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;
  const lngParam = locale === "cy" ? "?lng=cy" : "";
  const id = req.params.id as string;

  const user = await findThirdPartyUserById(id);

  if (!user) {
    return res.redirect(`/third-party-subscribers${lngParam}`);
  }

  const result = await testThirdPartyConnection(user.id);

  // Testing a connection is read-only and not audited; without this the audit middleware would log the render as a generic success
  req.auditMetadata = { shouldLog: false };
  renderManagePage(res, user, t, lngParam, toConnectionBanner(result, t));
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];

function renderManagePage(res: Response, user: Subscriber, t: Locale, lngParam: string, connectionResult?: ConnectionBanner) {
  res.render("third-party-subscribers/[id]/manage/index", {
    ...t,
    en,
    cy,
    lngParam,
    userId: user.id,
    name: user.name,
    createdAt: user.createdAt.toLocaleDateString("en-GB"),
    subscriptionCount: user.subscriptions.length,
    connectionResult
  });
}

function toConnectionBanner(result: ConnectionTestResult, t: Locale): ConnectionBanner {
  const { connectionTest } = t;
  switch (result.status) {
    case "success":
      return { isSuccess: true, title: connectionTest.succeededTitle, message: connectionTest.succeeded };
    case "missing-configuration":
      return { isSuccess: false, title: connectionTest.failedTitle, message: connectionTest.missingConfiguration };
    case "token-failure":
      return { isSuccess: false, title: connectionTest.failedTitle, message: connectionTest.tokenFailure, reason: describeFailureReason(result.reason, t) };
    case "destination-failure":
      return {
        isSuccess: false,
        title: connectionTest.failedTitle,
        message: connectionTest.destinationFailure,
        reason: describeFailureReason(result.reason, t)
      };
    case "error":
      return { isSuccess: false, title: connectionTest.failedTitle, message: connectionTest.error };
  }
}

function describeFailureReason(reason: FailureReason, t: Locale): string {
  const { reasons } = t.connectionTest;
  switch (reason.kind) {
    case "http-status":
      return `${reasons.httpStatus} ${reason.status}`;
    case "invalid-token-response":
      return reasons.invalidTokenResponse;
    case "invalid-url":
      return reasons.invalidUrl;
    case "connection-failed":
      return reasons.connectionFailed;
  }
}

type Subscriber = NonNullable<Awaited<ReturnType<typeof findThirdPartyUserById>>>;

type Locale = typeof en | typeof cy;

interface ConnectionBanner {
  isSuccess: boolean;
  title: string;
  message: string;
  reason?: string;
}
