import type { AuditLog } from "@hmcts/postgres";
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

export async function getAuditLogs(filters: AuditLogFilters = {}, page = 1, pageSize = 20): Promise<PaginatedAuditLogs> {
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
  // Early length check to prevent ReDoS attacks
  if (email.length > 254 || email.length === 0) {
    return false;
  }

  // Simple email validation regex with bounded quantifiers for security
  // Pattern: local-part @ domain . tld
  // Uses negated character classes which are safe from catastrophic backtracking
  // Bounded to max 254 chars total (checked above) to prevent ReDoS
  const emailRegex = /^[^\s@]{1,253}@[^\s@]{1,253}\.[^\s@]{1,63}$/;
  return emailRegex.test(email);
}

export function validateUserId(userId: string): boolean {
  // Early length check for security
  if (userId.length > 50) {
    return false;
  }

  // Alphanumeric and dash validation with bounded quantifier
  const userIdRegex = /^[a-zA-Z0-9-]{1,50}$/;
  return userIdRegex.test(userId);
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
