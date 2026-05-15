import { prisma } from "@hmcts/postgres-prisma";
import type { IngestionLog } from "./model.js";

const INGESTION_LOG_SELECT = {
  id: true,
  timestamp: true,
  sourceSystem: true,
  courtId: true,
  status: true,
  errorMessage: true,
  artefactId: true
} as const;

function mapToIngestionLog(log: {
  id: string;
  timestamp: Date;
  sourceSystem: string;
  courtId: string;
  status: string;
  errorMessage: string | null;
  artefactId: string | null;
}): IngestionLog {
  return {
    id: log.id,
    timestamp: log.timestamp,
    sourceSystem: log.sourceSystem,
    courtId: log.courtId,
    status: log.status as "SUCCESS" | "VALIDATION_ERROR" | "SYSTEM_ERROR",
    errorMessage: log.errorMessage || undefined,
    artefactId: log.artefactId || undefined
  };
}

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
    },
    select: INGESTION_LOG_SELECT
  });

  return logs.map(mapToIngestionLog);
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
    take: limit,
    select: INGESTION_LOG_SELECT
  });

  return logs.map(mapToIngestionLog);
}
