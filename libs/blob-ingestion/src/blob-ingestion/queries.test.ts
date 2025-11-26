import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IngestionLog } from "./model.js";
import { createIngestionLog, getIngestionLogsByDateRange, getRecentErrorLogs } from "./queries.js";

// Mock the prisma client
vi.mock("@hmcts/postgres", () => ({
  prisma: {
    ingestionLog: {
      create: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

describe("queries", async () => {
  const { prisma } = await import("@hmcts/postgres");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createIngestionLog", () => {
    it("should create an ingestion log", async () => {
      const log: IngestionLog = {
        id: "test-id",
        timestamp: new Date("2025-01-25T10:00:00Z"),
        sourceSystem: "XHIBIT",
        courtId: "123",
        status: "SUCCESS",
        artefactId: "artefact-123"
      };

      vi.mocked(prisma.ingestionLog.create).mockResolvedValue({
        id: log.id,
        timestamp: log.timestamp,
        sourceSystem: log.sourceSystem,
        courtId: log.courtId,
        status: log.status,
        errorMessage: null,
        artefactId: log.artefactId
      });

      await createIngestionLog(log);

      expect(prisma.ingestionLog.create).toHaveBeenCalledWith({
        data: {
          id: log.id,
          timestamp: log.timestamp,
          sourceSystem: log.sourceSystem,
          courtId: log.courtId,
          status: log.status,
          errorMessage: undefined,
          artefactId: log.artefactId
        }
      });
    });

    it("should create an error log with error message", async () => {
      const log: IngestionLog = {
        id: "test-id",
        timestamp: new Date("2025-01-25T10:00:00Z"),
        sourceSystem: "XHIBIT",
        courtId: "123",
        status: "VALIDATION_ERROR",
        errorMessage: "court_id is required"
      };

      vi.mocked(prisma.ingestionLog.create).mockResolvedValue({
        id: log.id,
        timestamp: log.timestamp,
        sourceSystem: log.sourceSystem,
        courtId: log.courtId,
        status: log.status,
        errorMessage: log.errorMessage,
        artefactId: null
      });

      await createIngestionLog(log);

      expect(prisma.ingestionLog.create).toHaveBeenCalledWith({
        data: {
          id: log.id,
          timestamp: log.timestamp,
          sourceSystem: log.sourceSystem,
          courtId: log.courtId,
          status: log.status,
          errorMessage: log.errorMessage,
          artefactId: undefined
        }
      });
    });
  });

  describe("getIngestionLogsByDateRange", () => {
    it("should retrieve logs within date range", async () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const endDate = new Date("2025-01-31T23:59:59Z");

      const mockLogs = [
        {
          id: "log-1",
          timestamp: new Date("2025-01-15T10:00:00Z"),
          sourceSystem: "XHIBIT",
          courtId: "123",
          status: "SUCCESS",
          errorMessage: null,
          artefactId: "artefact-1"
        },
        {
          id: "log-2",
          timestamp: new Date("2025-01-20T14:00:00Z"),
          sourceSystem: "LIBRA",
          courtId: "456",
          status: "VALIDATION_ERROR",
          errorMessage: "Invalid JSON",
          artefactId: null
        }
      ];

      vi.mocked(prisma.ingestionLog.findMany).mockResolvedValue(mockLogs);

      const result = await getIngestionLogsByDateRange(startDate, endDate);

      expect(prisma.ingestionLog.findMany).toHaveBeenCalledWith({
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

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("SUCCESS");
      expect(result[1].status).toBe("VALIDATION_ERROR");
    });
  });

  describe("getRecentErrorLogs", () => {
    it("should retrieve recent error logs with default limit", async () => {
      const mockLogs = [
        {
          id: "log-1",
          timestamp: new Date("2025-01-25T10:00:00Z"),
          sourceSystem: "XHIBIT",
          courtId: "123",
          status: "VALIDATION_ERROR",
          errorMessage: "Invalid JSON",
          artefactId: null
        }
      ];

      vi.mocked(prisma.ingestionLog.findMany).mockResolvedValue(mockLogs);

      const result = await getRecentErrorLogs();

      expect(prisma.ingestionLog.findMany).toHaveBeenCalledWith({
        where: {
          status: {
            in: ["VALIDATION_ERROR", "SYSTEM_ERROR"]
          }
        },
        orderBy: {
          timestamp: "desc"
        },
        take: 10
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("VALIDATION_ERROR");
    });

    it("should retrieve recent error logs with custom limit", async () => {
      const mockLogs = [
        {
          id: "log-1",
          timestamp: new Date("2025-01-25T10:00:00Z"),
          sourceSystem: "XHIBIT",
          courtId: "123",
          status: "SYSTEM_ERROR",
          errorMessage: "Database connection failed",
          artefactId: null
        }
      ];

      vi.mocked(prisma.ingestionLog.findMany).mockResolvedValue(mockLogs);

      await getRecentErrorLogs(5);

      expect(prisma.ingestionLog.findMany).toHaveBeenCalledWith({
        where: {
          status: {
            in: ["VALIDATION_ERROR", "SYSTEM_ERROR"]
          }
        },
        orderBy: {
          timestamp: "desc"
        },
        take: 5
      });
    });
  });
});
