import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repository from "./repository.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn()
    }
  }
}));

const { prisma } = await import("@hmcts/postgres");

describe("repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create an audit log entry", async () => {
      const mockData = {
        userId: "user-123",
        userEmail: "test@example.com",
        userRole: "admin",
        userProvenance: "local",
        action: "USER_LOGIN",
        details: "Login successful"
      };

      const mockResult = {
        id: "log-123",
        timestamp: new Date(),
        ...mockData
      };

      vi.mocked(prisma.auditLog.create).mockResolvedValue(mockResult);

      const result = await repository.create(mockData);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: mockData
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("findAll", () => {
    it("should find all audit logs with no filters", async () => {
      const mockLogs = [
        {
          id: "log-1",
          userId: "user-1",
          userEmail: "user1@example.com",
          userRole: "admin",
          userProvenance: "local",
          action: "USER_LOGIN",
          details: null,
          timestamp: new Date()
        }
      ];

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      const result = await repository.findAll();

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: "desc" },
        skip: 0,
        take: 50
      });
      expect(result).toEqual(mockLogs);
    });

    it("should filter by email with case-insensitive search", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      await repository.findAll({ email: "test@example.com" });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userEmail: { contains: "test@example.com", mode: "insensitive" }
        },
        orderBy: { timestamp: "desc" },
        skip: 0,
        take: 50
      });
    });

    it("should filter by userId", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      await repository.findAll({ userId: "user-123" });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-123"
        },
        orderBy: { timestamp: "desc" },
        skip: 0,
        take: 50
      });
    });

    it("should filter by date with start and end of day", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      const testDate = new Date("2026-01-15T10:30:00.000Z");

      await repository.findAll({ date: testDate });

      const calls = vi.mocked(prisma.auditLog.findMany).mock.calls[0];
      expect(calls).toBeDefined();
      expect(calls![0]).toBeDefined();
      const where = calls![0]!.where as Record<string, unknown>;
      const timestamp = where.timestamp as { gte: Date; lte: Date };

      expect(timestamp.gte.getHours()).toBe(0);
      expect(timestamp.gte.getMinutes()).toBe(0);
      expect(timestamp.gte.getSeconds()).toBe(0);
      expect(timestamp.gte.getMilliseconds()).toBe(0);

      expect(timestamp.lte.getHours()).toBe(23);
      expect(timestamp.lte.getMinutes()).toBe(59);
      expect(timestamp.lte.getSeconds()).toBe(59);
      expect(timestamp.lte.getMilliseconds()).toBe(999);
    });

    it("should filter by actions", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      await repository.findAll({ actions: ["USER_LOGIN", "USER_LOGOUT"] });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: { in: ["USER_LOGIN", "USER_LOGOUT"] }
        },
        orderBy: { timestamp: "desc" },
        skip: 0,
        take: 50
      });
    });

    it("should ignore empty actions array", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      await repository.findAll({ actions: [] });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: "desc" },
        skip: 0,
        take: 50
      });
    });

    it("should apply multiple filters together", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      const testDate = new Date("2026-01-15");

      await repository.findAll({
        email: "test@example.com",
        userId: "user-123",
        date: testDate,
        actions: ["USER_LOGIN"]
      });

      const calls = vi.mocked(prisma.auditLog.findMany).mock.calls[0];
      expect(calls).toBeDefined();
      expect(calls![0]).toBeDefined();
      const where = calls![0]!.where as Record<string, unknown>;

      expect(where.userEmail).toEqual({
        contains: "test@example.com",
        mode: "insensitive"
      });
      expect(where.userId).toBe("user-123");
      expect(where.action).toEqual({ in: ["USER_LOGIN"] });
      expect(where.timestamp).toBeDefined();
    });

    it("should handle pagination correctly", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      await repository.findAll({}, 3, 20);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: "desc" },
        skip: 40,
        take: 20
      });
    });
  });

  describe("findById", () => {
    it("should find an audit log by id", async () => {
      const mockLog = {
        id: "log-123",
        userId: "user-1",
        userEmail: "user1@example.com",
        userRole: "admin",
        userProvenance: "local",
        action: "USER_LOGIN",
        details: null,
        timestamp: new Date()
      };

      vi.mocked(prisma.auditLog.findUnique).mockResolvedValue(mockLog);

      const result = await repository.findById("log-123");

      expect(prisma.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id: "log-123" }
      });
      expect(result).toEqual(mockLog);
    });

    it("should return null if audit log not found", async () => {
      vi.mocked(prisma.auditLog.findUnique).mockResolvedValue(null);

      const result = await repository.findById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("countByFilters", () => {
    it("should count all logs with no filters", async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(100);

      const result = await repository.countByFilters();

      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: {}
      });
      expect(result).toBe(100);
    });

    it("should count with email filter", async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(5);

      await repository.countByFilters({ email: "test@example.com" });

      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: {
          userEmail: { contains: "test@example.com", mode: "insensitive" }
        }
      });
    });

    it("should count with userId filter", async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(10);

      await repository.countByFilters({ userId: "user-123" });

      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: {
          userId: "user-123"
        }
      });
    });

    it("should count with date filter", async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(3);

      const testDate = new Date("2026-01-15");

      await repository.countByFilters({ date: testDate });

      const calls = vi.mocked(prisma.auditLog.count).mock.calls[0];
      expect(calls).toBeDefined();
      expect(calls![0]).toBeDefined();
      const where = calls![0]!.where as Record<string, unknown>;
      const timestamp = where.timestamp as { gte: Date; lte: Date };

      expect(timestamp.gte.getHours()).toBe(0);
      expect(timestamp.lte.getHours()).toBe(23);
    });

    it("should count with actions filter", async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(8);

      await repository.countByFilters({
        actions: ["USER_LOGIN", "USER_LOGOUT"]
      });

      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: {
          action: { in: ["USER_LOGIN", "USER_LOGOUT"] }
        }
      });
    });

    it("should ignore empty actions array", async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(100);

      await repository.countByFilters({ actions: [] });

      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: {}
      });
    });
  });

  describe("findUniqueActions", () => {
    it("should return unique actions sorted alphabetically", async () => {
      const mockResult = [{ action: "USER_LOGIN" }, { action: "USER_LOGOUT" }, { action: "USER_UPDATE" }] as any;

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockResult);

      const result = await repository.findUniqueActions();

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        select: { action: true },
        distinct: ["action"],
        orderBy: { action: "asc" }
      });
      expect(result).toEqual(["USER_LOGIN", "USER_LOGOUT", "USER_UPDATE"]);
    });

    it("should return empty array when no actions exist", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as any);

      const result = await repository.findUniqueActions();

      expect(result).toEqual([]);
    });
  });
});
