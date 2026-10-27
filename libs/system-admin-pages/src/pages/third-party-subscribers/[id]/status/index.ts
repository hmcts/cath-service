import { requireRole, USER_ROLES } from "@hmcts/auth";
import { findThirdPartyUserById, isThirdPartyUserStatus, THIRD_PARTY_USER_STATUSES, updateThirdPartyUserStatus } from "@hmcts/third-party-user";
import type { Request, RequestHandler, Response } from "express";
import { AuditLogAction, logAction } from "../../../../audit-log/logger.js";
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

  await logStatusView(req, id);

  renderStatusPage(res, t, user.id, user.status, lngParam);
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

  const status: unknown = req.body?.status;

  if (!isThirdPartyUserStatus(status)) {
    return renderStatusPage(res, t, user.id, user.status, lngParam, [{ text: t.statusRequired, href: "#status" }]);
  }

  await updateThirdPartyUserStatus(id, status);

  req.auditMetadata = {
    shouldLog: true,
    action: AuditLogAction.UPDATE_THIRD_PARTY_SUBSCRIBER_STATUS,
    entityInfo: `Name: ${user.name}, ID: ${id}, Status: ${user.status} -> ${status}`
  };

  res.redirect(`/third-party-subscribers/${id}/status/success${lngParam}`);
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];

// logAction rethrows on failure; a failed view audit must not stop the admin seeing the page.
async function logStatusView(req: Request, id: string) {
  try {
    await logAction({
      userId: req.user?.id || "unknown",
      userEmail: req.user?.email || "unknown",
      userRole: req.user?.role || "SYSTEM_ADMIN",
      userProvenance: req.user?.provenance || "azure-ad",
      action: AuditLogAction.VIEW_THIRD_PARTY_SUBSCRIBER_STATUS,
      details: `ID: ${id}`
    });
  } catch (error) {
    console.error("Failed to audit third party subscriber status view:", error);
  }
}

function renderStatusPage(
  res: Response,
  t: typeof en | typeof cy,
  userId: string,
  selectedStatus: string,
  lngParam: string,
  errors?: Array<{ text: string; href?: string }>
) {
  res.render("third-party-subscribers/[id]/status/index", {
    ...t,
    en,
    cy,
    lngParam,
    userId,
    selectedStatus,
    statusItems: THIRD_PARTY_USER_STATUSES.map((value) => ({ value, text: t.statusLabels[value] })),
    errors
  });
}
