import { requireRole, USER_ROLES } from "@hmcts/auth";
import { AuditLogAction, buildMiReport, validateMiReportSelection } from "@hmcts/system-admin-pages";
import type { Request, RequestHandler, Response } from "express";
import { cy } from "./cy.js";
import { en } from "./en.js";

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const getHandler = async (_req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  res.render("mi-report/index", buildViewModel(t));
};

const postHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const t = locale === "cy" ? cy : en;

  const result = validateMiReportSelection(req.body, { periodError: t.periodError, reportTypeError: t.reportTypeError });

  if (!result.isValid) {
    return res.render("mi-report/index", {
      ...buildViewModel(t, req.body),
      errors: result.errors,
      periodError: result.errors.some((error) => error.href === "#period") ? { text: t.periodError } : undefined,
      reportTypeError: result.errors.some((error) => error.href === "#reportType") ? { text: t.reportTypeError } : undefined
    });
  }

  const { buffer, filename } = await buildMiReport(result.reportType, result.period);

  req.auditMetadata = {
    action: AuditLogAction.DOWNLOAD_MI_REPORT,
    entityInfo: `Report: ${result.reportType}, Period: ${result.period}`
  };

  res.setHeader("Content-Type", XLSX_CONTENT_TYPE);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
};

function buildViewModel(t: typeof en | typeof cy, data?: Record<string, unknown>) {
  return {
    en,
    cy,
    t,
    ...t,
    periodItems: t.periodOptions.map((option) => ({
      value: option.value,
      text: option.text,
      selected: data?.period === option.value
    })),
    reportTypeItems: t.reportTypeOptions.map((option) => ({
      value: option.value,
      text: option.text,
      selected: data?.reportType === option.value
    })),
    periodError: undefined,
    reportTypeError: undefined,
    errors: undefined
  };
}

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
export const POST: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), postHandler];
