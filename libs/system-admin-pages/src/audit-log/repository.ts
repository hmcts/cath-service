import { prisma } from "@hmcts/postgres";
import type { AuditLog } from "@prisma/client";

export interface AuditLogFilters {
  email?: string;
  userId?: string;
  date?: Date;
  actions?: string[];
}

export interface AuditLogCreateData {
  userId: string;
  userEmail: string;
  userRole: string;
  userProvenance: string;
  action: string;
  details?: string;
}

export async function create(data: AuditLogCreateData): Promise<AuditLog> {
  return await prisma.auditLog.create({
    data: {
      userId: data.userId,
      userEmail: data.userEmail,
      userRole: data.userRole,
      userProvenance: data.userProvenance,
      action: data.action,
      details: data.details
    }
  });
}

export async function findAll(filters: AuditLogFilters = {}, page = 1, pageSize = 50): Promise<AuditLog[]> {
  const where: Record<string, unknown> = {};

  if (filters.email) {
    where.userEmail = { contains: filters.email, mode: "insensitive" };
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.date) {
    const startOfDay = new Date(filters.date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(filters.date);
    endOfDay.setHours(23, 59, 59, 999);

    where.timestamp = {
      gte: startOfDay,
      lte: endOfDay
    };
  }

  if (filters.actions && filters.actions.length > 0) {
    where.action = { in: filters.actions };
  }

  const skip = (page - 1) * pageSize;

  return await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    skip,
    take: pageSize
  });
}

export async function findById(id: string): Promise<AuditLog | null> {
  return await prisma.auditLog.findUnique({
    where: { id }
  });
}

export async function countByFilters(filters: AuditLogFilters = {}): Promise<number> {
  const where: Record<string, unknown> = {};

  if (filters.email) {
    where.userEmail = { contains: filters.email, mode: "insensitive" };
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.date) {
    const startOfDay = new Date(filters.date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(filters.date);
    endOfDay.setHours(23, 59, 59, 999);

    where.timestamp = {
      gte: startOfDay,
      lte: endOfDay
    };
  }

  if (filters.actions && filters.actions.length > 0) {
    where.action = { in: filters.actions };
  }

  return await prisma.auditLog.count({ where });
}

export async function findUniqueActions(): Promise<string[]> {
  const result = await prisma.auditLog.findMany({
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" }
  });

  return result.map((r) => r.action);
}
