import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import * as auditLogService from "../../audit-log/service.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const content = locale === "cy" ? cy : en;

  const id = req.query.id as string | undefined;

  if (!id) {
    return res.status(404).render("errors/404", {
      en,
      cy,
      message: content.entryNotFound
    });
  }

  const log = await auditLogService.getAuditLogById(id);

  if (!log) {
    return res.status(404).render("errors/404", {
      en,
      cy,
      message: content.entryNotFound
    });
  }

  res.render("audit-log-detail/index", {
    en,
    cy,
    title: content.detailTitle,
    log,
    userIdLabel: content.detailLabels.userId,
    emailLabel: content.detailLabels.email,
    roleLabel: content.detailLabels.role,
    provenanceLabel: content.detailLabels.provenance,
    actionLabel: content.detailLabels.action,
    detailsLabel: content.detailLabels.details,
    timestampLabel: content.detailLabels.timestamp,
    backToListText: content.backToList,
    backToTopText: content.backToTop
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
