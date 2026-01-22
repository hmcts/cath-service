import { requireRole, USER_ROLES } from "@hmcts/auth";
import type { Request, RequestHandler, Response } from "express";
import type { AuditLogFilters } from "../../audit-log/repository.js";
import * as auditLogService from "../../audit-log/service.js";
import { cy } from "./cy.js";
import { en } from "./en.js";

interface ValidationErrors {
  email?: { text: string; href: string };
  userId?: { text: string; href: string };
  date?: { text: string; href: string };
}

const getHandler = async (req: Request, res: Response) => {
  const locale = res.locals.locale || "en";
  const content = locale === "cy" ? cy : en;

  const errors: ValidationErrors = {};
  const filters: AuditLogFilters = {};

  // Parse query parameters
  const email = req.query.email as string | undefined;
  const userId = req.query.userId as string | undefined;
  const day = req.query.day as string | undefined;
  const month = req.query.month as string | undefined;
  const year = req.query.year as string | undefined;
  const actions = req.query.actions ? (Array.isArray(req.query.actions) ? (req.query.actions as string[]) : [req.query.actions as string]) : undefined;
  const page = Number.parseInt(req.query.page as string, 10) || 1;

  // Validate and apply email filter
  if (email) {
    if (!auditLogService.validateEmail(email)) {
      errors.email = { text: content.invalidEmail, href: "#email" };
    } else {
      filters.email = email;
    }
  }

  // Validate and apply user ID filter
  if (userId) {
    if (!auditLogService.validateUserId(userId)) {
      errors.userId = { text: content.invalidUserId, href: "#userId" };
    } else {
      filters.userId = userId;
    }
  }

  // Validate and apply date filter
  if (day || month || year) {
    if (!day || !month || !year) {
      errors.date = { text: content.invalidDate, href: "#day" };
    } else {
      const parsedDate = auditLogService.parseDate(day, month, year);
      if (!parsedDate) {
        errors.date = { text: content.invalidDate, href: "#day" };
      } else {
        filters.date = parsedDate;
      }
    }
  }

  // Apply actions filter
  if (actions) {
    filters.actions = actions;
  }

  // Get audit logs and available actions
  const result = await auditLogService.getAuditLogs(filters, page);
  const availableActions = await auditLogService.getAvailableActions();

  res.render("audit-log-list/index", {
    en,
    cy,
    title: content.listTitle,
    logs: result.logs,
    totalCount: result.totalCount,
    currentPage: result.currentPage,
    totalPages: result.totalPages,
    filters: {
      email: email || "",
      userId: userId || "",
      day: day || "",
      month: month || "",
      year: year || "",
      actions: actions || []
    },
    filters_heading: content.filters.heading,
    selectedFiltersText: content.filters.selectedFilters,
    clearFiltersText: content.filters.clearFilters,
    applyFiltersText: content.filters.applyFilters,
    emailLabel: content.filters.emailLabel,
    userIdLabel: content.filters.userIdLabel,
    userIdHint: content.filters.userIdHint,
    dateLabel: content.filters.dateLabel,
    dateHint: content.filters.dateHint,
    dayLabel: content.filters.dayLabel,
    monthLabel: content.filters.monthLabel,
    yearLabel: content.filters.yearLabel,
    actionsLabel: content.filters.actionsLabel,
    timestampHeader: content.tableHeaders.timestamp,
    emailHeader: content.tableHeaders.email,
    actionHeader: content.tableHeaders.action,
    viewHeader: content.tableHeaders.view,
    viewLinkText: content.viewLink,
    noResultsText: content.noResults,
    backToTopText: content.backToTop,
    availableActions,
    errors: Object.keys(errors).length > 0 ? errors : null,
    errorList: Object.keys(errors).length > 0 ? Object.values(errors) : null
  });
};

export const GET: RequestHandler[] = [requireRole([USER_ROLES.SYSTEM_ADMIN]), getHandler];
