import { beforeEach, describe, expect, it, vi } from "vitest";
import * as logger from "./logger.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    auditLog: {
      create: vi.fn()
    }
  }
}));

const { prisma } = await import("@hmcts/postgres");

describe("logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("logAction", () => {
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

      await logger.logAction(mockData);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: mockData
      });
    });

    it("should create an audit log entry without details", async () => {
      const mockData = {
        userId: "user-123",
        userEmail: "test@example.com",
        userRole: "admin",
        userProvenance: "local",
        action: "USER_LOGIN"
      };

      const mockResult = {
        id: "log-123",
        timestamp: new Date(),
        ...mockData,
        details: null
      };

      vi.mocked(prisma.auditLog.create).mockResolvedValue(mockResult);

      await logger.logAction(mockData);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: mockData
      });
    });

    it("should log error and rethrow when create fails", async () => {
      const mockData = {
        userId: "user-123",
        userEmail: "test@example.com",
        userRole: "admin",
        userProvenance: "local",
        action: "USER_LOGIN"
      };

      const mockError = new Error("Database connection failed");
      vi.mocked(prisma.auditLog.create).mockRejectedValue(mockError);

      await expect(logger.logAction(mockData)).rejects.toThrow("Database connection failed");

      expect(console.error).toHaveBeenCalledWith("Failed to create audit log entry:", mockError);
    });
  });
});
