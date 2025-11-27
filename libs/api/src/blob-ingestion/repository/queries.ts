import { prisma } from "@hmcts/postgres";
import type { IngestionLog } from "./model.js";

export async function createIngestionLog(log: IngestionLog): Promise<void> {
  await prisma.ingestionLog.create({
    data: {
      id: log.id,
      timestamp: log.timestamp,
      sourceSystem: log.sourceSystem,
      courtId: log.courtId,
      status: log.status,
      errorMessage: log.errorMessage,
      artefactId: log.artefactId
    }
  });
}

export async function getIngestionLogsByDateRange(startDate: Date, endDate: Date): Promise<IngestionLog[]> {
  const logs = await prisma.ingestionLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      timestamp: "desc"
    }
  });

  return logs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp,
    sourceSystem: log.sourceSystem,
    courtId: log.courtId,
    status: log.status as "SUCCESS" | "VALIDATION_ERROR" | "SYSTEM_ERROR",
    errorMessage: log.errorMessage || undefined,
    artefactId: log.artefactId || undefined
  }));
}

export async function getRecentErrorLogs(limit = 10): Promise<IngestionLog[]> {
  const logs = await prisma.ingestionLog.findMany({
    where: {
      status: {
        in: ["VALIDATION_ERROR", "SYSTEM_ERROR"]
      }
    },
    orderBy: {
      timestamp: "desc"
    },
    take: limit
  });

  return logs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp,
    sourceSystem: log.sourceSystem,
    courtId: log.courtId,
    status: log.status as "SUCCESS" | "VALIDATION_ERROR" | "SYSTEM_ERROR",
    errorMessage: log.errorMessage || undefined,
    artefactId: log.artefactId || undefined
  }));
}
