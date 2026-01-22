import type { AuditLog } from "@prisma/client";
import type { AuditLogFilters } from "./repository.js";
import * as repository from "./repository.js";

export interface FormattedAuditLog {
  id: string;
  timestamp: string;
  action: string;
  userEmail: string;
  userId: string;
  userRole: string;
  userProvenance: string;
  details?: string;
}

export interface PaginatedAuditLogs {
  logs: FormattedAuditLog[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

function formatTimestamp(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatActionToTitleCase(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatAuditLog(log: AuditLog): FormattedAuditLog {
  return {
    id: log.id,
    timestamp: formatTimestamp(log.timestamp),
    action: formatActionToTitleCase(log.action),
    userEmail: log.userEmail,
    userId: log.userId,
    userRole: log.userRole,
    userProvenance: log.userProvenance,
    details: log.details || undefined
  };
}

export async function getAuditLogs(filters: AuditLogFilters = {}, page = 1, pageSize = 50): Promise<PaginatedAuditLogs> {
  const logs = await repository.findAll(filters, page, pageSize);
  const totalCount = await repository.countByFilters(filters);
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    logs: logs.map(formatAuditLog),
    totalCount,
    currentPage: page,
    pageSize,
    totalPages
  };
}

export async function getAuditLogById(id: string): Promise<FormattedAuditLog | null> {
  const log = await repository.findById(id);
  return log ? formatAuditLog(log) : null;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validateUserId(userId: string): boolean {
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  return alphanumericRegex.test(userId) && userId.length <= 50;
}

export function parseDate(day: string, month: string, year: string): Date | null {
  const dayNum = Number.parseInt(day, 10);
  const monthNum = Number.parseInt(month, 10);
  const yearNum = Number.parseInt(year, 10);

  if (Number.isNaN(dayNum) || Number.isNaN(monthNum) || Number.isNaN(yearNum)) {
    return null;
  }

  const date = new Date(yearNum, monthNum - 1, dayNum);

  if (date.getDate() !== dayNum || date.getMonth() !== monthNum - 1 || date.getFullYear() !== yearNum) {
    return null;
  }

  return date;
}

export async function getAvailableActions(): Promise<Array<{ value: string; text: string }>> {
  const actions = await repository.findUniqueActions();
  return actions.map((action) => ({
    value: action,
    text: formatActionToTitleCase(action)
  }));
}
